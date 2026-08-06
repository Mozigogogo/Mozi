'use strict';

/**
 * 高风险消息类型识别：转发 / 贴纸 GIF / 链接 / 邀请 等
 */

function messageText(msg) {
  return msg?.text || msg?.caption || '';
}

function detectLinkFromEntities(msg) {
  const text = messageText(msg);
  if (!String(text).trim()) return null;
  const entities = msg?.entities || msg?.caption_entities;
  if (!Array.isArray(entities) || !entities.length) return null;
  for (const e of entities) {
    if (!e || typeof e !== 'object') continue;
    if (e.type === 'text_link' && e.url) return String(e.url);
    if (e.type === 'url' && Number.isFinite(e.offset) && Number.isFinite(e.length)) {
      return String(text).slice(e.offset, e.offset + e.length);
    }
  }
  return null;
}

function detectLinkFromText(text) {
  const raw = String(text || '');
  if (!raw.trim()) return null;
  const schemeMatch = raw.match(/\b(?:https?:\/\/|ftp:\/\/)[^\s<>()]+/i);
  if (schemeMatch?.[0]) return schemeMatch[0];
  const wwwMatch = raw.match(/\bwww\.[^\s<>()]+/i);
  if (wwwMatch?.[0]) return wwwMatch[0];
  const tMeMatch = raw.match(/\b(?:t\.me|telegram\.me)\/[^\s<>()]+/i);
  if (tMeMatch?.[0]) return tMeMatch[0];
  const domainMatch = raw.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>()]*)?\b/i);
  if (domainMatch?.[0]) {
    const v = domainMatch[0];
    if (v.includes('/') || v.length >= 12) return v;
  }
  return null;
}

function detectAnyLink(msgOrCtx) {
  const msg = msgOrCtx?.message || msgOrCtx;
  const fromEntity = detectLinkFromEntities(msg);
  if (fromEntity) return fromEntity;
  return detectLinkFromText(messageText(msg));
}

function isForwardMessage(msg) {
  if (!msg) return false;
  return Boolean(
    msg.forward_origin ||
      msg.forward_from ||
      msg.forward_from_chat ||
      msg.forward_date ||
      msg.forward_sender_name,
  );
}

function isStickerOrGif(msg) {
  if (!msg) return false;
  if (msg.sticker) return true;
  if (msg.animation) return true;
  const doc = msg.document;
  if (doc?.mime_type && String(doc.mime_type).toLowerCase() === 'image/gif') return true;
  return false;
}

function isInviteLink(urlOrText) {
  const s = String(urlOrText || '').toLowerCase();
  if (!s) return false;
  if (/t\.me\/\+/.test(s)) return true;
  if (/t\.me\/joinchat\//.test(s)) return true;
  if (/telegram\.me\/\+/.test(s)) return true;
  if (/telegram\.me\/joinchat\//.test(s)) return true;
  return false;
}

/**
 * 观察期仅允许：纯文本 / 图片（非转发）
 * @returns {{ allowed: boolean; reason: string | null }}
 */
function classifyObserveMessage(msg) {
  if (!msg) return { allowed: false, reason: 'empty' };

  if (isForwardMessage(msg)) return { allowed: false, reason: 'forward' };
  if (isStickerOrGif(msg)) return { allowed: false, reason: 'sticker_gif' };
  if (msg.video || msg.video_note) return { allowed: false, reason: 'video' };
  if (msg.voice || msg.audio) return { allowed: false, reason: 'audio' };
  if (msg.contact) return { allowed: false, reason: 'contact' };
  if (msg.poll || msg.dice) return { allowed: false, reason: 'poll_dice' };
  if (msg.location || msg.venue) return { allowed: false, reason: 'location' };
  if (msg.game) return { allowed: false, reason: 'game' };

  const link = detectAnyLink(msg);
  if (link) {
    if (isInviteLink(link)) return { allowed: false, reason: 'invite_link' };
    return { allowed: false, reason: 'link' };
  }

  // document（非 gif）也不允许
  if (msg.document && !msg.photo) return { allowed: false, reason: 'document' };

  // 允许：纯文本
  if (msg.text && !msg.photo && !msg.video && !msg.document && !msg.animation && !msg.sticker) {
    return { allowed: true, reason: null };
  }
  // 允许：图片（可带 caption，且 caption 无链接已在上面拦截）
  if (msg.photo) return { allowed: true, reason: null };

  return { allowed: false, reason: 'other' };
}

module.exports = {
  detectAnyLink,
  detectLinkFromEntities,
  detectLinkFromText,
  isForwardMessage,
  isStickerOrGif,
  isInviteLink,
  classifyObserveMessage,
};
