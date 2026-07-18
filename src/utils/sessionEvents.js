/** 同页内登录/登出后通知各布局同步用户态（storage 事件不触发当前标签页） */
export const MOZI_SESSION_CHANGED = 'mozi:session-changed';

export function notifySessionChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MOZI_SESSION_CHANGED));
}
