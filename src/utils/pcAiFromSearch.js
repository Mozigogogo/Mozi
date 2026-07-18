/** PC 顶栏搜索框 → AI 问答：session 传递币种，进入 /ai 后自动提问 */
export const PC_AI_FROM_SEARCH_KEY = 'mozi_pc_ai_from_search_v1';

/** PC 发现页等 → /ai：指定模型与首条提问 */
export const PC_AI_NAV_KEY = 'mozi_pc_ai_nav_v1';

export function savePcAiFromSearch(symbol) {
  if (typeof window === 'undefined') return;
  const trimmed = String(symbol || '').trim();
  if (!trimmed) return;
  try {
    sessionStorage.setItem(
      PC_AI_FROM_SEARCH_KEY,
      JSON.stringify({ symbol: trimmed, ts: Date.now() })
    );
  } catch {
    // ignore
  }
}

/** @returns {{ symbol: string } | null} */
export function consumePcAiFromSearch() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PC_AI_FROM_SEARCH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PC_AI_FROM_SEARCH_KEY);
    const parsed = JSON.parse(raw);
    const symbol = String(parsed?.symbol || '').trim();
    if (!symbol) return null;
    return { symbol };
  } catch {
    sessionStorage.removeItem(PC_AI_FROM_SEARCH_KEY);
    return null;
  }
}

const VALID_AI_NAV_MODELS = new Set(['analyze', 'chat', 'signals', 'bigorder']);

/** @param {{ model?: 'analyze'|'chat'|'signals'|'bigorder', message: string }} payload */
export function savePcAiNav(payload) {
  if (typeof window === 'undefined') return;
  const message = String(payload?.message || '').trim();
  if (!message) return;
  const model = payload?.model;
  try {
    sessionStorage.setItem(
      PC_AI_NAV_KEY,
      JSON.stringify({
        model: VALID_AI_NAV_MODELS.has(model) ? model : undefined,
        message,
        ts: Date.now(),
      })
    );
  } catch {
    // ignore
  }
}

/** @returns {{ model?: 'analyze'|'chat'|'signals'|'bigorder', message: string } | null} */
export function consumePcAiNav() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PC_AI_NAV_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PC_AI_NAV_KEY);
    const parsed = JSON.parse(raw);
    const message = String(parsed?.message || '').trim();
    if (!message) return null;
    const model = parsed?.model;
    return {
      message,
      model: VALID_AI_NAV_MODELS.has(model) ? model : undefined,
    };
  } catch {
    sessionStorage.removeItem(PC_AI_NAV_KEY);
    return null;
  }
}
