'use strict';

/**
 * /group → 新成员入群验证配置面板
 * 读写 POST /tg/stats/group/save、列表来自 listByTelegramId
 */

const { Markup } = require('telegraf');
const { postTgStatsGroupSave, parseJoinVerifyFields } = require('./apis');
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

/**
 * @param {object} texts
 * @param {object[]} groups
 */
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

/**
 * @param {object} texts
 * @param {object[]} groups
 */
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

/**
 * @param {object} texts
 * @param {object} g
 */
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

/**
 * @param {object} texts
 * @param {object} g
 */
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

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {string} auth
 * @param {object} patch
 */
async function saveJoinVerifyPatch(ctx, config, auth, patch) {
  const saveRes = await postTgStatsGroupSave({
    apiBaseUrl: config.API_BASE_URL,
    auth,
    appUrl: config.APP_URL,
    path: config.TG_GROUP_SAVE_PATH,
    groups: [patch],
  });
  if (saveRes.ok && patch.groupId != null) {
    invalidateJoinVerifyConfigCache(patch.groupId);
  }
  return saveRes;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {Function} getTexts
 * @param {{ edit?: boolean; skipLoading?: boolean }} [opts]
 */
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
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {Function} getTexts
 * @param {number | string} groupId
 * @param {{ edit?: boolean }} [opts]
 */
async function renderJoinVerifyDetailPanel(ctx, config, getTexts, groupId, opts = {}) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  const remote = await fetchOwnerGroupsFromApi(ctx, config);
  if (remote.authMissing) {
    await ctx.answerCbQuery(texts.predictScheduleNeedLogin, { show_alert: true }).catch(() => {});
    return;
  }
  if (!remote.ok && !remote.items.length) {
    await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    return;
  }

  const groups = normalizeJoinVerifyGroups(remote.items);
  const g = groups.find((x) => String(x.groupId) === String(groupId));
  if (!g) {
    await ctx.answerCbQuery(texts.joinVerifySettingsGroupNotFound, { show_alert: true }).catch(() => {});
    await renderJoinVerifyListPanel(ctx, config, getTexts, { edit: true, skipLoading: true });
    return;
  }

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
  try {
    const saveRes = await saveJoinVerifyPatch(ctx, config, authRes.auth, {
      groupId: Number(groupId),
      joinVerifyEnabled: enabled ? 1 : 0,
    });
    if (!saveRes.ok) {
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
      return;
    }
  } catch (err) {
    tgGroupListLog('join_verify.save_error', { message: err?.message || String(err) });
    await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    return;
  }
  await ctx
    .answerCbQuery(enabled ? texts.joinVerifySettingsEnabledToast : texts.joinVerifySettingsDisabledToast)
    .catch(() => {});
  await renderJoinVerifyDetailPanel(ctx, config, getTexts, groupId, { edit: true });
}

async function handleJoinVerifyToggleMode(ctx, config, getTexts, groupId, mode) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  const authRes = await resolveOwnerAuth(ctx, config);
  if (!authRes.ok) {
    await ctx.answerCbQuery(texts.predictScheduleNeedLogin, { show_alert: true }).catch(() => {});
    return;
  }

  const remote = await fetchOwnerGroupsFromApi(ctx, config);
  const groups = normalizeJoinVerifyGroups(remote.items || []);
  const g = groups.find((x) => String(x.groupId) === String(groupId));
  if (!g) {
    await ctx.answerCbQuery(texts.joinVerifySettingsGroupNotFound, { show_alert: true }).catch(() => {});
    return;
  }

  const set = new Set(g.joinVerifyModes || []);
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
    if (!saveRes.ok) {
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
      return;
    }
  } catch {
    await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    return;
  }

  await ctx.answerCbQuery(texts.joinVerifySettingsSavedToast).catch(() => {});
  await renderJoinVerifyDetailPanel(ctx, config, getTexts, groupId, { edit: true });
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
    if (!saveRes.ok) {
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
      return;
    }
  } catch {
    await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    return;
  }
  await ctx.answerCbQuery(texts[toastKey] || texts.joinVerifySettingsSavedToast).catch(() => {});
  await renderJoinVerifyDetailPanel(ctx, config, getTexts, groupId, { edit: true });
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
    if (!saveRes.ok) {
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
      return;
    }
  } catch {
    await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    return;
  }
  await ctx.answerCbQuery(texts.joinVerifySettingsSavedToast).catch(() => {});
  await renderJoinVerifyDetailPanel(ctx, config, getTexts, groupId, { edit: true });
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
