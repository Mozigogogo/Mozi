/**
 * SEO title / description 中英文（维护于 i18n/locales 下 seo 字段）
 * 客户端传 i18n.language；服务端传 cookie 语言。
 */
import zh from '@/i18n/locales/zh.json';
import en from '@/i18n/locales/en.json';
import { I18N_SSR_DEFAULT_LNG, normalizeLng } from '@/i18n/languageStorage';

export function resolveSeoLng(lng) {
  return normalizeLng(lng) || I18N_SSR_DEFAULT_LNG;
}

/** 服务端：从 cookie 值解析 SEO 语言 */
export function seoLngFromCookieValue(cookieValue) {
  return resolveSeoLng(cookieValue);
}

function seoRoot(lng) {
  const dict = resolveSeoLng(lng) === 'zh' ? zh : en;
  return dict?.seo || zh.seo;
}

function pickCopy(node, fallbackTitle = 'MoziInnovations') {
  if (!node || typeof node !== 'object') {
    return { title: fallbackTitle, description: '' };
  }
  return {
    title: node.title || fallbackTitle,
    description: node.description || '',
  };
}

/** @param {'home'|'ai'} hubKey */
export function getHubSeoCopy(hubKey, lng) {
  const seo = seoRoot(lng);
  if (hubKey === 'ai') return pickCopy(seo.ai);
  if (hubKey === 'find') return pickCopy(seo.find?.market);
  if (hubKey === 'community') return pickCopy(seo.community?.all);
  return pickCopy(seo.home);
}

export function getFindTabSeoCopy(tab, lng) {
  const key = String(tab || 'market').trim() || 'market';
  const find = seoRoot(lng).find || {};
  if (key === 'usStock') return pickCopy(find.usStock, find.market?.title);
  if (key === 'rank') return pickCopy(find.rank, find.market?.title);
  if (key === 'self') return pickCopy(find.self, find.market?.title);
  return pickCopy(find.market);
}

export function getCommunityTabSeoCopy(tab, lng) {
  const key = String(tab || 'all').trim() || 'all';
  const community = seoRoot(lng).community || {};
  if (key === 'coin') return pickCopy(community.coin, community.all?.title);
  if (key === 'discover') return pickCopy(community.discover, community.all?.title);
  if (key === 'qa') return pickCopy(community.qa, community.all?.title);
  return pickCopy(community.all);
}
