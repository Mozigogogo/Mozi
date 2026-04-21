export function safeBack(router, { fallback = '/' } = {}) {
  try {
    // Next router.back() 在 TG WebView 里可能无效（history 栈为空/被拦截）
    const canGoBack =
      typeof window !== 'undefined' &&
      typeof window.history !== 'undefined' &&
      typeof window.history.length === 'number' &&
      window.history.length > 1;

    if (canGoBack) {
      router?.back?.();
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

