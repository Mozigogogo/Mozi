/** 会话内详情页 surface boot 是否已完成（首屏遮罩只做一次） */
export const DETAIL_SURFACE_BOOT_KEY = 'mozi_detail_surface_boot_done_v1';

export function peekDetailSurfaceBootDone() {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(DETAIL_SURFACE_BOOT_KEY) === '1';
  } catch {
    return false;
  }
}

export function markDetailSurfaceBootDone() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(DETAIL_SURFACE_BOOT_KEY, '1');
  } catch (_) {}
}
