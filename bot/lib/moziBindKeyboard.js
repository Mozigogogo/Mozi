'use strict';

const { buildMiniAppUrlWithInvite } = require('./invite');

/**
 * 未登录 / 需绑定时与 /balance 一致的 Mini App 按钮
 * @param {object} config
 * @param {object} texts getTexts(...)
 * @param {{ inviteCode?: string } | null} [groupReferrer] 群内已绑定推广人
 */
function buildBindAccountKeyboard(config, texts, groupReferrer = null) {
  const inviteCode = groupReferrer?.inviteCode || '';
  const appUrl = buildMiniAppUrlWithInvite(config.APP_URL, inviteCode || undefined);
  const base = String(config.APP_URL || '').replace(/\/+$/, '');
  const userUrl = inviteCode
    ? buildMiniAppUrlWithInvite(`${base}/user`, inviteCode)
    : `${base}/user`;
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: texts.helpOpenAppBtn, web_app: { url: appUrl } }],
        [{ text: texts.helpBindAccountBtn, web_app: { url: userUrl } }],
      ],
    },
  };
}

module.exports = { buildBindAccountKeyboard };
