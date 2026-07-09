'use strict';

const { Markup } = require('telegraf');
const { ensureTgUserToken } = require('./tgUserTokenCache');
const { getTgStatsGroupListByTelegramId, postTgStatsGroupSave } = require('./apis');
const { buildTelegramLoginOptsFromCtx } = require('./datainfoPoints');
const { escapeHtml } = require('./telegramHtml');
const { DEFAULT_PUBLISH_TIME } = require('./predictScheduleStore');
const { tgGroupListLog, tgGroupListDebug } = require('./tgGroupListDebug');
const { jwtPreview } = require('./debugLog');

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 */
async function fetchOwnerGroupsFromApi(ctx, config) {
  const uid = ctx.from?.id;
  if (uid == null) {
    tgGroupListLog('fetch.skip', { reason: 'no_telegram_id' });
    return { ok: false, items: [], authMissing: true };
  }

  tgGroupListLog('fetch.start', {
    telegramId: uid,
    chatType: ctx.chat?.type,
    apiBaseUrl: config.API_BASE_URL,
    path: config.TG_GROUP_LIST_BY_TELEGRAM_ID_PATH,
  });

  const loginOpts = buildTelegramLoginOptsFromCtx(ctx);
  tgGroupListDebug('fetch.loginOpts', loginOpts);

  let token = '';
  try {
    token = await ensureTgUserToken(config, String(uid), loginOpts);
  } catch (err) {
    tgGroupListLog('fetch.token_error', {
      telegramId: uid,
      message: err?.message || String(err),
    });
    return { ok: false, items: [], authMissing: true, error: err?.message || String(err) };
  }

  const auth = token || config.MOZI_DETAIL_AUTH || '';
  tgGroupListLog('fetch.auth', {
    telegramId: uid,
    hasToken: Boolean(token),
    hasFallbackAuth: Boolean(!token && config.MOZI_DETAIL_AUTH),
    authPreview: jwtPreview(auth),
  });

  if (!auth) {
    tgGroupListLog('fetch.skip', { reason: 'no_auth', telegramId: uid });
    return { ok: false, items: [], authMissing: true };
  }

  try {
    const res = await getTgStatsGroupListByTelegramId({
      apiBaseUrl: config.API_BASE_URL,
      telegramId: uid,
      auth,
      appUrl: config.APP_URL,
      path: config.TG_GROUP_LIST_BY_TELEGRAM_ID_PATH,
    });
    tgGroupListLog('fetch.result', {
      telegramId: uid,
      ok: res.ok,
      httpStatus: res.status,
      itemCount: (res.items || []).length,
      errorMessage: res.errorMessage || null,
      apiCode: res.json?.code,
    });
    tgGroupListDebug('fetch.result.raw', {
      text: res.text?.slice?.(0, 2000),
      json: res.json,
    });
    return {
      ok: res.ok,
      items: res.items || [],
      authMissing: false,
      errorMessage: res.errorMessage,
      httpStatus: res.status,
    };
  } catch (err) {
    tgGroupListLog('fetch.api_error', {
      telegramId: uid,
      message: err?.message || String(err),
      name: err?.name,
    });
    return {
      ok: false,
      items: [],
      authMissing: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * @param {object[]} items
 * @returns {object[]}
 */
function normalizeScheduleGroups(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const groupId = Number(item.groupId);
      if (!Number.isFinite(groupId)) return null;
      return {
        groupId,
        groupTitle: String(item.groupTitle || '').trim() || `群 ${groupId}`,
        enabled: Boolean(item.enabled),
        publishTime: DEFAULT_PUBLISH_TIME,
        autoPublishGuess: item.autoPublishGuess === 1 ? 1 : 0,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) => String(a.groupTitle).localeCompare(String(b.groupTitle)) || a.groupId - b.groupId,
    );
}

/**
 * @param {object} texts
 * @param {object[]} groups
 */
function buildSchedulePanelKeyboard(texts, groups) {
  const rows = groups.map((g) => {
    const title = String(g.groupTitle || g.groupId).slice(0, 16);
    return [
      Markup.button.callback(
        texts.predictScheduleEnableBtn(title, g.enabled),
        `ps:t:${g.groupId}:1`,
      ),
      Markup.button.callback(
        texts.predictScheduleDisableBtn(title, g.enabled),
        `ps:t:${g.groupId}:0`,
      ),
    ];
  });
  rows.push([Markup.button.callback(texts.predictScheduleRefreshBtn, 'ps:r')]);
  return Markup.inlineKeyboard(rows);
}

/**
 * @param {object} texts
 * @param {object[]} groups
 * @param {string} publishTime
 */
function buildSchedulePanelText(texts, groups, publishTime) {
  if (!groups.length) {
    return `${texts.predictScheduleIntro}\n\n${texts.predictScheduleEmpty}`;
  }
  const lines = groups.map((g) =>
    texts.predictScheduleGroupLine(
      escapeHtml(g.groupTitle || String(g.groupId)),
      g.enabled,
      g.publishTime || publishTime,
    ),
  );
  return `${texts.predictScheduleIntro}\n\n${texts.predictScheduleTimeLine(publishTime)}\n\n${lines.join('\n')}`;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {{ message_id?: number } | null | undefined} loadingMsg
 */
async function dismissScheduleLoadingMessage(ctx, loadingMsg) {
  const chatId = ctx.chat?.id;
  const messageId = loadingMsg?.message_id;
  if (chatId == null || messageId == null) return;
  await ctx.telegram.deleteMessage(chatId, messageId).catch(() => {});
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {Function} getTexts
 * @param {{ edit?: boolean; skipLoading?: boolean }} [opts]
 */
async function renderSchedulePanel(ctx, config, getTexts, opts = {}) {
  const uid = ctx.from?.id;
  if (uid == null) return;
  const texts = getTexts(ctx.from?.language_code || 'en');

  /** @type {{ message_id?: number } | null} */
  let loadingMsg = null;
  if (!opts.skipLoading && !opts.edit) {
    loadingMsg = await ctx.reply(texts.predictScheduleLoading, { parse_mode: 'HTML' }).catch(() => null);
  }

  const remote = await fetchOwnerGroupsFromApi(ctx, config);
  if (remote.authMissing) {
    tgGroupListLog('panel.auth_missing', { telegramId: uid, error: remote.error || null });
    await dismissScheduleLoadingMessage(ctx, loadingMsg);
    await ctx.reply(texts.predictScheduleNeedLogin, { parse_mode: 'HTML' }).catch(() => {});
    return;
  }
  if (!remote.ok && !remote.items.length) {
    tgGroupListLog('panel.fetch_failed', {
      telegramId: uid,
      ok: remote.ok,
      httpStatus: remote.httpStatus,
      errorMessage: remote.errorMessage || remote.error || null,
    });
    await dismissScheduleLoadingMessage(ctx, loadingMsg);
    await ctx.reply(texts.predictScheduleFetchFailed, { parse_mode: 'HTML' }).catch(() => {});
    return;
  }

  const groups = normalizeScheduleGroups(remote.items);
  const publishTime = DEFAULT_PUBLISH_TIME;
  const text = buildSchedulePanelText(texts, groups, publishTime);
  const keyboard = buildSchedulePanelKeyboard(texts, groups);
  const extra = { parse_mode: 'HTML', ...keyboard };

  if (opts.edit && ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, extra);
      return;
    } catch {
      /* fall through */
    }
  }

  await dismissScheduleLoadingMessage(ctx, loadingMsg);
  await ctx.reply(text, extra).catch(async (err) => {
    tgGroupListLog('panel.reply_error', {
      telegramId: uid,
      groupCount: groups.length,
      message: err?.message || String(err),
      description: err?.response?.description,
    });
    await ctx.reply(texts.predictScheduleFetchFailed, { parse_mode: 'HTML' }).catch(() => {});
  });
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {Function} getTexts
 */
async function executePredictScheduleCommand(ctx, config, getTexts) {
  await ctx.telegram.sendChatAction(ctx.chat.id, 'typing').catch(() => {});
  await renderSchedulePanel(ctx, config, getTexts);
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {Function} getTexts
 */
async function handleScheduleRefresh(ctx, config, getTexts) {
  await ctx.answerCbQuery().catch(() => {});
  await renderSchedulePanel(ctx, config, getTexts, { edit: true, skipLoading: true });
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {Function} getTexts
 * @param {number | string} groupId
 * @param {boolean} enabled
 */
async function handleScheduleToggle(ctx, config, getTexts, groupId, enabled) {
  const uid = ctx.from?.id;
  if (uid == null) return;
  const texts = getTexts(ctx.from?.language_code || 'en');

  const loginOpts = buildTelegramLoginOptsFromCtx(ctx);
  const token = await ensureTgUserToken(config, String(uid), loginOpts);
  const auth = token || config.MOZI_DETAIL_AUTH || '';
  if (!auth) {
    await ctx
      .answerCbQuery(texts.predictScheduleNeedLogin, { show_alert: true })
      .catch(() => {});
    return;
  }

  const autoPublishGuess = enabled ? 1 : 0;
  try {
    const saveRes = await postTgStatsGroupSave({
      apiBaseUrl: config.API_BASE_URL,
      auth,
      appUrl: config.APP_URL,
      path: config.TG_GROUP_SAVE_PATH,
      groups: [{ groupId: Number(groupId), autoPublishGuess }],
    });
    if (!saveRes.ok) {
      await ctx
        .answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true })
        .catch(() => {});
      return;
    }
  } catch {
    await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    return;
  }

  const toast = enabled ? texts.predictScheduleEnabledToast : texts.predictScheduleDisabledToast;
  await ctx.answerCbQuery(toast).catch(() => {});
  await renderSchedulePanel(ctx, config, getTexts, { edit: true, skipLoading: true });
}

module.exports = {
  executePredictScheduleCommand,
  handleScheduleRefresh,
  handleScheduleToggle,
  fetchOwnerGroupsFromApi,
  normalizeScheduleGroups,
};
