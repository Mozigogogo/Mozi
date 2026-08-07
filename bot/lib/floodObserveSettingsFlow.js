'use strict';

/**
 * /config → 防刷屏 + 新成员观察期配置
 * 写：POST /tg/stats/group/save
 * 读：优先 GET /tg/stats/group/get，失败再退回 list
 */

const { Markup } = require('telegraf');
const {
  postTgStatsGroupSave,
  getTgStatsGroupGet,
  parseFloodObserveFields,
} = require('./apis');
const { ensureTgUserToken } = require('./tgUserTokenCache');
const { buildTelegramLoginOptsFromCtx } = require('./datainfoPoints');
const { escapeHtml } = require('./telegramHtml');
const { fetchOwnerGroupsFromApi } = require('./predictScheduleFlow');
const { invalidateGroupModerationConfigCache } = require('./joinVerifyConfig');
const { withTypingWhileAwaiting } = require('./telegramTypingPulse');
const { dropUnreachableDuplicateTitles } = require('./tgGroupStats');

const WINDOW_PRESETS = [5, 10, 30, 60];
const MAX_MSG_PRESETS = [3, 5, 8, 10];
const MUTE_PRESETS = [60, 300, 600, 1800];
const OBSERVE_HOUR_PRESETS = [12, 24, 48, 72];

function foSettingsLog(event, payload) {
  const on = !/^0|false|no$/i.test(String(process.env.FLOOD_OBSERVE_SETTINGS_LOG ?? '1').trim());
  if (!on) return;
  let body = '';
  try {
    body = payload === undefined ? '' : ` ${JSON.stringify(payload)}`;
  } catch {
    body = ` ${String(payload)}`;
  }
  console.log(`[FLOOD_OBSERVE_SETTINGS] ${new Date().toISOString()} ${event}${body}`);
}

function isSaveBusinessOk(saveRes) {
  if (!saveRes?.ok) return false;
  const json = saveRes.json;
  if (!json || typeof json !== 'object') return true;
  if (json.success === false || json.success === 0) return false;
  if (json.success === true || json.success === 1) return true;
  if (json.code == null) return true;
  const code = Number(json.code);
  return code === 0 || code === 200;
}

function normalizeFloodObserveGroups(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const groupId = Number(item.groupId);
      if (!Number.isFinite(groupId)) return null;
      if (item.status != null && Number(item.status) === 0) return null;
      const fo = parseFloodObserveFields(item);
      return {
        groupId,
        groupTitle: String(item.groupTitle || item.title || '').trim() || `群 ${groupId}`,
        status: item.status == null ? null : Number(item.status),
        updatedAtMs: item.updatedAtMs ?? null,
        createdAtMs: item.createdAtMs ?? null,
        ...fo,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) => String(a.groupTitle).localeCompare(String(b.groupTitle)) || a.groupId - b.groupId,
    );
}

function displayTitleForGroup(g, groups) {
  const base = String(g.groupTitle || g.groupId);
  const sameNameCount = (groups || []).filter(
    (x) => String(x.groupTitle || '') === String(g.groupTitle || ''),
  ).length;
  if (sameNameCount <= 1) return base.slice(0, 22);
  const idHint = String(Math.abs(Number(g.groupId))).slice(-6);
  return `${base.slice(0, 14)}·${idHint}`;
}

function floodActionLabel(action, texts) {
  if (action === 'kick') return texts.floodSettingsActionKick || 'kick';
  return texts.floodSettingsActionDeleteMute || 'delete_mute';
}

function buildFloodObserveListText(texts, groups) {
  if (!groups.length) {
    return `${texts.floodObserveSettingsIntro}\n\n${texts.predictScheduleEmpty}`;
  }
  const lines = groups.map((g) =>
    texts.floodObserveSettingsGroupLine(
      escapeHtml(displayTitleForGroup(g, groups)),
      g.floodEnabled === 1,
      g.observeEnabled === 1,
    ),
  );
  return `${texts.floodObserveSettingsIntro}\n\n${lines.join('\n')}`;
}

function buildFloodObserveListKeyboard(texts, groups) {
  const rows = groups.map((g) => {
    const label = displayTitleForGroup(g, groups);
    return [Markup.button.callback(label.slice(0, 40), `fo:g:${g.groupId}`)];
  });
  rows.push([
    Markup.button.callback(texts.predictScheduleRefreshBtn, 'fo:r'),
    Markup.button.callback(texts.groupSettingsBackBtn, 'gs:home'),
  ]);
  return Markup.inlineKeyboard(rows);
}

function buildFloodObserveDetailText(texts, g) {
  const floodOn =
    g.floodEnabled === 1 ? texts.joinVerifySettingsOn : texts.joinVerifySettingsOff;
  const observeOn =
    g.observeEnabled === 1 ? texts.joinVerifySettingsOn : texts.joinVerifySettingsOff;
  return texts.floodObserveSettingsDetailHtml(
    escapeHtml(String(g.groupTitle || g.groupId)),
    floodOn,
    g.floodWindowSec,
    g.floodMaxMessages,
    floodActionLabel(g.floodAction, texts),
    g.floodMuteDurationSec,
    observeOn,
    g.observeDurationHours,
  );
}

function markSelected(label, selected) {
  return selected ? `✓ ${label}` : label;
}

function buildFloodObserveDetailKeyboard(texts, g) {
  const gid = g.groupId;
  const label = (t) => Markup.button.callback(`— ${t} —`, 'fo:noop');

  return Markup.inlineKeyboard([
    [label(texts.floodSettingsSectionSwitch)],
    [
      Markup.button.callback(texts.floodSettingsEnableBtn, `fo:fe:${gid}:1`),
      Markup.button.callback(texts.floodSettingsDisableBtn, `fo:fe:${gid}:0`),
    ],
    [label(texts.floodSettingsSectionWindow)],
    WINDOW_PRESETS.map((sec) =>
      Markup.button.callback(
        markSelected(`${sec}s`, g.floodWindowSec === sec),
        `fo:fw:${gid}:${sec}`,
      ),
    ),
    [label(texts.floodSettingsSectionMax)],
    MAX_MSG_PRESETS.map((n) =>
      Markup.button.callback(
        markSelected(String(n), g.floodMaxMessages === n),
        `fo:fm:${gid}:${n}`,
      ),
    ),
    [label(texts.floodSettingsSectionAction)],
    [
      Markup.button.callback(
        markSelected(texts.floodSettingsActionDeleteMuteBtn, g.floodAction !== 'kick'),
        `fo:fa:${gid}:delete_mute`,
      ),
      Markup.button.callback(
        markSelected(texts.floodSettingsActionKickBtn, g.floodAction === 'kick'),
        `fo:fa:${gid}:kick`,
      ),
    ],
    [label(texts.floodSettingsSectionMute)],
    MUTE_PRESETS.map((sec) =>
      Markup.button.callback(
        markSelected(
          sec >= 60 ? `${Math.round(sec / 60)}m` : `${sec}s`,
          g.floodMuteDurationSec === sec,
        ),
        `fo:fmd:${gid}:${sec}`,
      ),
    ),
    [label(texts.observeSettingsSectionSwitch)],
    [
      Markup.button.callback(texts.observeSettingsEnableBtn, `fo:oe:${gid}:1`),
      Markup.button.callback(texts.observeSettingsDisableBtn, `fo:oe:${gid}:0`),
    ],
    [label(texts.observeSettingsSectionDuration)],
    OBSERVE_HOUR_PRESETS.map((h) =>
      Markup.button.callback(
        markSelected(`${h}h`, g.observeDurationHours === h),
        `fo:od:${gid}:${h}`,
      ),
    ),
    [
      Markup.button.callback(texts.joinVerifySettingsBackListBtn, 'fo:list'),
      Markup.button.callback(texts.groupSettingsBackBtn, 'gs:home'),
    ],
  ]);
}

async function resolveOwnerAuth(ctx, config) {
  const uid = ctx.from?.id;
  if (uid == null) return { ok: false, auth: '', authMissing: true };
  const loginOpts = buildTelegramLoginOptsFromCtx(ctx);
  const token = await ensureTgUserToken(config, String(uid), loginOpts).catch(() => '');
  const auth = token || config.MOZI_DETAIL_AUTH || '';
  if (!auth) return { ok: false, auth: '', authMissing: true };
  return { ok: true, auth, authMissing: false };
}

async function saveFloodObservePatch(ctx, config, auth, patch) {
  foSettingsLog('save.request', { groupId: patch.groupId, patch });
  const saveRes = await postTgStatsGroupSave({
    apiBaseUrl: config.API_BASE_URL,
    auth,
    appUrl: config.APP_URL,
    path: config.TG_GROUP_SAVE_PATH,
    groups: [patch],
  });
  foSettingsLog('save.response', {
    groupId: patch.groupId,
    httpOk: saveRes.ok,
    httpStatus: saveRes.status,
    businessOk: isSaveBusinessOk(saveRes),
    apiCode: saveRes.json?.code ?? null,
  });
  if (saveRes.ok && patch.groupId != null) {
    invalidateGroupModerationConfigCache(patch.groupId);
  }
  return saveRes;
}

async function loadFloodObserveGroup(ctx, config, groupId) {
  const authRes = await resolveOwnerAuth(ctx, config);
  const auth = authRes.auth || config.MOZI_DETAIL_AUTH || '';

  if (auth) {
    try {
      const getRes = await getTgStatsGroupGet({
        apiBaseUrl: config.API_BASE_URL,
        appUrl: config.APP_URL,
        auth,
        groupId,
        path: config.TG_GROUP_GET_PATH || 'tg/stats/group/get',
      });
      if (getRes.ok && getRes.group) {
        const fo = parseFloodObserveFields(getRes.group);
        return {
          groupId: Number(getRes.group.groupId ?? groupId),
          groupTitle:
            String(getRes.group.groupTitle || getRes.group.title || '').trim() ||
            `群 ${groupId}`,
          ...fo,
          _source: 'get',
        };
      }
    } catch (err) {
      foSettingsLog('load.get_error', {
        groupId: String(groupId),
        message: err?.message || String(err),
      });
    }
  }

  const remote = await fetchOwnerGroupsFromApi(ctx, config);
  const groups = normalizeFloodObserveGroups(remote.items || []);
  const g = groups.find((x) => String(x.groupId) === String(groupId)) || null;
  return g ? { ...g, _source: 'list' } : null;
}

async function renderFloodObserveListPanel(ctx, config, getTexts, opts = {}) {
  const uid = ctx.from?.id;
  if (uid == null) return;
  const texts = getTexts(ctx.from?.language_code || 'en');

  let loadingMsg = null;
  if (!opts.skipLoading && !opts.edit) {
    loadingMsg = await ctx.reply(texts.predictScheduleLoading, { parse_mode: 'HTML' }).catch(() => null);
  }

  const remote = await fetchOwnerGroupsFromApi(ctx, config);
  if (remote.authMissing) {
    if (loadingMsg?.message_id) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
    }
    await ctx.reply(texts.predictScheduleNeedLogin, { parse_mode: 'HTML' }).catch(() => {});
    return;
  }
  if (!remote.ok && !remote.items.length) {
    if (loadingMsg?.message_id) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
    }
    await ctx.reply(texts.predictScheduleFetchFailed, { parse_mode: 'HTML' }).catch(() => {});
    return;
  }

  const groups = await dropUnreachableDuplicateTitles(
    ctx.telegram,
    normalizeFloodObserveGroups(remote.items),
    config,
    foSettingsLog,
  );
  const text = buildFloodObserveListText(texts, groups);
  const keyboard = buildFloodObserveListKeyboard(texts, groups);
  const extra = { parse_mode: 'HTML', ...keyboard };

  if (opts.edit && ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, extra);
      return;
    } catch {
      /* fall through */
    }
  }

  if (loadingMsg?.message_id) {
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
  }
  await ctx.reply(text, extra).catch(() => {});
}

async function renderFloodObserveDetailPanel(ctx, config, getTexts, groupId, opts = {}) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  let g = await loadFloodObserveGroup(ctx, config, groupId);

  if (!g) {
    await ctx
      .answerCbQuery(texts.joinVerifySettingsGroupNotFound, { show_alert: true })
      .catch(() => {});
    await renderFloodObserveListPanel(ctx, config, getTexts, { edit: true, skipLoading: true });
    return;
  }

  if (opts.overlay && typeof opts.overlay === 'object') {
    const merged = { ...g, ...opts.overlay };
    g = { ...merged, ...parseFloodObserveFields(merged) };
  }

  const text = buildFloodObserveDetailText(texts, g);
  const keyboard = buildFloodObserveDetailKeyboard(texts, g);
  const extra = { parse_mode: 'HTML', ...keyboard };

  if (opts.edit !== false && ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, extra);
      return;
    } catch {
      /* fall through */
    }
  }
  await ctx.reply(text, extra).catch(() => {});
}

async function handleFloodObserveOpenList(ctx, config, getTexts) {
  await withTypingWhileAwaiting(ctx, (async () => {
    await renderFloodObserveListPanel(ctx, config, getTexts, { edit: true, skipLoading: true });
  })());
  await ctx.answerCbQuery().catch(() => {});
}

async function handleFloodObserveOpenDetail(ctx, config, getTexts, groupId) {
  await withTypingWhileAwaiting(ctx, (async () => {
    await renderFloodObserveDetailPanel(ctx, config, getTexts, groupId, { edit: true });
  })());
  await ctx.answerCbQuery().catch(() => {});
}

async function handleFloodObservePatch(ctx, config, getTexts, groupId, patch, toastKey) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  const authRes = await resolveOwnerAuth(ctx, config);
  if (!authRes.ok) {
    await ctx.answerCbQuery(texts.predictScheduleNeedLogin, { show_alert: true }).catch(() => {});
    return;
  }

  try {
    await withTypingWhileAwaiting(ctx, (async () => {
      const saveRes = await saveFloodObservePatch(ctx, config, authRes.auth, {
        groupId: Number(groupId),
        ...patch,
      });
      if (!isSaveBusinessOk(saveRes)) {
        await ctx
          .answerCbQuery(
            `保存失败 HTTP ${saveRes.status}${saveRes.json?.code != null ? ` code=${saveRes.json.code}` : ''}`,
            { show_alert: true },
          )
          .catch(() => {});
        return;
      }
      await ctx.answerCbQuery(texts[toastKey] || texts.floodObserveSettingsSavedToast).catch(() => {});
      await renderFloodObserveDetailPanel(ctx, config, getTexts, groupId, {
        edit: true,
        overlay: patch,
      });
    })());
  } catch (err) {
    foSettingsLog('patch_error', { groupId: String(groupId), message: err?.message || String(err) });
    await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
  }
}

async function handleFloodToggleEnabled(ctx, config, getTexts, groupId, enabled) {
  await handleFloodObservePatch(
    ctx,
    config,
    getTexts,
    groupId,
    { floodEnabled: enabled ? 1 : 0 },
    enabled ? 'floodSettingsEnabledToast' : 'floodSettingsDisabledToast',
  );
}

async function handleObserveToggleEnabled(ctx, config, getTexts, groupId, enabled) {
  await handleFloodObservePatch(
    ctx,
    config,
    getTexts,
    groupId,
    { observeEnabled: enabled ? 1 : 0 },
    enabled ? 'observeSettingsEnabledToast' : 'observeSettingsDisabledToast',
  );
}

async function handleFloodSetNumberField(ctx, config, getTexts, groupId, field, value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }
  await handleFloodObservePatch(ctx, config, getTexts, groupId, { [field]: n }, 'floodObserveSettingsSavedToast');
}

async function handleFloodSetAction(ctx, config, getTexts, groupId, action) {
  const a = action === 'kick' ? 'kick' : 'delete_mute';
  await handleFloodObservePatch(
    ctx,
    config,
    getTexts,
    groupId,
    { floodAction: a },
    'floodObserveSettingsSavedToast',
  );
}

module.exports = {
  handleFloodObserveOpenList,
  handleFloodObserveOpenDetail,
  handleFloodToggleEnabled,
  handleObserveToggleEnabled,
  handleFloodSetNumberField,
  handleFloodSetAction,
  renderFloodObserveListPanel,
  renderFloodObserveDetailPanel,
};
