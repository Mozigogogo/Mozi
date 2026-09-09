import { hasAuthToken, readStoredUserInfo, writeBootstrapSession } from './readStoredUserInfo';

/** 同页内登录/登出后通知各布局同步用户态（storage 事件不触发当前标签页） */
export const MOZI_SESSION_CHANGED = 'mozi:session-changed';

/** WebSocket 监听此事件以用最新 token 重连（见 moziWebSocket.listenTokenUpdates） */
export const MOZI_TOKEN_UPDATED = 'mozi:tokenUpdated';

export function notifySessionChanged() {
  if (typeof window === 'undefined') return;

  // 先对齐首帧缓存，再广播；避免监听方读到退出前的 __MOZI_SESSION__
  let token = null;
  try {
    token = localStorage.getItem('token');
  } catch (_) {}
  const loggedIn = hasAuthToken();
  writeBootstrapSession({
    loggedIn,
    userInfo: loggedIn ? readStoredUserInfo() : null,
  });

  window.dispatchEvent(new CustomEvent(MOZI_SESSION_CHANGED));

  // PC 登录等路径原先只发 session-changed，WS 收不到 token 更新导致大单无法重连鉴权
  window.dispatchEvent(
    new CustomEvent(MOZI_TOKEN_UPDATED, {
      detail: { token },
    })
  );
}
