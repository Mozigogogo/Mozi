/** PC / 移动端社区胶囊 Tab 规范化与 SEO */

const VALID_COMMUNITY_TABS = new Set(['all', 'coin', 'discover', 'qa']);

/**
 * URL / 入口参数 → 统一 tab key
 * 兼容 discovery/question/currency/hot 等历史参数
 * @returns {'all' | 'coin' | 'discover' | 'qa'}
 */
export function normalizeCommunityTab(tab) {
  const key = String(tab || '').trim();
  if (key === 'discovery' || key === 'discover') return 'discover';
  if (key === 'question' || key === 'qa') return 'qa';
  if (key === 'currency' || key === 'coin' || key === 'hot') return 'coin';
  if (key === 'all') return 'all';
  if (VALID_COMMUNITY_TABS.has(key)) return key;
  return 'all';
}

/**
 * 社区 Tab → 带 query 的路径（all 默认不带 tab）
 * @param {string} basePath `/community` 或 `/pc/community`
 */
export function buildCommunityTabHref(basePath, tab, currentParams = null) {
  const base = String(basePath || '/community').split('?')[0] || '/community';
  const nextTab = normalizeCommunityTab(tab);
  const params =
    currentParams instanceof URLSearchParams
      ? new URLSearchParams(currentParams.toString())
      : new URLSearchParams(currentParams || {});

  if (nextTab === 'all') {
    params.delete('tab');
  } else {
    params.set('tab', nextTab);
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** 社区页按 Tab 的 SEO title */
export function getCommunityTabSeoTitle(tab) {
  const key = normalizeCommunityTab(tab);
  if (key === 'coin') {
    return '币种讨论与加密货币社区 | MoziInnovations';
  }
  if (key === 'discover') {
    return '发现好币与加密货币机会 | MoziInnovations';
  }
  if (key === 'qa') {
    return '加密货币问答社区 | MoziInnovations';
  }
  return '加密货币社区、热门话题与行情讨论 | MoziInnovations';
}

export function getCommunityTabSeoDescription(tab) {
  const key = normalizeCommunityTab(tab);
  if (key === 'coin') {
    return 'MoziInnovations（Mozi / 墨子）币种社区：按 BTC/ETH 等币种浏览行情讨论与交易观点。';
  }
  if (key === 'discover') {
    return 'MoziInnovations（Mozi / 墨子）发现好币：社区精选机会、新币讨论与市场观点。';
  }
  if (key === 'qa') {
    return 'MoziInnovations（Mozi / 墨子）加密货币问答：不懂就问，交流行情、策略与交易问题。';
  }
  return 'MoziInnovations（Mozi / 墨子）加密货币社区：热门话题、精选帖子、BTC/ETH 讨论与发现好币。';
}
