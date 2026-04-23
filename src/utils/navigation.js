export function safeBack(router, { fallback = '/', fallbackDelayMs = 250 } = {}) {
  try {
    // WebView / 嵌入场景中，Next router.back() 可能无效；
    // 优先用浏览器 history.back，并在无跳转时自动兜底到 fallback。
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
            if (window.location.href !== currentHref) return;
            if (router?.replace) {
              router.replace(fallback);
              return;
            }
            if (router?.push) {
              router.push(fallback);
            }
          } catch (_) {}
        }, Math.max(0, Number(fallbackDelayMs) || 0));
      }
      return;
    }
  } catch (_) {}

  // fallback：确保用户能离开当前页
  if (router?.replace) {
    router.replace(fallback);
    return;
  }
  if (router?.push) {
    router.push(fallback);
    return;
  }
}

