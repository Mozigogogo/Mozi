export const ROUTE_BOOT_LOADING_KEY = 'mozi_route_boot_loading_v1';
export const ROUTE_BOOT_START_EVENT = 'mozi-route-boot-start';
export const ROUTE_BOOT_READY_EVENT = 'mozi-route-boot-ready';

export const ROUTE_BOOT_LOGO =
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/community/loadding.png';

/** 这些路由有页内壳/骨架，勿盖全屏 LogoLoading */
export function shouldSkipRouteBootLoading(pathname) {
  const path = String(pathname || '').split('?')[0] || '';
  if (!path) return true;
  if (path === '/detail') return true;
  if (path === '/ai' || path.startsWith('/ai/')) return true;
  if (path === '/home' || path.startsWith('/home/')) return true;
  // PC 壳内页：侧栏已在，全屏 Logo 只会白闪
  if (path === '/pc' || path.startsWith('/pc/')) return true;
  return false;
}

export function markRouteBootLoading(pathname) {
  if (typeof window === 'undefined' || !pathname) return;
  if (shouldSkipRouteBootLoading(pathname)) return;
  try {
    sessionStorage.setItem(ROUTE_BOOT_LOADING_KEY, pathname);
    window.dispatchEvent(new Event(ROUTE_BOOT_START_EVENT));
  } catch (_) {}
}

export function clearRouteBootLoading() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(ROUTE_BOOT_LOADING_KEY);
  } catch (_) {}
}

export function peekRouteBootLoading() {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(ROUTE_BOOT_LOADING_KEY);
  } catch (_) {
    return null;
  }
}

export function notifyRouteBootReady() {
  if (typeof window === 'undefined') return;
  clearRouteBootLoading();
  window.dispatchEvent(new Event(ROUTE_BOOT_READY_EVENT));
}

export function pathMatchesBootTarget(currentPath, targetPath) {
  if (!currentPath || !targetPath) return false;
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

/**
 * 内部路由跳转前标记 Logo loading，避免首屏白屏等待。
 */
export function pushWithRouteBootLoading(router, href, { replace = false } = {}) {
  if (!router || href == null) return;
  const nextHref = String(href);
  if (nextHref.startsWith('/')) {
    try {
      const pathname = nextHref.split('?')[0] || '/';
      markRouteBootLoading(pathname);
    } catch (_) {}
  }
  if (replace) router.replace(nextHref);
  else router.push(nextHref);
}
