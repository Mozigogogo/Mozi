import { trackEvent, trackPageView } from '@/utils/amplitude';

const PC_PLATFORM = 'pc';

/** PC 端页面事件 */
export const PCEvents = {
  NAV_CLICKED: 'PC_Nav_Clicked',
  SEARCH_SUBMITTED: 'PC_Search_Submitted',
  LOGO_CLICKED: 'PC_Logo_Clicked',
  FOOTER_LINK_CLICKED: 'PC_Footer_Link_Clicked',
  ALARM_SYMBOL_CLICKED: 'PC_Alarm_Symbol_Clicked',
  FAVORITE_SYMBOL_CLICKED: 'PC_Favorite_Symbol_Clicked',
};

/**
 * 根据 pathname 解析 PC 页面埋点名称（用于 *_Page_Viewed）
 * @returns {string} 如 PC_Home、PC_Detail
 */
export function resolvePcPageName(pathname, searchParams) {
  const path = String(pathname || '/');
  const sp = searchParams instanceof URLSearchParams ? searchParams : null;

  if (path === '/home' || path === '/') return 'PC_Home';
  if (path === '/pc/find' || path === '/find') return 'PC_Find';
  if (path === '/pc/community' || path === '/community') return 'PC_Community';
  if (path === '/ai' || path.startsWith('/ai/')) return 'PC_AI';
  if (path === '/detail') return 'PC_Detail';
  if (path === '/pc/alarm' || path.startsWith('/pc/alarm/')) return 'PC_Alarm';
  if (path === '/pc/search' || path.startsWith('/pc/search/')) return 'PC_Search';
  if (path === '/pc/us-stock-search' || path.startsWith('/pc/us-stock-search/')) {
    return 'PC_UsStockSearch';
  }
  if (path === '/subscribe' || path.startsWith('/subscribe/')) return 'PC_Subscribe';
  if (path === '/pc/benefitsPage' || path.startsWith('/pc/benefitsPage/')) return 'PC_BenefitsPage';
  if (path === '/pc/benefits' || path.startsWith('/pc/benefits/')) return 'PC_Benefits';
  if (path === '/achievement' || path.startsWith('/achievement/')) return 'PC_Achievement';
  if (path === '/pc/about' || path.startsWith('/pc/about/')) return 'PC_About';
  if (path === '/pc/help' || path.startsWith('/pc/help/')) return 'PC_Help';
  if (path === '/pc/hotsector' || path.startsWith('/pc/hotsector/')) return 'PC_HotSector';
  if (path === '/selfrank' || path.startsWith('/selfrank/')) return 'PC_Favorites';
  if (path === '/wechat-alert' || path.startsWith('/wechat-alert/')) return 'PC_WechatAlert';
  if (path === '/arbitrage' || path.startsWith('/arbitrage/')) return 'PC_Arbitrage';
  if (path === '/fundingrate' || path.startsWith('/fundingrate/')) return 'PC_FundingRate';
  if (path === '/tradevol' || path.startsWith('/tradevol/')) return 'PC_TradeVol';
  if (path === '/hotrank' || path.startsWith('/hotrank/')) return 'PC_HotRank';
  if (path === '/pricerank' || path.startsWith('/pricerank/')) return 'PC_PriceRank';
  if (path === '/exchangerank' || path.startsWith('/exchangerank/')) return 'PC_ExchangeRank';
  if (path === '/putcallratio' || path.startsWith('/putcallratio/')) return 'PC_PutCallRatio';
  if (path === '/positionsize' || path.startsWith('/positionsize/')) return 'PC_PositionSize';
  if (path === '/rankdiscuss' || path.startsWith('/rankdiscuss/')) return 'PC_RankDiscuss';
  if (path.startsWith('/user/')) return 'PC_User';
  if (path === '/post' || path.startsWith('/post/')) return 'PC_Post';
  if (path === '/theme' || path.startsWith('/theme/')) return 'PC_Theme';
  if (path === '/pointshistory' || path.startsWith('/pointshistory/')) return 'PC_PointsHistory';
  if (path === '/withdrawhistory' || path.startsWith('/withdrawhistory/')) return 'PC_WithdrawHistory';

  if (sp?.get('postId') && (path.includes('community') || path === '/pc/community')) {
    return 'PC_Community_Post';
  }

  return 'PC_Other';
}

function buildPcPageProperties(pathname, searchParams) {
  const sp = searchParams instanceof URLSearchParams ? searchParams : null;
  const props = {
    platform: PC_PLATFORM,
    path: pathname || '/',
  };

  if (!sp) return props;

  const symbol = sp.get('symbol') || sp.get('keyword');
  if (symbol) props.symbol = String(symbol).toUpperCase();
  const postId = sp.get('postId');
  if (postId) props.postId = postId;
  const conversationId = pathname?.startsWith('/ai/')
    ? pathname.slice('/ai/'.length).split('/')[0]
    : null;
  if (conversationId) props.conversationId = conversationId;

  return props;
}

/** PC 页面浏览 */
export function trackPcPageView(pathname, searchParams) {
  const pageName = resolvePcPageName(pathname, searchParams);
  trackPageView(pageName, buildPcPageProperties(pathname, searchParams));
}

/** PC 通用事件（自动附带 platform: pc） */
export function trackPcEvent(eventName, properties = {}) {
  trackEvent(eventName, {
    platform: PC_PLATFORM,
    path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    ...properties,
  });
}
