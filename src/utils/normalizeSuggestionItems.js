/**
 * 统一建议卡片数据：兼容字符串、{ id, suggestion }、{ id, text } 等
 * @param {unknown} arr
 * @returns {{ id: string, text: string }[]}
 */
export function normalizeSuggestionItems(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item, i) => {
      if (typeof item === 'string') {
        const text = item.trim();
        return text ? { id: `s-${i}`, text } : null;
      }
      if (item && typeof item === 'object') {
        const text = String(
          item.suggestion ?? item.text ?? item.question ?? item.label ?? ''
        ).trim();
        if (!text) return null;
        return { id: String(item.id ?? `s-${i}`), text };
      }
      return null;
    })
    .filter(Boolean);
}
