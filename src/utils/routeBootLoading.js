export const ROUTE_BOOT_LOADING_KEY = 'mozi_route_boot_loading_v1';
export const ROUTE_BOOT_START_EVENT = 'mozi-route-boot-start';
export const ROUTE_BOOT_READY_EVENT = 'mozi-route-boot-ready';

export const ROUTE_BOOT_LOGO =
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/community/loadding.png';

export function markRouteBootLoading(pathname) {
  if (typeof window === 'undefined' || !pathname) return;
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
