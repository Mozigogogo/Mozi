/**
 * 深链与群内按钮：注册(callback) / 启动(打开私聊 /start)
 */

const REGISTER_START_PAYLOAD = 'register';

/**
 * @param {string} [payload]
 * @returns {boolean}
 */
function isRegisterStartPayload(payload) {
  if (!payload || typeof payload !== 'string') return false;
  return String(payload).trim().toLowerCase() === REGISTER_START_PAYLOAD;
}

/**
 * @param {string} botUsername 无 @
 * @returns {string}
 */
function buildRegisterPrivateUrl(botUsername) {
  const name = String(botUsername || '').replace(/^@/, '');
  return `https://t.me/${name}?start=${REGISTER_START_PAYLOAD}`;
}

/**
 * 打开私聊并触发 /start（无 payload，等同用户发送 /start）
 * @param {string} botUsername
 * @returns {string}
 */
function buildStartPrivateUrl(botUsername) {
  const name = String(botUsername || '').replace(/^@/, '');
  return `https://t.me/${name}`;
}

/**
 * 已与 Bot 私聊过：群内「注册」→ 直接调 API
 * @param {{ bindRegisterBtn?: string }} texts
 */
function buildGroupRegisterKeyboard(texts) {
  const { CALLBACK_MOZI_REGISTER } = require('./tgBotRegisterApi');
  const label = texts?.bindRegisterBtn || '注册';
  return {
    inline_keyboard: [[{ text: label, callback_data: CALLBACK_MOZI_REGISTER }]],
  };
}

/**
 * 未与 Bot 私聊过：群内「启动」→ 打开私聊 /start
 * @param {string} botUsername
 * @param {{ bindStartBtn?: string }} texts
 */
function buildGroupStartKeyboard(botUsername, texts) {
  const label = texts?.bindStartBtn || '启动';
  return {
    inline_keyboard: [[{ text: label, url: buildStartPrivateUrl(botUsername) }]],
  };
}

module.exports = {
  REGISTER_START_PAYLOAD,
  isRegisterStartPayload,
  buildRegisterPrivateUrl,
  buildStartPrivateUrl,
  buildGroupRegisterKeyboard,
  buildGroupStartKeyboard,
};
