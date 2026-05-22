/**
 * 注册深链：/start register → 与 /register 私聊流程一致
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

module.exports = {
  REGISTER_START_PAYLOAD,
  isRegisterStartPayload,
  buildRegisterPrivateUrl,
};
