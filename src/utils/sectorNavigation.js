/**
 * 板块详情路由：从热门板块等指标跳转时附带摘要参数，供 /sectordetail 首屏展示。
 * 字段与 fetchHotSectionsData 输出一致：category, dt, marketCap, priceChange24h, totalVolume
 */

export function buildSectorDetailHref(row) {
  const category = row?.category ?? row?.sectorName ?? row?.name ?? row?.section ?? '';
  const params = new URLSearchParams();
  params.set('name', category);
  const dt = row?.dt ?? row?.date ?? row?.time;
  if (dt != null && String(dt).trim() !== '') {
    params.set('dt', String(dt));
  }
  const marketCap = row?.marketCap ?? row?.market_cap ?? row?.cap;
  if (marketCap != null && marketCap !== '') {
    params.set('marketCap', String(marketCap));
  }
  const priceChange24h =
    row?.priceChange24h ?? row?.changePercent ?? row?.change ?? row?.changes;
  if (priceChange24h != null && priceChange24h !== '') {
    params.set('priceChange24h', String(priceChange24h));
  }
  const totalVolume = row?.totalVolume ?? row?.volume ?? row?.tradeVolume;
  if (totalVolume != null && totalVolume !== '') {
    params.set('totalVolume', String(totalVolume));
  }
  return `/sectordetail?${params.toString()}`;
}

export function readHotSectorSnapshotFromSearchParams(searchParams) {
  const name = searchParams.get('name');
  if (!name) return null;
  const dt = searchParams.get('dt') ?? '';
  const marketCap = searchParams.get('marketCap');
  const priceChange24h = searchParams.get('priceChange24h');
  const totalVolume = searchParams.get('totalVolume');
  if (
    marketCap == null ||
    marketCap === '' ||
    priceChange24h == null ||
    priceChange24h === '' ||
    totalVolume == null ||
    totalVolume === ''
  ) {
    return null;
  }
  const mc = parseFloat(marketCap);
  const vol = parseFloat(totalVolume);
  const ch = parseFloat(priceChange24h);
  if (![mc, vol, ch].every(Number.isFinite)) return null;
  return {
    name,
    dt,
    marketCap: mc,
    priceChange24h: ch,
    totalVolume: vol,
  };
}

/** @returns {{ text: string, value: number }} */
export function formatHotSectorChangePct(raw) {
  if (raw == null || !Number.isFinite(raw)) {
    return { text: '0.00%', value: 0 };
  }
  // 接口返回的 priceChange24h 单位需要换算为“百分比”：raw * 100
  // 例如 raw=14.4359 -> 1443.59%
  const pct = raw * 100;
  return {
    text: `${pct.toFixed(2)}%`,
    value: pct,
  };
}
