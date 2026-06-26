/**
 * 从消息文本解析 /ai、/chat 后的内容（支持 /ai@BotName、/chat@BotName）
 */

function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} text
 * @param {string} botUsername 无 @
 */
function extractAiQuery(text, botUsername) {
  const u = escapeRegex(botUsername);
  const re = u
    ? new RegExp(`^/ai(?:@${u})?\\s*(.*)$`, 'is')
    : /^\/ai\s*(.*)$/is;
  const m = String(text || '').match(re);
  return m ? m[1].trim() : '';
}

/**
 * @param {string} text
 * @param {string} botUsername 无 @
 */
function extractChatQuery(text, botUsername) {
  const u = escapeRegex(botUsername);
  const re = u
    ? new RegExp(`^/chat(?:@${u})?\\s*(.*)$`, 'is')
    : /^\/chat\s*(.*)$/is;
  const m = String(text || '').match(re);
  return m ? m[1].trim() : '';
}

/**
 * @param {string} text
 * @param {string} botUsername 无 @
 */
function extractBigorderQuery(text, botUsername) {
  const u = escapeRegex(botUsername);
  const re = u
    ? new RegExp(`^/bigorder(?:@${u})?\\s*(.*)$`, 'is')
    : /^\/bigorder\s*(.*)$/is;
  const m = String(text || '').match(re);
  return m ? m[1].trim() : '';
}

/**
 * /bot 自然语言（群内替代 @ 提及）
 * @param {string} text
 * @param {string} botUsername 无 @
 */
function extractBotQuery(text, botUsername) {
  const u = escapeRegex(botUsername);
  const re = u
    ? new RegExp(`^/bot(?:@${u})?\\s*(.*)$`, 'is')
    : /^\/bot\s*(.*)$/is;
  const m = String(text || '').match(re);
  return m ? m[1].trim() : '';
}

module.exports = { extractAiQuery, extractChatQuery, extractBigorderQuery, extractBotQuery };
