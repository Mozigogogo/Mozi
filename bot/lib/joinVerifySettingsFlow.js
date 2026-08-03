'use strict';

/**
 * /group → 新成员入群验证配置面板
 * 写：POST /tg/stats/group/save
 * 读：优先 GET /tg/stats/group/get，失败再退回 listByTelegramId
 */

const { Markup } = require('telegraf');
const {
  postTgStatsGroupSave,
  getTgStatsGroupGet,
  parseJoinVerifyFields,
} = require('./apis');
const { ensureTgUserToken } = require('./tgUserTokenCache');
const { buildTelegramLoginOptsFromCtx } = require('./datainfoPoints');
const { escapeHtml } = require('./telegramHtml');
const { fetchOwnerGroupsFromApi } = require('./predictScheduleFlow');
const { invalidateJoinVerifyConfigCache } = require('./joinVerifyConfig');
const { tgGroupListLog } = require('./tgGroupListDebug');

const TIMEOUT_PRESETS = [60, 120, 180, 300];
const MAX_FAIL_PRESETS = [1, 2, 3, 5];
const BAN_DURATION_PRESETS = [600, 3600, 86400];
const MODE_OPTIONS = ['button', 'quiz', 'captcha'];

function jvSettingsLog(event, payload) {
  const on = !/^0|false|no$/i.test(String(process.env.JOIN_VERIFY_LOG ?? '1').trim());
  if (!on) return;
  let body = '';
  try {
    body = payload === undefined ? '' : ` ${JSON.stringify(payload)}`;
  } catch {
    body = ` ${String(payload)}`;
  }
  console.log(`[JOIN_VERIFY_SETTINGS] ${new Date().toISOString()} ${event}${body}`);
}

/** HTTP 200 之外再看业务 code */
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

/**
 * @param {object[]} items
 */
function normalizeJoinVerifyGroups(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const groupId = Number(item.groupId);
      if (!Number.isFinite(groupId)) return null;
      const jv = parseJoinVerifyFields(item);
      return {
        groupId,
        groupTitle: String(item.groupTitle || '').trim() || `群 ${groupId}`,
        ...jv,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) => String(a.groupTitle).localeCompare(String(b.groupTitle)) || a.groupId - b.groupId,
    );
}

function modeLabel(mode, texts) {
  if (mode === 'quiz') return texts?.joinVerifyModeLabelQuiz || '算术验证';
  if (mode === 'captcha') return texts?.joinVerifyModeLabelCaptcha || '加密答题';
  return texts?.joinVerifyModeLabelButton || '点击按钮';
}

function buildJoinVerifyListText(texts, groups) {
  if (!groups.length) {
    return `${texts.joinVerifySettingsIntro}\n\n${texts.predictScheduleEmpty}`;
  }
  const lines = groups.map((g) =>
    texts.joinVerifySettingsGroupLine(
      escapeHtml(g.groupTitle),
      g.joinVerifyEnabled === 1,
      g.joinVerifyMode,
      g.joinVerifyTimeoutSec,
    ),
  );
  return `${texts.joinVerifySettingsIntro}\n\n${lines.join('\n')}`;
}

function buildJoinVerifyListKeyboard(texts, groups) {
  const rows = groups.map((g) => {
    const title = String(g.groupTitle || g.groupId).slice(0, 18);
    const mark = g.joinVerifyEnabled === 1 ? '✅' : '⬜';
    return [Markup.button.callback(`${mark} ${title}`, `jv:g:${g.groupId}`)];
  });
  rows.push([
    Markup.button.callback(texts.predictScheduleRefreshBtn, 'jv:r'),
    Markup.button.callback(texts.groupSettingsBackBtn, 'gs:home'),
  ]);
  return Markup.inlineKeyboard(rows);
}

function buildJoinVerifyDetailText(texts, g) {
  const title = escapeHtml(g.groupTitle || String(g.groupId));
  const onOff = g.joinVerifyEnabled === 1 ? texts.joinVerifySettingsOn : texts.joinVerifySettingsOff;
  const ban =
    g.joinVerifyBanEnabled === 1
      ? texts.joinVerifySettingsBanOn(g.joinVerifyBanDurationSec)
      : texts.joinVerifySettingsBanOff;
  const custom = g.joinVerifyWelcomeText
    ? escapeHtml(String(g.joinVerifyWelcomeText).slice(0, 80))
    : texts.joinVerifySettingsDefaultText;
  return texts.joinVerifySettingsDetailHtml(
    title,
    onOff,
    g.joinVerifyMode,
    g.joinVerifyTimeoutSec,
    g.joinVerifyMaxFail,
    ban,
    custom,
  );
}

function buildJoinVerifyDetailKeyboard(texts, g) {
  const gid = g.groupId;
  const modes = new Set(g.joinVerifyModes || []);
  const modeRow = MODE_OPTIONS.map((m) => {
    const on = modes.has(m);
    return Markup.button.callback(
      `${on ? '✅' : '⬜'} ${modeLabel(m, texts)}`,
      `jv:m:${gid}:${m}`,
    );
  });
  const timeoutRow = TIMEOUT_PRESETS.map((sec) =>
    Markup.button.callback(
      sec === g.joinVerifyTimeoutSec ? `·${sec}s·` : `${sec}s`,
      `jv:to:${gid}:${sec}`,
    ),
  );
  const failRow = MAX_FAIL_PRESETS.map((n) =>
    Markup.button.callback(
      n === g.joinVerifyMaxFail ? `·${n}·` : String(n),
      `jv:mf:${gid}:${n}`,
    ),
  );
  const banDurRow = BAN_DURATION_PRESETS.map((sec) => {
    const label = sec >= 86400 ? `${sec / 86400}d` : sec >= 3600 ? `${sec / 3600}h` : `${sec / 60}m`;
    return Markup.button.callback(
      sec === g.joinVerifyBanDurationSec ? `·${label}·` : label,
      `jv:bd:${gid}:${sec}`,
    );
  });

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(texts.joinVerifySettingsEnableBtn, `jv:e:${gid}:1`),
      Markup.button.callback(texts.joinVerifySettingsDisableBtn, `jv:e:${gid}:0`),
    ],
    modeRow,
    timeoutRow,
    failRow,
    [
      Markup.button.callback(texts.joinVerifySettingsBanEnableBtn, `jv:ban:${gid}:1`),
      Markup.button.callback(texts.joinVerifySettingsBanDisableBtn, `jv:ban:${gid}:0`),
    ],
    banDurRow,
    [
      Markup.button.callback(texts.joinVerifySettingsBackListBtn, 'jv:list'),
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

async function saveJoinVerifyPatch(ctx, config, auth, patch) {
  jvSettingsLog('save.request', {
    groupId: patch.groupId,
    patch: {
      joinVerifyEnabled: patch.joinVerifyEnabled,
      joinVerifyMode: patch.joinVerifyMode,
      joinVerifyTimeoutSec: patch.joinVerifyTimeoutSec,
      joinVerifyMaxFail: patch.joinVerifyMaxFail,
      joinVerifyBanEnabled: patch.joinVerifyBanEnabled,
      joinVerifyBanDurationSec: patch.joinVerifyBanDurationSec,
    },
  });
  const saveRes = await postTgStatsGroupSave({
    apiBaseUrl: config.API_BASE_URL,
    auth,
    appUrl: config.APP_URL,
    path: config.TG_GROUP_SAVE_PATH,
    groups: [patch],
  });
  jvSettingsLog('save.response', {
    groupId: patch.groupId,
    httpOk: saveRes.ok,
    httpStatus: saveRes.status,
    businessOk: isSaveBusinessOk(saveRes),
    apiCode: saveRes.json?.code ?? null,
    apiMsg: saveRes.json?.msg || saveRes.json?.message || null,
    textPreview: String(saveRes.text || '').slice(0, 400),
  });
  if (saveRes.ok && patch.groupId != null) {
    invalidateJoinVerifyConfigCache(patch.groupId);
  }
  return saveRes;
}

/**
 * 优先 GET /get，再退回 list
 * @returns {Promise<object | null>}
 */
async function loadJoinVerifyGroup(ctx, config, groupId) {
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
      jvSettingsLog('load.get', {
        groupId: String(groupId),
        httpOk: getRes.ok,
        httpStatus: getRes.status,
        hasGroup: Boolean(getRes.group),
        joinVerifyEnabled: getRes.group?.joinVerifyEnabled ?? null,
        joinVerifyMode: getRes.group?.joinVerifyMode ?? null,
        rawKeys: getRes.group ? Object.keys(getRes.group).filter((k) => /join|verify/i.test(k)) : [],
        textPreview: String(getRes.text || '').slice(0, 400),
      });
      if (getRes.ok && getRes.group) {
        const jv = parseJoinVerifyFields(getRes.group);
        return {
          groupId: Number(getRes.group.groupId ?? groupId),
          groupTitle:
            String(getRes.group.groupTitle || getRes.group.title || '').trim() ||
            `群 ${groupId}`,
          ...jv,
          _source: 'get',
        };
      }
    } catch (err) {
      jvSettingsLog('load.get_error', {
        groupId: String(groupId),
        message: err?.message || String(err),
      });
    }
  }

  const remote = await fetchOwnerGroupsFromApi(ctx, config);
  const groups = normalizeJoinVerifyGroups(remote.items || []);
  const g = groups.find((x) => String(x.groupId) === String(groupId)) || null;
  jvSettingsLog('load.list_fallback', {
    groupId: String(groupId),
    listOk: remote.ok,
    itemCount: (remote.items || []).length,
    found: Boolean(g),
    joinVerifyEnabled: g?.joinVerifyEnabled ?? null,
    sampleKeys:
      remote.items?.[0] != null
        ? Object.keys(remote.items[0]).filter((k) => /join|verify|autoPublish/i.test(k))
        : [],
  });
  return g ? { ...g, _source: 'list' } : null;
}

async function renderJoinVerifyListPanel(ctx, config, getTexts, opts = {}) {
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

  const groups = normalizeJoinVerifyGroups(remote.items);
  jvSettingsLog('list.render', {
    count: groups.length,
    rows: groups.map((g) => ({
      groupId: g.groupId,
      title: g.groupTitle,
      joinVerifyEnabled: g.joinVerifyEnabled,
      mode: g.joinVerifyMode,
    })),
  });
  const text = buildJoinVerifyListText(texts, groups);
  const keyboard = buildJoinVerifyListKeyboard(texts, groups);
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

/**
 * @param {{ edit?: boolean; overlay?: object }} [opts]
 * overlay：保存成功后乐观覆盖（防止 list/get 尚未返回新字段时 UI 回弹）
 */
async function renderJoinVerifyDetailPanel(ctx, config, getTexts, groupId, opts = {}) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  let g = await loadJoinVerifyGroup(ctx, config, groupId);

  if (!g) {
    await ctx.answerCbQuery(texts.joinVerifySettingsGroupNotFound, { show_alert: true }).catch(() => {});
    await renderJoinVerifyListPanel(ctx, config, getTexts, { edit: true, skipLoading: true });
    return;
  }

  if (opts.overlay && typeof opts.overlay === 'object') {
    const merged = { ...g, ...opts.overlay };
    const parsed = parseJoinVerifyFields(merged);
    g = { ...merged, ...parsed };
  }

  jvSettingsLog('detail.render', {
    groupId: String(groupId),
    source: g._source || null,
    joinVerifyEnabled: g.joinVerifyEnabled,
    joinVerifyMode: g.joinVerifyMode,
    overlay: opts.overlay || null,
  });

  const text = buildJoinVerifyDetailText(texts, g);
  const keyboard = buildJoinVerifyDetailKeyboard(texts, g);
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

async function handleJoinVerifyOpenList(ctx, config, getTexts) {
  await ctx.answerCbQuery().catch(() => {});
  await renderJoinVerifyListPanel(ctx, config, getTexts, { edit: true, skipLoading: true });
}

async function handleJoinVerifyOpenDetail(ctx, config, getTexts, groupId) {
  await ctx.answerCbQuery().catch(() => {});
  await renderJoinVerifyDetailPanel(ctx, config, getTexts, groupId, { edit: true });
}

async function handleJoinVerifyToggleEnabled(ctx, config, getTexts, groupId, enabled) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  const authRes = await resolveOwnerAuth(ctx, config);
  if (!authRes.ok) {
    await ctx.answerCbQuery(texts.predictScheduleNeedLogin, { show_alert: true }).catch(() => {});
    return;
  }

  const patch = {
    groupId: Number(groupId),
    joinVerifyEnabled: enabled ? 1 : 0,
  };

  try {
    const saveRes = await saveJoinVerifyPatch(ctx, config, authRes.auth, patch);
    if (!isSaveBusinessOk(saveRes)) {
      jvSettingsLog('toggle.enabled_failed', {
        groupId: String(groupId),
        enabled,
        httpStatus: saveRes.status,
        apiCode: saveRes.json?.code,
      });
      await ctx
        .answerCbQuery(
          `保存失败 HTTP ${saveRes.status}${saveRes.json?.code != null ? ` code=${saveRes.json.code}` : ''}`,
          { show_alert: true },
        )
        .catch(() => {});
      return;
    }
  } catch (err) {
    tgGroupListLog('join_verify.save_error', { message: err?.message || String(err) });
    jvSettingsLog('toggle.enabled_error', {
      groupId: String(groupId),
      message: err?.message || String(err),
    });
    await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    return;
  }

  await ctx
    .answerCbQuery(enabled ? texts.joinVerifySettingsEnabledToast : texts.joinVerifySettingsDisabledToast)
    .catch(() => {});

  await renderJoinVerifyDetailPanel(ctx, config, getTexts, groupId, {
    edit: true,
    overlay: { joinVerifyEnabled: enabled ? 1 : 0 },
  });
}

async function handleJoinVerifyToggleMode(ctx, config, getTexts, groupId, mode) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  const authRes = await resolveOwnerAuth(ctx, config);
  if (!authRes.ok) {
    await ctx.answerCbQuery(texts.predictScheduleNeedLogin, { show_alert: true }).catch(() => {});
    return;
  }

  const current = await loadJoinVerifyGroup(ctx, config, groupId);
  if (!current) {
    await ctx.answerCbQuery(texts.joinVerifySettingsGroupNotFound, { show_alert: true }).catch(() => {});
    return;
  }

  const set = new Set(current.joinVerifyModes || []);
  if (set.has(mode)) {
    if (set.size <= 1) {
      await ctx.answerCbQuery(texts.joinVerifySettingsModeMinToast, { show_alert: true }).catch(() => {});
      return;
    }
    set.delete(mode);
  } else {
    set.add(mode);
  }
  const nextMode = [...set].join(',');

  try {
    const saveRes = await saveJoinVerifyPatch(ctx, config, authRes.auth, {
      groupId: Number(groupId),
      joinVerifyMode: nextMode,
    });
    if (!isSaveBusinessOk(saveRes)) {
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
      return;
    }
  } catch {
    await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    return;
  }

  await ctx.answerCbQuery(texts.joinVerifySettingsSavedToast).catch(() => {});
  await renderJoinVerifyDetailPanel(ctx, config, getTexts, groupId, {
    edit: true,
    overlay: { joinVerifyMode: nextMode },
  });
}

async function handleJoinVerifySetNumberField(ctx, config, getTexts, groupId, field, value, toastKey) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  const authRes = await resolveOwnerAuth(ctx, config);
  if (!authRes.ok) {
    await ctx.answerCbQuery(texts.predictScheduleNeedLogin, { show_alert: true }).catch(() => {});
    return;
  }
  const patch = { groupId: Number(groupId), [field]: Number(value) };
  try {
    const saveRes = await saveJoinVerifyPatch(ctx, config, authRes.auth, patch);
    if (!isSaveBusinessOk(saveRes)) {
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
      return;
    }
  } catch {
    await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    return;
  }
  await ctx.answerCbQuery(texts[toastKey] || texts.joinVerifySettingsSavedToast).catch(() => {});
  await renderJoinVerifyDetailPanel(ctx, config, getTexts, groupId, {
    edit: true,
    overlay: patch,
  });
}

async function handleJoinVerifyToggleBan(ctx, config, getTexts, groupId, enabled) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  const authRes = await resolveOwnerAuth(ctx, config);
  if (!authRes.ok) {
    await ctx.answerCbQuery(texts.predictScheduleNeedLogin, { show_alert: true }).catch(() => {});
    return;
  }
  try {
    const saveRes = await saveJoinVerifyPatch(ctx, config, authRes.auth, {
      groupId: Number(groupId),
      joinVerifyBanEnabled: enabled ? 1 : 0,
    });
    if (!isSaveBusinessOk(saveRes)) {
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
      return;
    }
  } catch {
    await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    return;
  }
  await ctx.answerCbQuery(texts.joinVerifySettingsSavedToast).catch(() => {});
  await renderJoinVerifyDetailPanel(ctx, config, getTexts, groupId, {
    edit: true,
    overlay: { joinVerifyBanEnabled: enabled ? 1 : 0 },
  });
}

module.exports = {
  renderJoinVerifyListPanel,
  renderJoinVerifyDetailPanel,
  handleJoinVerifyOpenList,
  handleJoinVerifyOpenDetail,
  handleJoinVerifyToggleEnabled,
  handleJoinVerifyToggleMode,
  handleJoinVerifySetNumberField,
  handleJoinVerifyToggleBan,
  normalizeJoinVerifyGroups,
};
