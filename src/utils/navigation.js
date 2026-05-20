import { getAppChannel } from './core';

const TG_BACK_FALLBACK = '/home';

/** TG 端不允许返回到营销根路径 `/`，统一落到应用首页 */
function isMarketingRootPath(pathname) {
  if (!pathname) return false;
  return pathname === '/' || pathname === '';
}

function resolveFallback(userFallback) {
  const fb = userFallback ?? '/';
  if (typeof window === 'undefined') return fb;
  if (getAppChannel() === 'tg') {
    if (!fb || fb === '/') return TG_BACK_FALLBACK;
  }
  return fb;
}

/**
 * @param {import('next/navigation').AppRouterInstance} router
 * @param {{ fallback?: string, fallbackDelayMs?: number }} [options]
 */
export function safeBack(router, { fallback = '/', fallbackDelayMs = 250 } = {}) {
  const resolvedFallback = resolveFallback(fallback);
  const isTg = typeof window !== 'undefined' && getAppChannel() === 'tg';

  try {
    const currentHref = typeof window !== 'undefined' ? window.location.href : '';
    const canGoBack =
      typeof window !== 'undefined' &&
      typeof window.history !== 'undefined' &&
      typeof window.history.length === 'number' &&
      window.history.length > 1;

    if (canGoBack) {
      window.history.back();
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          try {
            // history.back() 后地址未变：兜底
            if (window.location.href === currentHref) {
              if (router?.replace) {
                router.replace(resolvedFallback);
              } else if (router?.push) {
                router.push(resolvedFallback);
              }
              return;
            }
            // TG：若返回到营销落地页 `/`，改为 `/home`
            if (isTg && isMarketingRootPath(window.location.pathname)) {
              if (router?.replace) {
                router.replace(TG_BACK_FALLBACK);
              } else if (router?.push) {
                router.push(TG_BACK_FALLBACK);
              }
            }
          } catch (_) {}
        }, Math.max(0, Number(fallbackDelayMs) || 0));
      }
      return;
    }
  } catch (_) {}

  if (router?.replace) {
    router.replace(resolvedFallback);
    return;
  }
  if (router?.push) {
    router.push(resolvedFallback);
  }
}
