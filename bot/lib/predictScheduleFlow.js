'use strict';

const { Markup } = require('telegraf');
const { isTelegramUserGroupCreator } = require('./groupOwnerReferrer');
const { ensureTgUserToken } = require('./tgUserTokenCache');
const { getCoinDirectionGuessScheduleMy, putCoinDirectionGuessScheduleSave } = require('./apis');
const {
  listScheduleGroupsForOwner,
  getLocalScheduleConfig,
  setLocalScheduleConfig,
  DEFAULT_PUBLISH_TIME,
} = require('./predictScheduleStore');

/**
 * @param {import('telegraf').Context} ctx
 */
function loginOptsFromCtx(ctx) {
  const from = ctx.from || {};
  return {
    telegramUsername: from.username || '',
    firstName: from.first_name || '',
    lastName: from.last_name || '',
  };
}

/**
 * @param {object} config
 * @param {number | string} uid
 * @param {object} loginOpts
 */
async function fetchRemoteSchedules(config, uid, loginOpts) {
  const token = await ensureTgUserToken(config, String(uid), loginOpts);
  if (!token) return { ok: false, items: [] };
  const res = await getCoinDirectionGuessScheduleMy({
    apiBaseUrl: config.API_BASE_URL,
    auth: token,
    appUrl: config.APP_URL,
    telegramId: uid,
    path: config.COIN_DIRECTION_GUESS_SCHEDULE_MY_PATH,
  });
  return { ok: res.ok, items: res.items || [] };
}

/**
 * @param {object[]} localGroups
 * @param {object[]} remoteItems
 */
function mergeOwnerScheduleGroups(localGroups, remoteItems) {
  /** @type {Map<number, { groupId: number; groupTitle: string; enabled: boolean; publishTime: string }>} */
  const map = new Map();

  for (const g of localGroups) {
    const id = Number(g.groupId);
    if (!Number.isFinite(id)) continue;
    const localCfg = getLocalScheduleConfig(id);
    map.set(id, {
      groupId: id,
      groupTitle: String(g.groupTitle || '').trim() || `群 ${id}`,
      enabled: Boolean(localCfg?.enabled),
      publishTime: String(localCfg?.publishTime || DEFAULT_PUBLISH_TIME),
    });
  }

  for (const item of remoteItems) {
    const id = Number(item.groupId);
    if (!Number.isFinite(id)) continue;
    const prev = map.get(id) || {
      groupId: id,
      groupTitle: `群 ${id}`,
      enabled: false,
      publishTime: DEFAULT_PUBLISH_TIME,
    };
    map.set(id, {
      groupId: id,
      groupTitle: String(item.groupTitle || prev.groupTitle || `群 ${id}`).trim(),
      enabled: item.enabled != null ? Boolean(item.enabled) : prev.enabled,
      publishTime: String(item.publishTime || prev.publishTime || DEFAULT_PUBLISH_TIME),
    });
  }

  return Array.from(map.values()).sort(
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
  const loginOpts = loginOptsFromCtx(ctx);

  const localGroups = listScheduleGroupsForOwner(uid);
  const remote = await fetchRemoteSchedules(config, uid, loginOpts);
  const groups = mergeOwnerScheduleGroups(localGroups, remote.items);
  const publishTime = groups.find((g) => g.publishTime)?.publishTime || DEFAULT_PUBLISH_TIME;

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

  const isOwner = await isTelegramUserGroupCreator(ctx.telegram, groupId, uid);
  if (!isOwner) {
    await ctx
      .answerCbQuery(texts.predictScheduleNotOwnerToast, { show_alert: true })
      .catch(() => {});
    return;
  }

  const localCfg = getLocalScheduleConfig(groupId);
  const publishTime = String(localCfg?.publishTime || DEFAULT_PUBLISH_TIME);
  setLocalScheduleConfig({ groupId, ownerTelegramId: uid, enabled, publishTime });

  const token = await ensureTgUserToken(config, String(uid), loginOptsFromCtx(ctx));
  if (token) {
    await putCoinDirectionGuessScheduleSave({
      apiBaseUrl: config.API_BASE_URL,
      auth: token,
      appUrl: config.APP_URL,
      groupId,
      enabled,
      publishTime,
      path: config.COIN_DIRECTION_GUESS_SCHEDULE_SAVE_PATH,
    }).catch(() => {});
  }

  const toast = enabled ? texts.predictScheduleEnabledToast : texts.predictScheduleDisabledToast;
  await ctx.answerCbQuery(toast).catch(() => {});
  await renderSchedulePanel(ctx, config, getTexts, { edit: true });
}

module.exports = {
  executePredictScheduleCommand,
  handleScheduleRefresh,
  handleScheduleToggle,
};
