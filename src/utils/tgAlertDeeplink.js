/**
 * TG Mini App 告警深链（startapp=alert_BTC）在整个会话内 startParam 不会消失。
 * 若仅用 useRef 标记「已处理」，整页跳转（如 jump2NoTab）后会再次强制进详情并弹窗。
 * 用 sessionStorage 记录已消费的 startParam，避免重复重定向。
 */

export const TG_ALERT_DEEPLINK_STORAGE_KEY = 'tgAlertDeeplinkHandled';
export const ALERT_STARTAPP_RE = /^alert_([A-Za-z0-9_-]+)$/;

export function getHandledTgAlertStartParam() {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage?.getItem(TG_ALERT_DEEPLINK_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

/** @param {string} startParam e.g. alert_ETH */
export function markTgAlertDeeplinkHandled(startParam) {
  const raw = String(startParam || '').trim();
  if (!raw || typeof window === 'undefined') return;
  try {
    window.sessionStorage?.setItem(TG_ALERT_DEEPLINK_STORAGE_KEY, raw);
  } catch {
    /* ignore */
  }
}

/** @param {string} symbol */
export function markTgAlertDeeplinkHandledBySymbol(symbol) {
  const sym = String(symbol || '')
    .trim()
    .toUpperCase();
  if (!sym) return;
  markTgAlertDeeplinkHandled(`alert_${sym}`);
}

/** 当前 startParam 是否已消费过（不应再强制进详情） */
export function isTgAlertDeeplinkHandled(startParam) {
  const raw = String(startParam || '').trim();
  if (!raw) return false;
  return getHandledTgAlertStartParam() === raw;
}
