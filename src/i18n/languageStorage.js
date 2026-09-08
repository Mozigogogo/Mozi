export const I18N_COOKIE_KEY = 'i18nextLng';
export const I18N_STORAGE_KEY = 'i18nextLng';
/** 与历史 SSR 默认一致：无偏好时用 en，不因刷新改产品默认语言 */
export const I18N_SSR_DEFAULT_LNG = 'en';

export function normalizeLng(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).toLowerCase();
  if (s.startsWith('zh')) return 'zh';
  if (s.startsWith('en')) return 'en';
  return null;
}

export function htmlLangFor(lng) {
  return lng === 'zh' ? 'zh-CN' : 'en';
}

/** 写入 localStorage + cookie，刷新后 SSR 能读到同一语言 */
export function persistLanguage(lng) {
  const next = normalizeLng(lng) || I18N_SSR_DEFAULT_LNG;
  if (typeof window === 'undefined') return next;
  try {
    localStorage.setItem(I18N_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  try {
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${I18N_COOKIE_KEY}=${encodeURIComponent(next)};path=/;max-age=${maxAge};samesite=lax`;
  } catch {
    /* ignore */
  }
  try {
    document.documentElement.lang = htmlLangFor(next);
  } catch {
    /* ignore */
  }
  try {
    window.__MOZI_I18N_LNG__ = next;
  } catch {
    /* ignore */
  }
  return next;
}

export function readStoredLanguage() {
  if (typeof window === 'undefined') return null;
  try {
    const fromWindow =
      typeof window.__MOZI_I18N_LNG__ === 'string' ? window.__MOZI_I18N_LNG__ : null;
    return (
      normalizeLng(fromWindow) ||
      normalizeLng(localStorage.getItem(I18N_STORAGE_KEY)) ||
      null
    );
  } catch {
    return null;
  }
}

export function readLanguageFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  const match = String(cookieHeader).match(/(?:^|;\s*)i18nextLng=([^;]+)/);
  if (!match) return null;
  try {
    return normalizeLng(decodeURIComponent(match[1]));
  } catch {
    return normalizeLng(match[1]);
  }
}
