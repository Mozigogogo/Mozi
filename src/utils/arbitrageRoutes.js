/** 套利详情 URL 构建 */

const DETAIL_TYPES = ['funding', 'spread', 'basis', 'oi'];

/**
 * @param {object} op 列表项
 * @param {string} type funding|spread|basis|oi
 * @returns {string}
 */
export function buildArbitrageDetailPath(op, type = 'funding') {
  const t = DETAIL_TYPES.includes(type) ? type : 'funding';
  const symbol = String(op?.sym || op?.symbol || '').trim().toUpperCase();
  const q = new URLSearchParams({ type: t, symbol });
  const exchange = String(op?.exchange || '').trim();
  if (exchange) q.set('exchange', exchange);
  if (t === 'spread') {
    const minEx = String(op?.minExchange || '').trim();
    const maxEx = String(op?.maxExchange || '').trim();
    if (minEx) q.set('minExchange', minEx);
    if (maxEx) q.set('maxExchange', maxEx);
  }
  // 列表点击带上 logo，详情首屏加载中即可展示
  const logoUrl = String(op?.logoUrl || op?.url || '').trim();
  if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
    q.set('logoUrl', logoUrl);
  }
  return `/arbitrage/detail?${q.toString()}`;
}
