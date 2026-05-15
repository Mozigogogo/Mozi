'use strict';

/**
 * Mini App 打开积分明细页（与 /balance 账单按钮同路由）
 * @param {object} config
 * @param {string} buttonText
 */
function pointsDetailMiniAppKeyboard(config, buttonText) {
  const base = String(config.APP_URL || '').replace(/\/+$/, '');
  return {
    reply_markup: {
      inline_keyboard: [[{ text: buttonText, web_app: { url: `${base}/pointsdetail` } }]],
    },
  };
}

/** 积分不足：社区赚积分 + 积分明细（与 /balance 按钮路由一致） */
function insufficientPointsEarnKeyboard(config, texts) {
  const base = String(config.APP_URL || '').replace(/\/+$/, '');
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: texts.balanceBtnPost, web_app: { url: `${base}/community` } }],
        [{ text: texts.balanceBtnBill, web_app: { url: `${base}/pointsdetail` } }],
      ],
    },
  };
}

module.exports = { pointsDetailMiniAppKeyboard, insufficientPointsEarnKeyboard };
