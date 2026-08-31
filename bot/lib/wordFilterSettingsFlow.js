'use strict';

/**
 * /config → 违禁词过滤配置
 * 写：POST /tg/stats/group/save
 * 读：优先 GET /tg/stats/group/get，失败再退回 list
 */

const { Markup } = require('telegraf');
const {
  postTgStatsGroupSave,
  getTgStatsGroupGet,
  parseKeywordFilterFields,
} = require('./apis');
const { ensureTgUserToken } = require('./tgUserTokenCache');
const { buildTelegramLoginOptsFromCtx } = require('./datainfoPoints');
const { escapeHtml } = require('./telegramHtml');
const { fetchOwnerGroupsFromApi } = require('./predictScheduleFlow');
const { invalidateGroupModerationConfigCache } = require('./joinVerifyConfig');
const { withTypingWhileAwaiting } = require('./telegramTypingPulse');
const { dropUnreachableDuplicateTitles } = require('./tgGroupStats');

function wfSettingsLog(event, payload) {
  const on = !/^0|false|no$/i.test(String(process.env.WORD_FILTER_SETTINGS_LOG ?? '1').trim());
  if (!on) return;
  let body = '';
  try {
    body = payload === undefined ? '' : ` ${JSON.stringify(payload)}`;
  } catch {
    body = ` ${String(payload)}`;
  }
  console.log(`[WORD_FILTER_SETTINGS] ${new Date().toISOString()} ${event}${body}`);
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

function normalizeKeywordFilterGroups(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const groupId = Number(item.groupId);
      if (!Number.isFinite(groupId)) return null;
      if (item.status != null && Number(item.status) === 0) return null;
      const kf = parseKeywordFilterFields(item);
      return {
        groupId,
        groupTitle: String(item.groupTitle || item.title || '').trim() || `群 ${groupId}`,
        status: item.status == null ? null : Number(item.status),
        updatedAtMs: item.updatedAtMs ?? null,
        createdAtMs: item.createdAtMs ?? null,
        ...kf,
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

function buildKeywordFilterListText(texts, groups) {
  if (!groups.length) {
    return `${texts.wordFilterSettingsIntro}\n\n${texts.predictScheduleEmpty}`;
  }
  const lines = groups.map((g) =>
    texts.wordFilterSettingsGroupLine(
      escapeHtml(displayTitleForGroup(g, groups)),
      g.keywordFilterEnabled === 1,
    ),
  );
  return `${texts.wordFilterSettingsIntro}\n\n${lines.join('\n')}`;
}

function buildKeywordFilterListKeyboard(texts, groups) {
  const rows = groups.map((g) => {
    const label = displayTitleForGroup(g, groups);
    const mark = g.keywordFilterEnabled === 1 ? '✅' : '⬜';
    return [Markup.button.callback(`${mark} ${label.slice(0, 36)}`, `wf:g:${g.groupId}`)];
  });
  rows.push([
    Markup.button.callback(texts.predictScheduleRefreshBtn, 'wf:r'),
    Markup.button.callback(texts.groupSettingsBackBtn, 'gs:home'),
  ]);
  return Markup.inlineKeyboard(rows);
}

function buildKeywordFilterDetailText(texts, g) {
  const onOff =
    g.keywordFilterEnabled === 1 ? texts.joinVerifySettingsOn : texts.joinVerifySettingsOff;
  return texts.wordFilterSettingsDetailHtml(
    escapeHtml(String(g.groupTitle || g.groupId)),
    onOff,
  );
}

function buildKeywordFilterDetailKeyboard(texts, g) {
  const gid = g.groupId;
  const label = (t) => Markup.button.callback(`— ${t} —`, 'wf:noop');

  return Markup.inlineKeyboard([
    [label(texts.wordFilterSettingsSectionSwitch)],
    [
      Markup.button.callback(texts.wordFilterSettingsEnableBtn, `wf:e:${gid}:1`),
      Markup.button.callback(texts.wordFilterSettingsDisableBtn, `wf:e:${gid}:0`),
    ],
    [
      Markup.button.callback(texts.joinVerifySettingsBackListBtn, 'wf:list'),
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

async function saveKeywordFilterPatch(ctx, config, auth, patch) {
  wfSettingsLog('save.request', { groupId: patch.groupId, patch });
  const saveRes = await postTgStatsGroupSave({
    apiBaseUrl: config.API_BASE_URL,
    auth,
    appUrl: config.APP_URL,
    path: config.TG_GROUP_SAVE_PATH,
    groups: [patch],
  });
  wfSettingsLog('save.response', {
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

async function loadKeywordFilterGroup(ctx, config, groupId) {
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
        const kf = parseKeywordFilterFields(getRes.group);
        return {
          groupId: Number(getRes.group.groupId ?? groupId),
          groupTitle:
            String(getRes.group.groupTitle || getRes.group.title || '').trim() ||
            `群 ${groupId}`,
          ...kf,
          _source: 'get',
        };
      }
    } catch (err) {
      wfSettingsLog('load.get_error', {
        groupId: String(groupId),
        message: err?.message || String(err),
      });
    }
  }

  const remote = await fetchOwnerGroupsFromApi(ctx, config);
  const groups = normalizeKeywordFilterGroups(remote.items || []);
  const g = groups.find((x) => String(x.groupId) === String(groupId)) || null;
  return g ? { ...g, _source: 'list' } : null;
}

async function renderKeywordFilterListPanel(ctx, config, getTexts, opts = {}) {
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
    normalizeKeywordFilterGroups(remote.items),
    config,
    wfSettingsLog,
  );
  const text = buildKeywordFilterListText(texts, groups);
  const keyboard = buildKeywordFilterListKeyboard(texts, groups);
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

async function renderKeywordFilterDetailPanel(ctx, config, getTexts, groupId, opts = {}) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  let g = await loadKeywordFilterGroup(ctx, config, groupId);

  if (!g) {
    await ctx
      .answerCbQuery(texts.joinVerifySettingsGroupNotFound, { show_alert: true })
      .catch(() => {});
    await renderKeywordFilterListPanel(ctx, config, getTexts, { edit: true, skipLoading: true });
    return;
  }

  if (opts.overlay && typeof opts.overlay === 'object') {
    const merged = { ...g, ...opts.overlay };
    g = { ...merged, ...parseKeywordFilterFields(merged) };
  }

  const text = buildKeywordFilterDetailText(texts, g);
  const keyboard = buildKeywordFilterDetailKeyboard(texts, g);
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

async function handleKeywordFilterOpenList(ctx, config, getTexts) {
  await withTypingWhileAwaiting(ctx, (async () => {
    await renderKeywordFilterListPanel(ctx, config, getTexts, { edit: true, skipLoading: true });
  })());
  await ctx.answerCbQuery().catch(() => {});
}

async function handleKeywordFilterOpenDetail(ctx, config, getTexts, groupId) {
  await withTypingWhileAwaiting(ctx, (async () => {
    await renderKeywordFilterDetailPanel(ctx, config, getTexts, groupId, { edit: true });
  })());
  await ctx.answerCbQuery().catch(() => {});
}

async function handleKeywordFilterPatch(ctx, config, getTexts, groupId, patch, toastKey) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  const authRes = await resolveOwnerAuth(ctx, config);
  if (!authRes.ok) {
    await ctx.answerCbQuery(texts.predictScheduleNeedLogin, { show_alert: true }).catch(() => {});
    return;
  }

  try {
    await withTypingWhileAwaiting(ctx, (async () => {
      const saveRes = await saveKeywordFilterPatch(ctx, config, authRes.auth, {
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
      await ctx.answerCbQuery(texts[toastKey] || texts.wordFilterSettingsSavedToast).catch(() => {});
      await renderKeywordFilterDetailPanel(ctx, config, getTexts, groupId, {
        edit: true,
        overlay: patch,
      });
    })());
  } catch (err) {
    wfSettingsLog('patch_error', { groupId: String(groupId), message: err?.message || String(err) });
    await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
  }
}

async function handleKeywordFilterToggleEnabled(ctx, config, getTexts, groupId, enabled) {
  await handleKeywordFilterPatch(
    ctx,
    config,
    getTexts,
    groupId,
    { keywordFilterEnabled: enabled ? 1 : 0 },
    enabled ? 'wordFilterSettingsEnabledToast' : 'wordFilterSettingsDisabledToast',
  );
}

module.exports = {
  handleKeywordFilterOpenList,
  handleKeywordFilterOpenDetail,
  handleKeywordFilterToggleEnabled,
  renderKeywordFilterListPanel,
  renderKeywordFilterDetailPanel,
};
