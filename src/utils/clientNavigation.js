export const CLIENT_NAVIGATE_EVENT = 'mozi-client-navigate';
export const DETAIL_NAVIGATION_SHOW_EVENT = 'mozi-detail-navigation-show';
export const DETAIL_NAVIGATION_HIDE_EVENT = 'mozi-detail-navigation-hide';
export const ENABLE_DETAIL_NAVIGATION_SHELL = false;

/** @deprecated 使用 CLIENT_NAVIGATE_EVENT */
export const DETAIL_NAVIGATE_EVENT = CLIENT_NAVIGATE_EVENT;

const DETAIL_NAVIGATION_SYMBOL_KEY = 'mozi_detail_navigation_symbol_v1';

function normalizeInternalUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '';
  return trimmed;
}

function extractSymbolFromUrl(url) {
  try {
    const query = url.split('?')[1] || '';
    const symbol = new URLSearchParams(query).get('symbol');
    return symbol ? String(symbol).toUpperCase() : '';
  } catch {
    return '';
  }
}

function isDetailPath(url) {
  const path = normalizeInternalUrl(url).split('?')[0];
  return path === '/detail';
}

function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  try {
    return !window.matchMedia('(min-width: 1024px)').matches;
  } catch {
    return true;
  }
}

export function showDetailNavigationShell(symbol = '') {
  if (typeof window === 'undefined') return;
  if (!ENABLE_DETAIL_NAVIGATION_SHELL) return;
  const normalized = String(symbol || '').toUpperCase();
  try {
    if (normalized) {
      sessionStorage.setItem(DETAIL_NAVIGATION_SYMBOL_KEY, normalized);
    }
  } catch (_) {}
  window.dispatchEvent(
    new CustomEvent(DETAIL_NAVIGATION_SHOW_EVENT, {
      detail: { symbol: normalized },
    })
  );
}

export function hideDetailNavigationShell() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(DETAIL_NAVIGATION_SYMBOL_KEY);
  } catch (_) {}
  window.dispatchEvent(new Event(DETAIL_NAVIGATION_HIDE_EVENT));
}

export function peekDetailNavigationSymbol() {
  if (typeof window === 'undefined') return '';
  if (!ENABLE_DETAIL_NAVIGATION_SHELL) return '';
  try {
    return sessionStorage.getItem(DETAIL_NAVIGATION_SYMBOL_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * 客户端路由跳转（由 ClientNavigationBridge 接管）。
 * @param {string} url
 * @param {{ replace?: boolean, symbol?: string, detailShell?: boolean }} [options]
 * @returns {boolean}
 */
export function navigateTo(url, options = {}) {
  if (typeof window === 'undefined' || !url) return false;

  const path = normalizeInternalUrl(url);
  if (!path) return false;

  if ((options.detailShell || isDetailPath(path)) && isMobileViewport()) {
    showDetailNavigationShell(options.symbol || extractSymbolFromUrl(path));
  }

  let handled = false;
  window.dispatchEvent(
    new CustomEvent(CLIENT_NAVIGATE_EVENT, {
      detail: {
        url: path,
        replace: Boolean(options.replace),
        setHandled() {
          handled = true;
        },
      },
    })
  );

  return handled;
}

/**
 * 优先客户端路由；桥未就绪时回退到 location（避免点击无响应）。
 */
export function navigateToOrReload(url, options = {}) {
  if (typeof window === 'undefined' || !url) return;

  const path = normalizeInternalUrl(url);
  if (path && navigateTo(path, options)) return;

  const target = path || url;
  if (options.replace) window.location.replace(target);
  else window.location.assign(target);
}

export function requestDetailNavigation(url, symbol = '') {
  return navigateTo(url, { symbol, detailShell: true });
}
