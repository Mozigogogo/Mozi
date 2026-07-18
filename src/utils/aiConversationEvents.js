/** AI 对话结束后通知侧栏刷新会话列表 */
export const MOZI_AI_CONVERSATIONS_CHANGED = 'mozi:ai-conversations-changed';

export function notifyAiConversationsChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MOZI_AI_CONVERSATIONS_CHANGED));
}
