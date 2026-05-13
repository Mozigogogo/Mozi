'use strict';

const { buildMiniAppUrlWithInvite } = require('./invite');

/**
 * 未登录 / 需绑定时与 /balance 一致的 Mini App 按钮
 * @param {object} config
 * @param {object} texts getTexts(...)
 */
function buildBindAccountKeyboard(config, texts) {
  const appUrl = buildMiniAppUrlWithInvite(config.APP_URL);
  const base = String(config.APP_URL || '').replace(/\/+$/, '');
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: texts.helpOpenAppBtn, web_app: { url: appUrl } }],
        [{ text: texts.helpBindAccountBtn, web_app: { url: `${base}/user` } }],
      ],
    },
  };
}

module.exports = { buildBindAccountKeyboard };
