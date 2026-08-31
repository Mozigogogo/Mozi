'use strict';

/**
 * /config 群配置中心：入口菜单（定时推送 / 新成员验证 / 防刷屏与观察期 / 违禁词）
 */

const { Markup } = require('telegraf');

/**
 * @param {object} texts
 */
function buildGroupSettingsHubKeyboard(texts) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(texts.groupSettingsScheduleBtn, 'gs:ps')],
    [Markup.button.callback(texts.groupSettingsJoinVerifyBtn, 'gs:jv')],
    [Markup.button.callback(texts.groupSettingsFloodObserveBtn, 'gs:fo')],
    [Markup.button.callback(texts.groupSettingsSecurityBtn, 'gs:sc')],
    [Markup.button.callback(texts.groupSettingsWordFilterBtn, 'gs:wf')],
  ]);
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {Function} getTexts
 * @param {{ edit?: boolean }} [opts]
 */
async function renderGroupSettingsHub(ctx, getTexts, opts = {}) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  const text = texts.groupSettingsHubIntro;
  const extra = { parse_mode: 'HTML', ...buildGroupSettingsHubKeyboard(texts) };

  if (opts.edit && ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, extra);
      return;
    } catch {
      /* fall through */
    }
  }
  await ctx.reply(text, extra).catch(() => {});
}

/**
 * /config 命令入口 → 配置中心
 * @param {import('telegraf').Context} ctx
 * @param {object} _config
 * @param {Function} getTexts
 */
async function executeGroupSettingsCommand(ctx, _config, getTexts) {
  await ctx.telegram.sendChatAction(ctx.chat.id, 'typing').catch(() => {});
  await renderGroupSettingsHub(ctx, getTexts);
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {Function} getTexts
 */
async function handleGroupSettingsHome(ctx, getTexts) {
  await ctx.answerCbQuery().catch(() => {});
  await renderGroupSettingsHub(ctx, getTexts, { edit: true });
}

module.exports = {
  executeGroupSettingsCommand,
  renderGroupSettingsHub,
  handleGroupSettingsHome,
  buildGroupSettingsHubKeyboard,
};
