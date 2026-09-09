/** PC / 移动端社区胶囊 Tab 规范化与 SEO */

import { getCommunityTabSeoCopy } from '@/utils/seoI18n';

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

/** 社区页按 Tab 的 SEO title（中英文见 i18n locales seo.community.*） */
export function getCommunityTabSeoTitle(tab, lng) {
  return getCommunityTabSeoCopy(normalizeCommunityTab(tab), lng).title;
}

export function getCommunityTabSeoDescription(tab, lng) {
  return getCommunityTabSeoCopy(normalizeCommunityTab(tab), lng).description;
}
