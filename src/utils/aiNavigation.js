export const AI_NAVIGATION_SHOW_EVENT = 'mozi-ai-navigation-show';
export const AI_NAVIGATION_HIDE_EVENT = 'mozi-ai-navigation-hide';
export const AI_NAVIGATION_READY_EVENT = 'mozi-ai-navigation-ready';

const AI_NAVIGATION_PENDING_KEY = 'mozi_ai_navigation_pending_v1';

export function showAiNavigationShell() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(AI_NAVIGATION_PENDING_KEY, '1');
  } catch (_) {}
  window.dispatchEvent(new Event(AI_NAVIGATION_SHOW_EVENT));
}

export function hideAiNavigationShell() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(AI_NAVIGATION_PENDING_KEY);
  } catch (_) {}
  window.dispatchEvent(new Event(AI_NAVIGATION_HIDE_EVENT));
}

export function notifyAiViewReady() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(AI_NAVIGATION_PENDING_KEY);
  } catch (_) {}
  window.dispatchEvent(new Event(AI_NAVIGATION_READY_EVENT));
}

export function peekAiNavigationPending() {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(AI_NAVIGATION_PENDING_KEY) === '1';
  } catch {
    return false;
  }
}
