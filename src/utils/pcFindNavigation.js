/** 首页实时榜单 tab key → 发现页排行榜子 tab */
import { getFindTabSeoCopy } from '@/utils/seoI18n';

export const PC_HOME_RANK_TO_FIND_RANK_TYPE = {
  zhangfu: 'up',
  diefu: 'down',
  zhenfu: 'wave',
  chengjiaoe: 'volume',
  xinbi: 'new',
  biaosheng: 'surge',
  // 发现页排行榜无「自选榜」，与涨幅榜对齐
  zixuan: 'up',
};

const VALID_FIND_RANK_TYPES = new Set([
  'exchange',
  'up',
  'down',
  'wave',
  'volume',
  'new',
  'surge',
]);

/**
 * @param {string} homeRankKey PCHome / MobileHome 榜单 key（如 zhangfu）
 * @returns {string} PC 发现页 URL
 */
export function buildPcFindRankHref(homeRankKey) {
  const rankType = PC_HOME_RANK_TO_FIND_RANK_TYPE[homeRankKey] || 'up';
  return `/pc/find?tab=rank&rankType=${encodeURIComponent(rankType)}`;
}

/**
 * @param {string | null | undefined} rankType URL 中的 rankType
 * @returns {string | null}
 */
export function normalizePcFindRankType(rankType) {
  const key = String(rankType || '').trim();
  return VALID_FIND_RANK_TYPES.has(key) ? key : null;
}

/**
 * @param {string | null | undefined} tab URL 中的 tab
 * @returns {'market' | 'usStock' | 'rank' | 'self'}
 */
export function normalizePcFindTab(tab) {
  const key = String(tab || '').trim();
  if (key === 'usStock' || key === 'rank' || key === 'self' || key === 'market') {
    return key;
  }
  return 'market';
}

/**
 * 发现页主 Tab → 带 query 的路径（market 默认不带 tab，URL 更干净）
 * @param {string} basePath `/find` 或 `/pc/find`
 * @param {string} tab
 * @param {URLSearchParams | Record<string, string> | null} [currentParams]
 */
export function buildFindTabHref(basePath, tab, currentParams = null) {
  const base = String(basePath || '/find').split('?')[0] || '/find';
  const nextTab = normalizePcFindTab(tab);
  const params =
    currentParams instanceof URLSearchParams
      ? new URLSearchParams(currentParams.toString())
      : new URLSearchParams(currentParams || {});

  if (nextTab === 'market') {
    params.delete('tab');
    params.delete('rankType');
  } else {
    params.set('tab', nextTab);
    if (nextTab !== 'rank') {
      params.delete('rankType');
    }
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** 发现页按 Tab 的 SEO title（中英文见 i18n locales seo.find.*） */
export function getFindTabSeoTitle(tab, lng) {
  return getFindTabSeoCopy(normalizePcFindTab(tab), lng).title;
}

export function getFindTabSeoDescription(tab, lng) {
  return getFindTabSeoCopy(normalizePcFindTab(tab), lng).description;
}
