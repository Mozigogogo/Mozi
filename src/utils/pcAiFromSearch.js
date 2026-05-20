/** PC 顶栏搜索框 → AI 问答：session 传递币种，进入 /ai 后自动提问 */
export const PC_AI_FROM_SEARCH_KEY = 'mozi_pc_ai_from_search_v1';

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
