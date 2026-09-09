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

/** 把内存中的首帧会话缓存与 localStorage 对齐（登出后必须清掉，否则侧栏会读到旧用户） */
export function writeBootstrapSession({ loggedIn, userInfo } = {}) {
  if (typeof window === 'undefined') return;
  const nextLoggedIn = !!loggedIn;
  try {
    window.__MOZI_SESSION__ = {
      ready: true,
      loggedIn: nextLoggedIn,
      userInfo: nextLoggedIn ? userInfo || null : null,
    };
  } catch (_) {}
}

/**
 * 读会话：登录与否一律以 localStorage.token 为准。
 * window.__MOZI_SESSION__ 只作首帧展示加速，不能覆盖已登出的 token 状态。
 */
export function readBootstrapSession() {
  if (typeof window === 'undefined') {
    return { ready: false, loggedIn: false, userInfo: null };
  }

  const loggedIn = hasAuthToken();
  let userInfo = null;

  if (loggedIn) {
    try {
      const boot = window.__MOZI_SESSION__;
      if (boot?.ready && boot.loggedIn && boot.userInfo) {
        userInfo = boot.userInfo;
      }
    } catch (_) {}
    if (!userInfo) {
      userInfo = readStoredUserInfo();
    }
  }

  // 纠正过期的首帧缓存（例如退出后 token 已清，但 __MOZI_SESSION__ 仍为已登录）
  try {
    const boot = window.__MOZI_SESSION__;
    if (!boot || boot.ready !== true || !!boot.loggedIn !== loggedIn) {
      writeBootstrapSession({ loggedIn, userInfo });
    } else if (loggedIn && !boot.userInfo && userInfo) {
      writeBootstrapSession({ loggedIn, userInfo });
    }
  } catch (_) {}

  return {
    ready: true,
    loggedIn,
    userInfo: loggedIn ? userInfo : null,
  };
}
