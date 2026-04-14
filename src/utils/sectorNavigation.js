/**
 * 板块详情路由：从热门板块等指标跳转时附带摘要参数，供 /sectordetail 首屏展示。
 * 字段与 fetchHotSectionsData / section/list 输出一致：category, dt, marketCap, priceChange24h, totalVolume
 */

function stripLeadingDollar(s) {
  const t = String(s ?? '').trim();
  if (t.startsWith('$')) return t.slice(1).trim();
  return t;
}

/** 涨跌幅写入 query：用纯数字（单位约定为 %），避免出现 `1.37%` → `1.37%25` 的可读性问题 */
function priceChange24hForQuery(raw) {
  if (raw == null || raw === '') return null;
  const n = parseFloat(String(raw).replace(/%/g, '').replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return String(n);
}

/** 市值 / 成交额写入 query：去掉 `$`，减少 `%24` 编码 */
function moneyLikeForQuery(raw) {
  if (raw == null || raw === '') return null;
  const t = stripLeadingDollar(raw);
  return t === '' ? null : t;
}

export function buildSectorDetailHref(row) {
  const category =
    row?.category ??
    row?.sectorName ??
    row?.name ??
    row?.section ??
    row?.symbol ??
    '';
  const params = new URLSearchParams();
  params.set('name', category);
  const dt = row?.dt ?? row?.date ?? row?.time;
  if (dt != null && String(dt).trim() !== '') {
    params.set('dt', String(dt));
  }
  const marketCap =
    row?.sectorMarketCap ??
    row?.marketCap ??
    row?.market_cap ??
    row?.cap;
  const mcQ = moneyLikeForQuery(marketCap);
  if (mcQ != null) {
    params.set('marketCap', mcQ);
  }
  const priceChange24h =
    row?.priceChange24h ?? row?.changePercent ?? row?.change ?? row?.changes;
  const chQ = priceChange24hForQuery(priceChange24h);
  if (chQ != null) {
    params.set('priceChange24h', chQ);
  }
  const totalVolume = row?.totalVolume ?? row?.volume ?? row?.tradeVolume;
  const volQ = moneyLikeForQuery(totalVolume);
  if (volQ != null) {
    params.set('totalVolume', volQ);
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
  // 接口与 URL 中多为展示字符串（如 "$56.78亿"、"-2.35%"），不再要求 parseFloat 为纯数字
  const changeNum = parseFloat(String(priceChange24h).replace(/%/g, '').replace(/,/g, ''));
  if (!Number.isFinite(changeNum)) return null;
  return {
    name,
    dt,
    marketCap: stripLeadingDollar(marketCap),
    priceChange24h,
    totalVolume: stripLeadingDollar(totalVolume),
  };
}

/** @returns {{ text: string, value: number }} */
export function formatHotSectorChangePct(raw) {
  if (raw == null || (typeof raw === 'string' && raw.trim() === '')) {
    return { text: '0.00%', value: 0 };
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    const n = parseFloat(t.replace(/%/g, '').replace(/,/g, ''));
    if (!Number.isFinite(n)) {
      return { text: t.includes('%') ? t : `${t}%`, value: 0 };
    }
    return {
      text: t.includes('%') ? t : `${n.toFixed(2)}%`,
      value: n,
    };
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // 小数按比值理解：raw * 100 为百分比
    const pct = Math.abs(raw) <= 1 ? raw * 100 : raw;
    return {
      text: `${pct.toFixed(2)}%`,
      value: pct,
    };
  }
  return { text: '0.00%', value: 0 };
}
