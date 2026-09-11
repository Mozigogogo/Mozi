/**
 * SEO title / description 中英文（维护于 i18n/locales 下 seo 字段）
 * 客户端传 i18n.language；服务端传 cookie / ?lng= 语言。
 *
 * 双语收录约定：
 * - 同一 path 用 ?lng=zh|en 区分可抓取的中英文版本
 * - metadata.alternates.languages 输出 hreflang
 * - sitemap 同时提交两套 URL
 */
import zh from '@/i18n/locales/zh.json';
import en from '@/i18n/locales/en.json';
import { normalizeLng } from '@/i18n/languageStorage';

/** URL 查询参数：搜索引擎与分享链接用，优先于 cookie */
export const SEO_LNG_QUERY = 'lng';

/** SEO 无 cookie、无 ?lng= 时的回退：中文优先（国内搜索收录） */
export const I18N_SEO_DEFAULT_LNG = 'zh';

export function resolveSeoLng(lng) {
  return normalizeLng(lng) || I18N_SEO_DEFAULT_LNG;
}

/** 服务端：从 cookie 值解析 SEO 语言 */
export function seoLngFromCookieValue(cookieValue) {
  return resolveSeoLng(cookieValue);
}

/** 从 searchParams / URLSearchParams / 普通对象取 lng */
export function seoLngFromSearchParams(searchParams) {
  if (searchParams == null) return null;
  let raw;
  if (typeof searchParams.get === 'function') {
    raw = searchParams.get(SEO_LNG_QUERY) ?? searchParams.get('lang');
  } else {
    raw = searchParams[SEO_LNG_QUERY] ?? searchParams.lang;
  }
  if (Array.isArray(raw)) raw = raw[0];
  return normalizeLng(raw);
}

/**
 * 请求级 SEO 语言：?lng= > cookie > 默认
 * @param {{ cookieValue?: string|null, searchParams?: object }} opts
 * @returns {'zh'|'en'}
 */
export function resolveRequestSeoLng({ cookieValue, searchParams } = {}) {
  return (
    seoLngFromSearchParams(searchParams) ||
    normalizeLng(cookieValue) ||
    I18N_SEO_DEFAULT_LNG
  );
}

/** URL 是否显式带 ?lng= / ?lang=（决定 canonical 是否写入语言参数） */
export function hasExplicitSeoLng(searchParams) {
  return seoLngFromSearchParams(searchParams) != null;
}

/**
 * 给 path 挂上/替换 ?lng=
 * @param {string} path 如 `/find` 或 `/find?tab=rank`
 * @param {'zh'|'en'} lng
 */
export function withSeoLng(path, lng) {
  const resolved = resolveSeoLng(lng);
  const raw = String(path || '/');
  const abs = /^https?:\/\//i.test(raw);
  let pathname = raw;
  let search = '';
  try {
    const base = abs ? undefined : 'https://moziai.xyz';
    const u = new URL(raw, base);
    pathname = abs ? `${u.origin}${u.pathname}` : u.pathname;
    search = u.search;
  } catch {
    const q = raw.indexOf('?');
    if (q >= 0) {
      pathname = raw.slice(0, q) || '/';
      search = raw.slice(q);
    }
  }
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  params.set(SEO_LNG_QUERY, resolved);
  const qs = params.toString();
  return `${pathname}${qs ? `?${qs}` : ''}`;
}

/** 去掉 path 上的 lng/lang，便于生成 hreflang 兄弟链接 */
export function stripSeoLng(path) {
  const raw = String(path || '/');
  try {
    const abs = /^https?:\/\//i.test(raw);
    const u = new URL(raw, abs ? undefined : 'https://moziai.xyz');
    u.searchParams.delete(SEO_LNG_QUERY);
    u.searchParams.delete('lang');
    const qs = u.searchParams.toString();
    if (abs) return `${u.origin}${u.pathname}${qs ? `?${qs}` : ''}`;
    return `${u.pathname}${qs ? `?${qs}` : ''}` || '/';
  } catch {
    return raw;
  }
}

/**
 * Next metadata.alternates.languages 用的相对 path（由 buildPageMetadata 转绝对地址）
 * @param {string} path 当前 path（可含其它 query，可含或不含 lng）
 * @returns {{ 'zh-CN': string, en: string, 'x-default': string }}
 */
export function buildSeoLanguageAlternatePaths(path) {
  const basePath = stripSeoLng(path);
  return {
    'zh-CN': withSeoLng(basePath, 'zh'),
    en: withSeoLng(basePath, 'en'),
    // x-default 指向英文主版本
    'x-default': withSeoLng(basePath, 'en'),
  };
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

/** @param {'home'|'ai'|'find'|'community'} hubKey */
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

/** @param {string | null | undefined} symbol */
export function getAlarmSeoCopy(symbol, lng) {
  const alarm = seoRoot(lng).alarm || {};
  const base = pickCopy(alarm);
  const sym = String(symbol || '').trim().toUpperCase();
  if (!sym) return base;
  const templated =
    alarm.titleWithSymbol ||
    (resolveSeoLng(lng) === 'zh'
      ? `${sym} 智能加密货币价格预警 | 行情提醒 | MoziInnovations`
      : `${sym} Smart Crypto Price Alert | Market Notifications | MoziInnovations`);
  return {
    title: String(templated).replace(/\{\{\s*symbol\s*\}\}/gi, sym),
    description: base.description,
  };
}

export function getAchievementSeoCopy(lng) {
  return pickCopy(seoRoot(lng).achievement);
}

export function getSubscribeSeoCopy(lng) {
  return pickCopy(seoRoot(lng).subscribe);
}

export function getAboutSeoCopy(lng) {
  return pickCopy(seoRoot(lng).about);
}

export function getHelpSeoCopy(lng) {
  return pickCopy(seoRoot(lng).help);
}
