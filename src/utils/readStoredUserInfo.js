/**
 * 侧栏登录态：必须以 localStorage 为准。
 * - 是否登录：看 token
 * - 展示资料：优先 userInfo，其次 userDataInfo.userInfo / 顶层字段
 */

export function hasAuthToken() {
  if (typeof window === 'undefined') return false;
  try {
    return !!localStorage.getItem('token');
  } catch {
    return false;
  }
}

export function readStoredUserInfo() {
  if (typeof window === 'undefined') return null;
  try {
    // 1) 登录写入的 userInfo（权威展示源）
    const storedUser = localStorage.getItem('userInfo');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed && typeof parsed === 'object') return parsed;
    }

    // 2) datainfo 缓存兜底
    const rawData = localStorage.getItem('userDataInfo');
    if (rawData) {
      const data = JSON.parse(rawData);
      if (!data || typeof data !== 'object') return null;
      const nested =
        data.userInfo && typeof data.userInfo === 'object' ? data.userInfo : null;
      const nickName =
        nested?.nickName || nested?.nickname || data.nickName || data.nickname || '';
      const avatar = nested?.avatar || data.avatar || '';
      const userId = nested?.userId || nested?.id || data.userId || data.id || null;
      if (nested || nickName || avatar || userId) {
        return {
          ...(nested || {}),
          nickName: nickName || nested?.nickName,
          nickname: nested?.nickname || nickName,
          avatar: avatar || nested?.avatar,
          userId,
          inviteCode: nested?.inviteCode || data.inviteCode,
        };
      }
    }
  } catch (_) {}
  return null;
}

/** 优先读 SessionInitScript 写入的 window.__MOZI_SESSION__，否则现场读 localStorage */
export function readBootstrapSession() {
  if (typeof window === 'undefined') {
    return { ready: false, loggedIn: false, userInfo: null };
  }
  try {
    const boot = window.__MOZI_SESSION__;
    if (boot && boot.ready) {
      return {
        ready: true,
        loggedIn: !!boot.loggedIn,
        userInfo: boot.loggedIn ? boot.userInfo || readStoredUserInfo() : null,
      };
    }
  } catch (_) {}
  const loggedIn = hasAuthToken();
  return {
    ready: true,
    loggedIn,
    userInfo: loggedIn ? readStoredUserInfo() : null,
  };
}
