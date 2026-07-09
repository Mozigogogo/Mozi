'use strict';

const { Markup } = require('telegraf');
const { ensureTgUserToken } = require('./tgUserTokenCache');
const { getTgStatsGroupListByTelegramId, postTgStatsGroupSave } = require('./apis');
const { buildTelegramLoginOptsFromCtx } = require('./datainfoPoints');
const { DEFAULT_PUBLISH_TIME } = require('./predictScheduleStore');

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 */
async function fetchOwnerGroupsFromApi(ctx, config) {
  const uid = ctx.from?.id;
  if (uid == null) return { ok: false, items: [] };

  const loginOpts = buildTelegramLoginOptsFromCtx(ctx);
  const token = await ensureTgUserToken(config, String(uid), loginOpts);
  const auth = token || config.MOZI_DETAIL_AUTH || '';
  if (!auth) return { ok: false, items: [] };

  try {
    const res = await getTgStatsGroupListByTelegramId({
      apiBaseUrl: config.API_BASE_URL,
      telegramId: uid,
      auth,
      appUrl: config.APP_URL,
      path: config.TG_GROUP_LIST_BY_TELEGRAM_ID_PATH,
    });
    return { ok: res.ok, items: res.items || [] };
  } catch {
    return { ok: false, items: [] };
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
    const title = String(g.groupTitle || g.groupId);
    const label = g.enabled
      ? texts.predictScheduleBtnOn(title)
      : texts.predictScheduleBtnOff(title);
    const data = `ps:t:${g.groupId}:${g.enabled ? 0 : 1}`;
    return [Markup.button.callback(label, data)];
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
    texts.predictScheduleGroupLine(g.groupTitle || String(g.groupId), g.enabled, g.publishTime || publishTime),
  );
  return `${texts.predictScheduleIntro}\n\n${texts.predictScheduleTimeLine(publishTime)}\n\n${lines.join('\n')}`;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {Function} getTexts
 * @param {{ edit?: boolean }} [opts]
 */
async function renderSchedulePanel(ctx, config, getTexts, opts = {}) {
  const uid = ctx.from?.id;
  if (uid == null) return;
  const texts = getTexts(ctx.from?.language_code || 'en');

  const remote = await fetchOwnerGroupsFromApi(ctx, config);
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
  await ctx.reply(text, extra);
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {Function} getTexts
 */
async function executePredictScheduleCommand(ctx, config, getTexts) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  if (ctx.chat?.type !== 'private') {
    await ctx.reply(texts.predictSchedulePrivateOnly, { parse_mode: 'HTML' });
    return;
  }
  await renderSchedulePanel(ctx, config, getTexts);
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {Function} getTexts
 */
async function handleScheduleRefresh(ctx, config, getTexts) {
  await ctx.answerCbQuery().catch(() => {});
  await renderSchedulePanel(ctx, config, getTexts, { edit: true });
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
      .answerCbQuery(texts.predictScheduleNotOwnerToast, { show_alert: true })
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
        .answerCbQuery(texts.predictScheduleNotOwnerToast, { show_alert: true })
        .catch(() => {});
      return;
    }
  } catch {
    await ctx.answerCbQuery(texts.predictScheduleNotOwnerToast, { show_alert: true }).catch(() => {});
    return;
  }

  const toast = enabled ? texts.predictScheduleEnabledToast : texts.predictScheduleDisabledToast;
  await ctx.answerCbQuery(toast).catch(() => {});
  await renderSchedulePanel(ctx, config, getTexts, { edit: true });
}

module.exports = {
  executePredictScheduleCommand,
  handleScheduleRefresh,
  handleScheduleToggle,
  fetchOwnerGroupsFromApi,
  normalizeScheduleGroups,
};
