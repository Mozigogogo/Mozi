/* eslint-disable */
/** Tab-specific data mappers, list/detail HTML, charts & calculators (aligned with mozi-radar-full.html) */

import i18n from '@/i18n/config';
import { formatMoneyCompact } from '@/utils/formatMoney';

export const TAB_KEYS = ['funding', 'spread', 'basis', 'oi'];

export const TAB_LABELS = {
  funding: 'Funding 套利',
  spread: '现货价差',
  basis: '基差套利',
  oi: 'OI 异动',
};

export const TAB_COLORS = {
  funding: 'var(--accent)',
  spread: 'var(--blue)',
  basis: 'var(--purple)',
  oi: 'var(--orange)',
};

export const introData = {
  funding: [
    { icon: '📡', label: '什么是 Funding 套利？', desc: '同时买现货 + 做空永续合约，Funding 费率为正时空头持续收取费用，方向风险接近中性。' },
    { icon: '🧮', label: '年化怎么算？', desc: '当前 8h 费率 × 3 × 365，代表费率不变时全年理论收益，实际受市场波动影响。' },
    { icon: '⭐', label: '评级代表什么？', desc: '综合年化、历史稳定性、交易量打分。5星 = 当前最优质机会，不代表无风险。' },
    { icon: '⚠️', label: '「极值」警告', desc: '费率超过30日均值2倍时触发，可能存在诱多风险，建议等待回落或减半仓位。' },
  ],
  spread: [
    { icon: '🔀', label: '什么是现货价差套利？', desc: '同一币种在不同交易所之间存在短暂价格差，在低价所买入再去高价所卖出，赚取价差。' },
    { icon: '⏱', label: '时间窗口很关键', desc: '价差通常在几分钟内收敛。需要在机会窗口内完成搬砖，否则价差可能已消失。' },
    { icon: '💸', label: '净价差才是真收益', desc: '毛价差扣除双所手续费才是可得收益。净价差 < 0.1% 通常不值得执行。' },
    { icon: '🚨', label: '风险：执行期间价格波动', desc: '转账过程中（5-30分钟）价格可能逆向波动，建议只做 BTC/ETH 等高流动性主流币。' },
  ],
  basis: [
    { icon: '⚖️', label: '什么是基差套利？', desc: '永续合约价格与现货价格之间存在差值（基差），通过同所买现货+空永续锁定这个差值。' },
    { icon: '📈', label: '升水 vs 贴水', desc: 'perp > 现货 = 升水，做多现货+做空 perp 收取基差；perp < 现货 = 贴水，反向操作。' },
    { icon: '🔄', label: '与 Funding 套利的关系', desc: '基差套利赚的是价差，Funding 套利赚的是资金费率，两者可以同时获得，形成双重收益。' },
    { icon: '⚠️', label: '基差可能扩大', desc: '基差并非线性收敛，极端行情下可能扩大到2%以上，保证金率建议保持≥50%。' },
  ],
  oi: [
    { icon: '📊', label: 'OI 是什么？', desc: '未平仓合约量，反映市场上所有未关闭的多空合约总量，是判断资金流向的核心指标。' },
    { icon: '📉', label: 'OI↑价↑ = 多头入场', desc: '持仓量与价格同步上升，说明有新资金做多，是顺势偏多信号，可参考做多。' },
    { icon: '🔄', label: 'OI↓价↑ = 空头平仓', desc: '持仓量下降但价格上涨，空头被迫止损平仓，短线仍有上涨动能。' },
    { icon: '🌀', label: 'OI↑价↓ = 空头建仓', desc: '持仓量增加但价格下跌，新空头在高位入场，价格仍有下行压力。' },
  ],
};

export const exColors = {
  Binance: { bg: 'rgba(240,185,11,.12)', border: 'rgba(240,185,11,.4)', color: '#B45309', c: '#B45309' },
  Bybit: { bg: 'rgba(255,166,0,.12)', border: 'rgba(255,166,0,.35)', color: '#D97706', c: '#D97706' },
  OKX: { bg: 'rgba(15,23,42,.04)', border: 'rgba(15,23,42,.12)', color: '#475569', c: '#475569' },
  Gate: { bg: 'rgba(0,163,255,.1)', border: 'rgba(0,163,255,.25)', color: '#0284C7', c: '#0284C7' },
  HTX: { bg: 'rgba(232,75,66,.1)', border: 'rgba(232,75,66,.25)', color: '#DC2626', c: '#DC2626' },
  Kucoin: { bg: 'rgba(9,188,138,.1)', border: 'rgba(9,188,138,.25)', color: '#059669', c: '#059669' },
  Bitget: { bg: 'rgba(0,163,255,.1)', border: 'rgba(0,163,255,.25)', color: '#0284C7', c: '#0284C7' },
  MEXC: { bg: 'rgba(83,56,158,.1)', border: 'rgba(83,56,158,.25)', color: '#7C3AED', c: '#7C3AED' },
  BitMart: { bg: 'rgba(22,90,243,.1)', border: 'rgba(22,90,243,.25)', color: '#2563EB', c: '#2563EB' },
  LBank: { bg: 'rgba(15,118,110,.1)', border: 'rgba(15,118,110,.25)', color: '#0F766E', c: '#0F766E' },
};

/** 原样展示价格/价差数值（不加精度裁剪） */
export function displayRawNum(raw, { prefix = '' } = {}) {
  if (raw == null || raw === '') return '—';
  const s = String(raw).trim();
  if (!s || s === 'NaN' || s === 'undefined') return '—';
  if (prefix && s.startsWith(prefix)) return s;
  return `${prefix}${s}`;
}

/** 带正负号的金额原值，如 +$0.002731 / -$0.01 */
export function displaySignedMoney(raw) {
  if (raw == null || raw === '') return '—';
  const s = String(raw).trim().replace(/,/g, '');
  if (!s || s === 'NaN' || s === 'undefined') return '—';
  const n = Number(s);
  if (!Number.isFinite(n)) return '—';
  const body = s.replace(/^[+-]/, '');
  if (n > 0) return `+$${body}`;
  if (n < 0) return `-$${body}`;
  return `$${body}`;
}

/** 截断到小数点后 digits 位，不四舍五入。276.78422 → 276.784 */
export function truncateDecimals(raw, digits = 3) {
  if (raw == null || raw === '') return null;
  let s = String(raw).trim().replace(/,/g, '').replace(/%/g, '');
  if (!s || s === 'NaN' || s === 'undefined') return null;

  let sign = '';
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('-')) {
    sign = '-';
    s = s.slice(1);
  }

  // 科学计数法先展开成普通小数串再截断，避免 toFixed 四舍五入
  if (/e/i.test(s)) {
    const n = Number(`${sign}${s}`);
    if (!Number.isFinite(n)) return null;
    const abs = Math.abs(n);
    // 拆成整数+小数，用字符串拼接避免 round
    const str = abs.toFixed(20).replace(/0+$/, '').replace(/\.$/, '');
    s = str || '0';
    sign = n < 0 ? '-' : '';
  }

  const [intPart, fracPart = ''] = s.split('.');
  const int = intPart.replace(/^0+(?=\d)/, '') || '0';
  if (digits <= 0) return `${sign}${int}`;
  const frac = fracPart.slice(0, digits);
  return frac ? `${sign}${int}.${frac}` : `${sign}${int}`;
}

/** 百分比展示：截断到小数点后 3 位，不四舍五入 */
export function displayPctTrunc(raw, { signed = false, digits = 3 } = {}) {
  const t = truncateDecimals(raw, digits);
  if (t == null) return '—';
  if (signed) {
    const n = Number(String(raw).toString().replace(/,/g, '').replace(/%/g, ''));
    if (Number.isFinite(n) && n > 0 && !t.startsWith('-') && !t.startsWith('+')) {
      return `+${t}%`;
    }
  }
  return `${t}%`;
}

/** @deprecated 使用 displayPctTrunc；保留兼容旧调用 */
export function displaySignedPct(raw) {
  return displayPctTrunc(raw, { signed: true, digits: 3 });
}

/**
 * 成交量大数格式化（对齐 format_large_zh / format_large_en）
 * 中文：万 / 亿 / 万亿；英文：K / M / B / T；均保留 2 位小数
 */
export function displayVolWithUnit(raw) {
  if (raw == null || raw === '') return '—';
  const s = String(raw).trim();
  if (!s || s === 'NaN' || s === 'undefined') return '—';
  const out = formatMoneyCompact(s, i18n.language, true);
  return out.includes('--') ? '—' : out;
}

export const hintStyles = {
  多头入场: { bg: 'rgba(5,150,105,.1)', border: 'rgba(5,150,105,.3)', c: '#059669' },
  空头入场: { bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.3)', c: '#EF4444' },
  空头平仓: { bg: 'rgba(5,150,105,.08)', border: 'rgba(5,150,105,.25)', c: '#059669' },
  多头平仓: { bg: 'rgba(239,68,68,.08)', border: 'rgba(239,68,68,.25)', c: '#EF4444' },
};

const symColors = ['#00B890', '#D97706', '#6366F1', '#DB2777', '#0D9488', '#7C3AED', '#EA580C', '#0891B2'];

export function fmtOI(usd) {
  const n = Number(usd);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

export function fmtVol(raw) {
  const n = parseFloat(String(raw ?? '').replace(/,/g, ''));
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

export function exBadge(name) {
  const e = exColors[name] || { bg: 'rgba(15,23,42,.04)', border: 'rgba(15,23,42,.12)', color: '#64748b', c: '#64748b' };
  return `<span class="exbadge" style="background:${e.bg};border-color:${e.border};color:${e.color}">${name}</span>`;
}

function symIco(sym, idx) {
  const c = symColors[idx % symColors.length];
  return `<div class="sym-ico" style="background:${c}22;color:${c}">${String(sym).slice(0, 3)}</div>`;
}

function valTierCls(pct, tiers = [0.5, 0.2]) {
  if (pct >= tiers[0]) return 'val-h';
  if (pct >= tiers[1]) return 'val-m';
  return 'val-l';
}

export function mapSpreadItem(item, index) {
  if (!item || typeof item !== 'object') return null;
  const validExchanges = Array.isArray(item.validExchanges)
    ? item.validExchanges.map((ex) => String(ex || '').trim()).filter(Boolean)
    : Array.isArray(item.valid_exchanges)
      ? item.valid_exchanges.map((ex) => String(ex || '').trim()).filter(Boolean)
      : [];
  return {
    type: 'spread',
    rank: Number(item.rank) || index + 1,
    sym: String(item.symbol || item.sym || '').trim().toUpperCase() || '—',
    minExchange: String(item.minExchange || item.min_exchange || '').trim() || '—',
    maxExchange: String(item.maxExchange || item.max_exchange || '').trim() || '—',
    minPrice: item.minPrice ?? item.min_price ?? '',
    maxPrice: item.maxPrice ?? item.max_price ?? '',
    avgPrice: item.avgPrice ?? item.avg_price ?? '',
    spreadPct: item.spreadPct ?? item.spread_pct ?? '',
    spreadAbs: item.spreadAbs ?? item.spread_abs,
    validExchanges,
    volume24h: item.totalQuoteVolume24h ?? item.total_quote_volume_24h,
    ts: Number(item.ts) || 0,
    dataTs: Number(item.ts ?? item.dataTs ?? item.data_ts) || 0,
  };
}

export function mapBasisItem(item, index) {
  if (!item || typeof item !== 'object') return null;
  const annRaw = item.annualizedPct ?? item.annualized_pct;
  return {
    type: 'basis',
    rank: Number(item.rank) || index + 1,
    sym: String(item.symbol || item.sym || '').trim().toUpperCase() || '—',
    exchange: String(item.exchange || item.exchangeCode || item.exchange_code || '').trim() || '—',
    perpPrice: item.perpPrice ?? item.perp_price ?? '',
    spotPrice: item.spotPrice ?? item.spot_price ?? '',
    basisAbs: item.basisAbs ?? item.basis_abs ?? '',
    basisPct: item.basisPct ?? item.basis_pct ?? '',
    ann: annRaw == null || annRaw === '' ? null : annRaw,
    perpVolume24h: item.perpQuoteVolume24h ?? item.perp_quote_volume_24h,
    spotVolume24h: item.spotQuoteVolume24h ?? item.spot_quote_volume_24h,
    volume24h: item.perpQuoteVolume24h ?? item.perp_quote_volume_24h ?? item.quoteVolume24h,
    ts: Number(item.ts) || 0,
    dataTs: Number(item.ts ?? item.dataTs ?? item.data_ts) || 0,
  };
}

export function mapOIItem(item, index) {
  if (!item || typeof item !== 'object') return null;
  return {
    type: 'oi',
    rank: Number(item.rank) || index + 1,
    sym: String(item.symbol || item.sym || '').trim().toUpperCase() || '—',
    exchange: String(item.exchange || item.exchangeCode || item.exchange_code || '').trim() || '—',
    currentOiUsd: Number(item.currentOiUsd ?? item.current_oi_usd) || 0,
    avg7dOiUsd: Number(item.avg7dOiUsd ?? item.avg_7d_oi_usd) || 0,
    oiChangePct: Number(item.oiChangePct ?? item.oi_change_pct) || 0,
    priceChange24hPct: Number(item.priceChange24hPct ?? item.price_change_24h_pct) || 0,
    correlationHint: String(item.correlationHint ?? item.correlation_hint ?? '').trim() || '—',
    volume24h: item.quoteVolume24h ?? item.quote_volume_24h,
    dataTs: Number(item.dataTs ?? item.data_ts) || 0,
  };
}

export function renderIntroStrip(tab) {
  const cards = (introData[tab] || introData.funding).map(
    (c, i) => `
    <div class="intro-card" style="animation-delay:${i * 0.05}s">
      <div class="intro-icon">${c.icon}</div>
      <div class="intro-label">${c.label}</div>
      <div class="intro-desc">${c.desc}</div>
    </div>`
  ).join('');
  return `<div class="intro-strip">${cards}</div>`;
}

export function renderTypeTabs(activeTab) {
  return TAB_KEYS.map((t) => {
    const on = activeTab === t ? 'on' : '';
    const color = TAB_COLORS[t];
    const style = on ? `style="color:${color};border-bottom-color:${color}"` : '';
    return `<button type="button" class="ttab ${on}" ${style} onclick="setTab('${t}',this)">
      <span class="tab-dot" ${on ? `style="background:${color}"` : ''}></span>${TAB_LABELS[t]}
    </button>`;
  }).join('');
}

export function tableHeadHTML(tab, sortIndFn) {
  const tip = (txt) =>
    `<span class="tip" style="margin-left:4px" onclick="event.stopPropagation()"><span class="tip-ico">?</span><span class="tip-txt">${txt}</span></span>`;
  const ind = (key) =>
    typeof sortIndFn === 'function'
      ? sortIndFn(key)
      : '<span class="sort-ind" aria-hidden="true"><span class="sort-up">▲</span><span class="sort-dn">▼</span></span>';

  if (tab === 'spread') {
    return `<tr>
      <th class="col-num">#</th>
      <th class="col-sym">标的</th>
      <th class="col-flow">操作方向 ${tip('在低价所买入，在高价所卖出，赚取价差')}</th>
      <th class="col-prices">买入价 / 卖出价</th>
      <th class="th-sortable col-spread-abs" onclick="sortBy('spreadAbs')">
        绝对价差 ${ind('spreadAbs')}
        ${tip('高价 − 低价的绝对差值')}
      </th>
      <th class="th-sortable col-spread" onclick="sortBy('spreadPct')">
        价差 % ${ind('spreadPct')}
        ${tip('(高价-低价)/均价×100，扣手续费后才是净收益；默认按此降序')}
      </th>
      <th class="th-sortable col-vol" onclick="sortBy('quoteVolume')">
        24h 总成交量 ${ind('quoteVolume')}
        ${tip('有效交易所合计 24h 成交额（计价货币）')}
      </th>
    </tr>`;
  }
  if (tab === 'basis') {
    return `<tr>
      <th class="col-num">#</th>
      <th class="col-sym">标的</th>
      <th class="col-ex">交易所</th>
      <th class="col-dir">方向 ${tip('升水=perp溢价，做多现货+做空perp；贴水=perp折价，反向操作')}</th>
      <th class="col-prices">perp 价 / 现货价</th>
      <th class="th-sortable col-basis-abs" onclick="sortBy('basisAbs')">
        绝对基差 ${ind('basisAbs')}
        ${tip('perp 价 − 现货价的绝对差值，可正可负')}
      </th>
      <th class="th-sortable col-basis" onclick="sortBy('basisPct')">
        基差 % ${ind('basisPct')}
        ${tip('(perp价-现货价)/现货价×100，正=升水，负=贴水；默认按此降序')}
      </th>
      <th class="col-funding-ann">Funding 年化</th>
      <th class="col-vol">24h 成交额 ${tip('上：合约成交额；下：现货成交额')}</th>
    </tr>`;
  }
  if (tab === 'oi') {
    return `<tr>
      <th class="col-num">#</th>
      <th class="col-sym">标的</th>
      <th class="col-ex">交易所</th>
      <th class="col-oi">当前 OI / 7日均值 ${tip('未平仓合约总量（USD），与7日均值比较判断是否异常')}</th>
      <th class="col-oi-chg">vs 7日均值 ${tip('当前OI相对过去7天均值的偏离百分比')}</th>
      <th class="col-price-chg">价格 24h</th>
      <th class="col-signal">信号 ${tip('OI变化+价格变化的组合解读：多头入场/空头入场/空头平仓/多头平仓')}</th>
      <th class="col-vol">24h 成交量</th>
    </tr>`;
  }
  return `<tr>
    <th class="col-num">#</th>
    <th class="col-sym">标的</th>
    <th class="col-ex">交易所</th>
    <th class="th-sortable col-funding" onclick="sortBy('funding')">
      当前 Funding ${ind('funding')}
      ${tip('每8小时结算一次的资金费率，正数代表多头支付给空头')}
    </th>
    <th class="th-sortable col-ann" onclick="sortBy('ann')">
      年化 ${ind('ann')}
      ${tip('按当前一期费率折算，实际收益受市场波动影响')}
    </th>
    <th class="col-avg">30d 均值</th>
    <th class="col-days">持续</th>
    <th class="col-rating">评级</th>
  </tr>`;
}

export function tableRowHTML(tab, o, opsIdx, displayRank, helpers = {}) {
  const { rowHTML } = helpers;
  if (tab === 'funding' && rowHTML) return rowHTML(o, opsIdx, displayRank);

  const delay = (displayRank - 1) * 35;
  const click = `onclick="openDetail(ops[${opsIdx}],'${tab}')"`;

  if (tab === 'spread') {
    const minEx = exColors[o.minExchange] || exColors.Binance;
    const maxEx = exColors[o.maxExchange] || exColors.Binance;
    const valCls = valTierCls(Number(o.spreadPct) || 0);
    const exCount = Array.isArray(o.validExchanges) ? o.validExchanges.length : 0;
    const symSub = exCount > 0 ? `${exCount} 所有效` : '现货跨所';
    const spreadPctText = truncateDecimals(o.spreadPct, 3);
    return `<tr ${click} style="animation-delay:${delay}ms">
      <td class="td-num">${o.rank || displayRank}</td>
      <td><div class="sym-cell">${symIco(o.sym, opsIdx)}<div><div class="sym-name">${o.sym}</div><div class="sym-sub">${symSub}</div></div></div></td>
      <td><div class="ex-flow">
        <span class="ex-node" style="background:${minEx.bg};border-color:${minEx.border};color:${minEx.color}">${o.minExchange} 买</span>
        <span class="ex-arrow">→</span>
        <span class="ex-node" style="background:${maxEx.bg};border-color:${maxEx.border};color:${maxEx.color}">${o.maxExchange} 卖</span>
      </div></td>
      <td><div class="price-stack">
        <span class="mono price-lo">低 ${displayRawNum(o.minPrice, { prefix: '$' })}</span>
        <span class="mono price-hi">高 ${displayRawNum(o.maxPrice, { prefix: '$' })}</span>
      </div></td>
      <td><span class="mono" style="color:var(--t2)">${displayRawNum(o.spreadAbs, { prefix: '$' })}</span></td>
      <td><span class="${valCls}">${spreadPctText == null ? '—' : `${spreadPctText}%`}</span></td>
      <td><span class="mono" style="color:var(--t2)">${displayVolWithUnit(o.volume24h)}</span></td>
    </tr>`;
  }

  if (tab === 'basis') {
    const basisPctNum = Number(o.basisPct) || 0;
    const isPos = basisPctNum >= 0;
    const basisCls = valTierCls(Math.abs(basisPctNum), [0.3, 0.1]);
    const dirLabel = isPos ? '升水' : '贴水';
    const dirStyle = isPos
      ? 'background:rgba(5,150,105,.1);border-color:rgba(5,150,105,.3);color:#059669'
      : 'background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.3);color:#EF4444';
    const annText = o.ann == null || o.ann === ''
      ? '—'
      : (() => {
          const trunc = truncateDecimals(o.ann, 3);
          if (trunc == null) return '—';
          const annNum = Number(o.ann);
          const sign = Number.isFinite(annNum) && annNum > 0 ? '+' : '';
          return `${sign}${trunc}%`;
        })();
    return `<tr ${click} style="animation-delay:${delay}ms">
      <td class="td-num">${o.rank || displayRank}</td>
      <td><div class="sym-cell">${symIco(o.sym, opsIdx)}<div><div class="sym-name">${o.sym}</div><div class="sym-sub">perp vs 现货</div></div></div></td>
      <td>${exBadge(o.exchange)}</td>
      <td><span class="risk-badge" style="${dirStyle}">${dirLabel}</span></td>
      <td><div class="price-stack">
        <span class="mono" style="color:var(--t2);font-size:11px">perp ${displayRawNum(o.perpPrice, { prefix: '$' })}</span>
        <span class="mono" style="color:var(--t3);font-size:11px">spot ${displayRawNum(o.spotPrice, { prefix: '$' })}</span>
      </div></td>
      <td><span class="mono" style="color:var(--t2)">${displaySignedMoney(o.basisAbs)}</span></td>
      <td><span class="${basisCls}">${displayPctTrunc(o.basisPct, { signed: true })}</span></td>
      <td><span class="mono" style="color:var(--t2)">${annText}</span></td>
      <td><div class="price-stack">
        <span class="mono" style="color:var(--t2);font-size:11px">perp ${displayVolWithUnit(o.perpVolume24h)}</span>
        <span class="mono" style="color:var(--t3);font-size:11px">spot ${displayVolWithUnit(o.spotVolume24h)}</span>
      </div></td>
    </tr>`;
  }

  if (tab === 'oi') {
    const hs = hintStyles[o.correlationHint] || { bg: 'rgba(15,23,42,.04)', border: 'rgba(15,23,42,.12)', c: 'var(--t2)' };
    const oiCls = o.oiChangePct >= 0 ? 'val-pos' : 'val-neg';
    const priceCls = o.priceChange24hPct >= 0 ? 'val-pos' : 'val-neg';
    return `<tr ${click} style="animation-delay:${delay}ms">
      <td class="td-num">${o.rank || displayRank}</td>
      <td><div class="sym-cell">${symIco(o.sym, opsIdx)}<div><div class="sym-name">${o.sym}</div><div class="sym-sub">永续合约</div></div></div></td>
      <td>${exBadge(o.exchange)}</td>
      <td><div class="price-stack">
        <span class="mono">${fmtOI(o.currentOiUsd)}</span>
        <span class="mono" style="color:var(--t3);font-size:11px">7日均值 ${fmtOI(o.avg7dOiUsd)}</span>
      </div></td>
      <td><span class="${oiCls}">${o.oiChangePct >= 0 ? '↑' : '↓'} ${truncateDecimals(Math.abs(o.oiChangePct), 3) ?? '—'}%</span></td>
      <td><span class="${priceCls}">${o.priceChange24hPct >= 0 ? '↑' : '↓'} ${truncateDecimals(Math.abs(o.priceChange24hPct), 3) ?? '—'}%</span></td>
      <td><span class="hint-badge" style="background:${hs.bg};border-color:${hs.border};color:${hs.c}">${o.correlationHint}</span></td>
      <td><span class="mono" style="color:var(--t3)">${fmtVol(o.volume24h)}</span></td>
    </tr>`;
  }

  return '';
}

export function skeletonCellsHTML(tab) {
  const cell = (w = 'skel-w72') => `<td><span class="skel skel-line ${w}"></span></td>`;
  const sym = `<td><div class="sym-cell"><span class="skel skel-avatar"></span><div class="skel-sym-text"><span class="skel skel-line skel-w64"></span><span class="skel skel-line skel-w48"></span></div></div></td>`;
  const num = `<td class="td-num"><span class="skel skel-num"></span></td>`;

  if (tab === 'spread') {
    return `${num}${sym}${cell('skel-w120')}${cell('skel-w88')}${cell('skel-w64')}${cell('skel-w64')}${cell('skel-w72')}`;
  }
  if (tab === 'basis') {
    return `${num}${sym}<td><span class="skel skel-badge"></span></td>${cell('skel-w48')}${cell('skel-w88')}${cell('skel-w64')}${cell('skel-w64')}${cell('skel-w72')}${cell('skel-w88')}`;
  }
  if (tab === 'oi') {
    return `${num}${sym}<td><span class="skel skel-badge"></span></td>${cell('skel-w88')}${cell('skel-w64')}${cell('skel-w48')}${cell('skel-w72')}${cell('skel-w64')}`;
  }
  return `${num}${sym}<td><span class="skel skel-badge"></span></td>${cell('skel-w88')}${cell('skel-w72')}${cell('skel-w64')}${cell('skel-w40')}<td><span class="skel skel-stars"></span></td>`;
}

const CHART_AXIS = '<span>6月1日</span><span>6月8日</span><span>6月15日</span><span>6月22日</span><span>今天</span>';

export function renderSpreadDetail(o, opsIdx) {
  const col = symColors[opsIdx % symColors.length];
  const minExC = exColors[o.minExchange] || exColors.Binance;
  const maxExC = exColors[o.maxExchange] || exColors.Binance;
  const feeRate = 0.001;
  const spreadPctNum = Number(o.spreadPct) || 0;
  const netSpread = spreadPctNum - feeRate * 2 * 100;
  const validEx = Array.isArray(o.validExchanges) ? o.validExchanges : [];
  const validExHtml = validEx.length
    ? validEx.map((ex) => exBadge(ex)).join('')
    : '<span style="color:var(--t3)">—</span>';
  const avgPriceText = displayRawNum(o.avgPrice, { prefix: '$' });
  const spreadPctText = truncateDecimals(o.spreadPct, 3);
  const volumeText = displayVolWithUnit(o.volume24h);
  return `
  <button class="back-btn" onclick="backToRadar()">← 返回列表</button>
  <div class="det-hdr">
    <div class="det-left">
      <div class="det-ttl">
        <div class="sym-ico" style="background:${col}22;color:${col};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">${o.sym.slice(0, 3)}</div>
        ${o.sym}/USDT
        <span class="type-chip type-chip-spread">现货价差</span>
      </div>
      <div class="det-meta">
        <div class="ex-flow">
          <span class="ex-node" style="background:${minExC.bg};border-color:${minExC.border};color:${minExC.color}">${o.minExchange} 买</span>
          <span class="ex-arrow" style="font-size:16px">→</span>
          <span class="ex-node" style="background:${maxExC.bg};border-color:${maxExC.border};color:${maxExC.color}">${o.maxExchange} 卖</span>
        </div>
        <div style="font-size:11px;color:var(--t3)">24h 总成交量 ${volumeText} · 绝对价差 ${displayRawNum(o.spreadAbs, { prefix: '$' })}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
          <span style="font-size:11px;color:var(--t3)">有效交易所</span>
          ${validExHtml}
        </div>
      </div>
    </div>
    <div class="det-right">
      <div class="big-val" style="color:var(--blue)">${spreadPctText == null ? '—' : `${spreadPctText}%`}</div>
      <div class="big-label">毛价差</div>
      <div class="big-sub" style="color:${netSpread > 0 ? 'var(--pos)' : 'var(--danger)'}">扣手续费后净价差 ${netSpread > 0 ? '+' : ''}${truncateDecimals(netSpread, 3) ?? netSpread}%</div>
    </div>
  </div>
  <div class="chart-card">
    <div class="chart-card-hdr">
      <div class="chart-title">${o.sym} 跨所价格 30日走势</div>
      <div class="chart-legend">
        <div class="leg-item"><div class="leg-dot" style="background:var(--accent)"></div>${o.minExchange}（买入所）</div>
        <div class="leg-item"><div class="leg-dot" style="background:var(--blue)"></div>${o.maxExchange}（卖出所）</div>
      </div>
    </div>
    <div class="chart-svg-wrap">
      <svg id="fchart" width="100%" height="160" viewBox="0 0 720 160" preserveAspectRatio="none" style="display:block"></svg>
      <div class="c-tooltip" id="c-tooltip"></div>
    </div>
    <div class="xaxis">${CHART_AXIS}</div>
  </div>
  <div class="g3">
    <div class="card">
      <div class="card-t">${o.minExchange} 买入</div>
      <div class="met-row"><div class="met-l">现货价</div><div class="met-v" style="color:var(--pos)">${displayRawNum(o.minPrice, { prefix: '$' })}</div></div>
      <div class="met-row"><div class="met-l">买入手续费</div><div class="met-v" style="color:var(--danger)">-0.10%</div></div>
      <div class="met-row"><div class="met-l">成交量</div><div class="met-v">${volumeText}</div></div>
    </div>
    <div class="card">
      <div class="card-t">${o.maxExchange} 卖出</div>
      <div class="met-row"><div class="met-l">现货价</div><div class="met-v" style="color:var(--danger)">${displayRawNum(o.maxPrice, { prefix: '$' })}</div></div>
      <div class="met-row"><div class="met-l">卖出手续费</div><div class="met-v" style="color:var(--danger)">-0.10%</div></div>
      <div class="met-row"><div class="met-l">均价</div><div class="met-v">${avgPriceText}</div></div>
    </div>
    <div class="card">
      <div class="card-t">收益拆解</div>
      <div class="met-row"><div class="met-l">绝对价差</div><div class="met-v">${displayRawNum(o.spreadAbs, { prefix: '$' })}</div></div>
      <div class="met-row"><div class="met-l">毛价差</div><div class="met-v">${spreadPctText == null ? '—' : `+${spreadPctText}%`}</div></div>
      <div class="met-row"><div class="met-l">双所手续费</div><div class="met-v" style="color:var(--danger)">-0.20%</div></div>
      <div class="met-row"><div class="met-l">净价差</div><div class="met-v" style="color:${netSpread > 0 ? 'var(--pos)' : 'var(--danger)'}">${netSpread > 0 ? '+' : ''}${truncateDecimals(netSpread, 3) ?? netSpread}%</div></div>
    </div>
  </div>
  <div class="calc-card calc-card-blue">
    <div class="calc-t">💰 单次搬砖收益估算</div>
    <div class="calc-desc">输入搬砖金额，查看单次执行预期收益</div>
    <div class="inp-row">
      <div class="inp-g">
        <label class="inp-lbl">搬砖金额</label>
        <div class="inp-wrap"><span class="inp-pfx">$</span><input class="inp-f" id="inp-spread" type="number" value="10000" min="100" onchange="calcSpread()"></div>
      </div>
    </div>
    <div class="steps-box" id="spread-steps"></div>
    <div class="res-table" id="spread-res"></div>
  </div>
  <div class="disc">⚠️ 搬砖过程中价差可能已收敛，实际到账收益可能为负。大额操作请评估当前链上拥堵情况和滑点。</div>
  <div class="risk-box">
    <div class="risk-t">⚠️ 风险提示</div>
    <div class="risk-li">执行风险：链上转账期间（5-30分钟）价格可能反向波动，价差可能变为负数</div>
    <div class="risk-li">滑点风险：大额（>$50,000）搬砖会产生明显滑点，需单独评估盘口深度</div>
    <div class="risk-li">提币风险：网络拥堵时转账时间延长，建议评估该链当前 Gas 费和确认时间</div>
    ${spreadPctNum < 0.2 ? '<div class="risk-li" style="color:var(--danger)">价差过小：净价差极低，执行稍有偏差即可能亏损，建议等待更大价差机会</div>' : ''}
  </div>`;
}

export function renderBasisDetail(o, opsIdx) {
  const col = symColors[opsIdx % symColors.length];
  const exC = (exColors[o.exchange] || {}).c || '#64748b';
  const basisPctNum = Number(o.basisPct) || 0;
  const isPos = basisPctNum >= 0;
  const typeColor = isPos ? 'var(--pos)' : 'var(--danger)';
  const typeLabel = isPos ? '升水（perp 溢价）' : '贴水（perp 折价）';
  const annText = o.ann == null || o.ann === ''
    ? '—'
    : (() => {
        const trunc = truncateDecimals(o.ann, 3);
        if (trunc == null) return '—';
        const annNum = Number(o.ann);
        const sign = Number.isFinite(annNum) && annNum > 0 ? '+' : '';
        return `${sign}${trunc}%`;
      })();
  const annColor = o.ann == null || o.ann === ''
    ? 'var(--t3)'
    : Number(o.ann) >= 0
      ? 'var(--pos)'
      : 'var(--danger)';
  return `
  <button class="back-btn" onclick="backToRadar()">← 返回列表</button>
  <div class="det-hdr">
    <div class="det-left">
      <div class="det-ttl">
        <div class="sym-ico" style="background:${col}22;color:${col};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">${o.sym.slice(0, 3)}</div>
        ${o.sym}/USDT
        <span style="font-size:14px;font-weight:500;color:var(--t3)">·</span>
        <span style="font-size:14px;font-weight:500;color:${exC}">${o.exchange}</span>
        <span class="type-chip type-chip-basis">基差套利</span>
        <span class="risk-badge" style="background:${isPos ? 'rgba(5,150,105,.1)' : 'rgba(239,68,68,.1)'};border-color:${isPos ? 'rgba(5,150,105,.3)' : 'rgba(239,68,68,.3)'};color:${typeColor}">${isPos ? '升水' : '贴水'}</span>
      </div>
      <div class="det-meta">
        <div style="font-size:11px;color:var(--t2)">${typeLabel}</div>
        <div style="font-size:11px;color:var(--t3)">Funding 年化 ${annText}</div>
        <div style="font-size:11px;color:var(--t3);margin-top:4px">合约 24h ${displayVolWithUnit(o.perpVolume24h)} · 现货 24h ${displayVolWithUnit(o.spotVolume24h)}</div>
      </div>
    </div>
    <div class="det-right">
      <div class="big-val" style="color:${typeColor}">${displayPctTrunc(o.basisPct, { signed: true })}</div>
      <div class="big-label">当前基差</div>
      <div class="big-sub">perp ${displayRawNum(o.perpPrice, { prefix: '$' })} vs 现货 ${displayRawNum(o.spotPrice, { prefix: '$' })}</div>
      <div class="big-sub" style="color:${typeColor};margin-top:3px">绝对差值 ${displaySignedMoney(o.basisAbs)}</div>
    </div>
  </div>
  <div class="chart-card">
    <div class="chart-card-hdr">
      <div class="chart-title">基差 30日历史（%）</div>
      <div class="chart-legend">
        <div class="leg-item"><div class="leg-dot" style="background:var(--purple)"></div>基差（perp-spot）/spot %</div>
        <div class="leg-item"><div class="leg-dot" style="background:var(--border-lit);height:2px;width:16px;border-radius:1px"></div>零轴</div>
      </div>
    </div>
    <div class="chart-svg-wrap">
      <svg id="fchart" width="100%" height="160" viewBox="0 0 720 160" preserveAspectRatio="none" style="display:block"></svg>
      <div class="c-tooltip" id="c-tooltip"></div>
    </div>
    <div class="xaxis">${CHART_AXIS}</div>
  </div>
  <div class="g2">
    <div class="card">
      <div class="card-t">价格对比（同 ${o.exchange}）</div>
      <div class="met-row"><div class="met-l">永续合约价</div><div class="met-v">${displayRawNum(o.perpPrice, { prefix: '$' })}</div></div>
      <div class="met-row"><div class="met-l">现货价</div><div class="met-v">${displayRawNum(o.spotPrice, { prefix: '$' })}</div></div>
      <div class="met-row"><div class="met-l">价差（USD）</div><div class="met-v" style="color:${typeColor}">${displaySignedMoney(o.basisAbs)}</div></div>
    </div>
    <div class="card">
      <div class="card-t">组合收益分析</div>
      <div class="met-row"><div class="met-l">基差收益</div><div class="met-v" style="color:${typeColor}">${displayPctTrunc(o.basisPct, { signed: true })}</div></div>
      <div class="met-row"><div class="met-l">Funding 年化</div><div class="met-v" style="color:${annColor}">${annText}</div></div>
      <div class="met-row"><div class="met-l">理论双重收益</div><div class="met-v" style="color:var(--accent)">基差+Funding</div></div>
    </div>
  </div>
  <div class="calc-card calc-card-purple">
    <div class="calc-t">🧮 基差套利执行指引</div>
    <div class="calc-desc" id="basis-calc-desc"></div>
    <div class="inp-row">
      <div class="inp-g">
        <label class="inp-lbl">投入本金</label>
        <div class="inp-wrap"><span class="inp-pfx">$</span><input class="inp-f" id="inp-basis" type="number" value="10000" min="100" onchange="calcBasis()"></div>
      </div>
    </div>
    <div class="steps-box" id="basis-steps"></div>
    <div class="res-table" id="basis-res"></div>
  </div>
  <div class="info-box">
    <div class="info-t">💡 基差与 Funding 的关系</div>
    <div class="info-li">升水（perp > spot）通常意味着 Funding 为正，多头付费给空头，做空 perp 同时可收取 Funding</div>
    <div class="info-li">贴水（perp < spot）通常意味着 Funding 为负，空头付费给多头，策略需反向且注意成本</div>
    <div class="info-li">本策略同时吃基差收敛 + Funding 费率，是比单纯 Funding 套利更完整的 Cash & Carry 形态</div>
  </div>
  <div class="disc">⚠️ 基差不一定线性收敛，可能扩大后再收窄。全程需保证充足保证金率（≥50%），不构成投资建议。</div>
  <div class="risk-box">
    <div class="risk-t">⚠️ 风险提示</div>
    <div class="risk-li">基差扩大风险：极端行情下基差可能扩大至 2%+，触发保证金不足强平</div>
    <div class="risk-li">Funding 翻转：${isPos ? '若市场转熊，Funding 可能变负，空头端需反向付费' : '贴水状态下 Funding 通常为负，持有成本需精细核算'}</div>
    <div class="risk-li">流动性风险：合约 ${displayVolWithUnit(o.perpVolume24h)} / 现货 ${displayVolWithUnit(o.spotVolume24h)}（24h），大额建仓注意滑点</div>
  </div>`;
}

const OI_SIGNAL_META = {
  多头入场: { icon: '📈', desc: 'OI 与价格同步上升，新资金入场做多。趋势确立时的顺势信号，可谨慎跟多，但注意追高风险。', action: ['观察 OI 是否持续增加以确认趋势', '在回调时逢低入场而非追高', '设置止损在近期支撑位'] },
  空头入场: { icon: '📉', desc: 'OI 增加但价格下跌，新空头资金在高位做空。偏空信号，多头持仓建议减仓或做对冲。', action: ['多头用户可适当减仓或止损', '等待 OI 是否继续增加以判断趋势持续性', '不建议逆势抄底'] },
  空头平仓: { icon: '🔼', desc: 'OI 下降但价格上涨，空头被迫止损平仓。短线偏多，但动力来自空头回补而非新多头入场，需观察。', action: ['短线多头可持有，但需观察是否有新多头接力', 'OI 若持续下降，上涨动力减弱，需警惕', '可小仓位参与，控制风险'] },
  多头平仓: { icon: '🔽', desc: 'OI 下降且价格下跌，多头离场平仓。偏空信号，已有多头持仓需注意控制回撤。', action: ['多头持仓建议设置止损保护利润', '等待 OI 企稳后再考虑新的多头入场', '短期不建议加仓'] },
};

export function renderOIDetail(o, opsIdx) {
  const col = symColors[opsIdx % symColors.length];
  const exC = (exColors[o.exchange] || {}).c || '#64748b';
  const hs = hintStyles[o.correlationHint] || { bg: 'rgba(15,23,42,.04)', border: 'rgba(15,23,42,.12)', c: 'var(--t2)' };
  const signalMeta = OI_SIGNAL_META[o.correlationHint] || { icon: '📊', desc: 'OI 与价格变化，方向信号不明确。', action: ['建议观望，等待方向明朗'] };
  const oiChgColor = o.oiChangePct >= 0 ? 'var(--pos)' : 'var(--danger)';

  return `
  <button class="back-btn" onclick="backToRadar()">← 返回列表</button>
  <div class="det-hdr">
    <div class="det-left">
      <div class="det-ttl">
        <div class="sym-ico" style="background:${col}22;color:${col};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">${o.sym.slice(0, 3)}</div>
        ${o.sym}/USDT
        <span style="font-size:14px;font-weight:500;color:var(--t3)">·</span>
        <span style="font-size:14px;font-weight:500;color:${exC}">${o.exchange}</span>
        <span class="type-chip type-chip-oi">OI 异动</span>
      </div>
      <div class="det-meta">
        <span class="hint-badge" style="background:${hs.bg};border-color:${hs.border};color:${hs.c};padding:4px 12px;font-size:12px">${signalMeta.icon} ${o.correlationHint}</span>
        <div style="font-size:11px;color:var(--t3)">OI vs 7日均值</div>
      </div>
    </div>
    <div class="det-right">
      <div class="big-val" style="color:${oiChgColor}">${displayPctTrunc(o.oiChangePct, { signed: true })}</div>
      <div class="big-label">OI vs 7日均值</div>
      <div class="big-sub">当前 ${fmtOI(o.currentOiUsd)} · 均值 ${fmtOI(o.avg7dOiUsd)}</div>
    </div>
  </div>
  <div class="signal-card" style="background:${hs.bg};border-color:${hs.border}">
    <div class="signal-hdr">
      <div class="signal-icon">${signalMeta.icon}</div>
      <div>
        <div class="signal-ttl" style="color:${hs.c}">${o.correlationHint}</div>
        <div style="font-size:11px;color:var(--t2);margin-top:2px">OI ${o.oiChangePct >= 0 ? '↑' : '↓'}${truncateDecimals(Math.abs(o.oiChangePct), 3) ?? '—'}% · 价格 ${o.priceChange24hPct >= 0 ? '↑' : '↓'}${truncateDecimals(Math.abs(o.priceChange24hPct), 3) ?? '—'}%</div>
      </div>
    </div>
    <div class="signal-desc">${signalMeta.desc}</div>
  </div>
  <div class="chart-card">
    <div class="chart-card-hdr">
      <div class="chart-title">OI 与价格 30日走势</div>
      <div class="chart-legend">
        <div class="leg-item"><div class="leg-dot" style="background:var(--orange)"></div>OI（柱状）</div>
        <div class="leg-item"><div class="leg-dot" style="background:var(--accent)"></div>价格走势（线）</div>
      </div>
    </div>
    <div class="chart-svg-wrap">
      <svg id="fchart" width="100%" height="160" viewBox="0 0 720 160" preserveAspectRatio="none" style="display:block"></svg>
      <div class="c-tooltip" id="c-tooltip"></div>
    </div>
    <div class="xaxis">${CHART_AXIS}</div>
  </div>
  <div class="g3">
    <div class="card">
      <div class="card-t">OI 数据</div>
      <div class="met-row"><div class="met-l">当前 OI</div><div class="met-v">${fmtOI(o.currentOiUsd)}</div></div>
      <div class="met-row"><div class="met-l">7日均值 OI</div><div class="met-v">${fmtOI(o.avg7dOiUsd)}</div></div>
      <div class="met-row"><div class="met-l">vs 7日均值</div><div class="met-v" style="color:${oiChgColor}">${displayPctTrunc(o.oiChangePct, { signed: true })}</div></div>
    </div>
    <div class="card">
      <div class="card-t">价格数据</div>
      <div class="met-row"><div class="met-l">24h 涨跌</div><div class="met-v" style="color:${o.priceChange24hPct >= 0 ? 'var(--pos)' : 'var(--danger)'}">${o.priceChange24hPct >= 0 ? '↑' : '↓'} ${truncateDecimals(Math.abs(o.priceChange24hPct), 3) ?? '—'}%</div></div>
      <div class="met-row"><div class="met-l">OI/价格关系</div><div class="met-v" style="color:${hs.c}">${o.correlationHint}</div></div>
      <div class="met-row"><div class="met-l">24h 成交量</div><div class="met-v">${fmtVol(o.volume24h)}</div></div>
    </div>
    <div class="card">
      <div class="card-t">参考操作</div>
      ${signalMeta.action.map((a) => `<div class="met-row" style="align-items:flex-start"><div class="met-v" style="font-size:11px;color:var(--t2);font-family:var(--sans);font-weight:400;line-height:1.6;white-space:normal">· ${a}</div></div>`).join('')}
    </div>
  </div>
  <div class="disc">⚠️ OI 异动信号仅为市场情绪参考，不代表价格必然按信号方向运动，不构成投资建议。请结合更多维度综合判断。</div>
  <div class="risk-box">
    <div class="risk-t">⚠️ 风险提示</div>
    <div class="risk-li">OI 信号滞后：OI 数据反映已发生的持仓变化，对未来价格无预测保证</div>
    <div class="risk-li">极端 OI 反转：OI 极端高位后容易发生急速清算（多杀多/空杀空）</div>
    <div class="risk-li">数据精度：7日均值基于日级聚合数据，精度为日级别</div>
    ${Math.abs(o.oiChangePct) > 50 ? '<div class="risk-li" style="color:var(--warn)">当前 OI 偏离极端（>50%），情绪过热，操作需格外谨慎</div>' : ''}
  </div>`;
}

function makeSeries(base, len, noiseF, lo, hi) {
  let v = base * 0.9;
  const a = [];
  for (let i = 0; i < len; i++) {
    v += (Math.random() - 0.45) * base * noiseF;
    v = Math.max(lo, Math.min(hi, v));
    a.push(parseFloat(v.toFixed(8)));
  }
  a[a.length - 1] = base;
  return a;
}

const CHART_DATES = ['6/1', '6/2', '6/3', '6/4', '6/5', '6/6', '6/7', '6/8', '6/9', '6/10', '6/11', '6/12', '6/13', '6/14', '6/15', '6/16', '6/17', '6/18', '6/19', '6/20', '6/21', '6/22', '6/23', '6/24', '6/25', '6/26', '6/27', '6/28', '6/29', '今天'];

function animPath(id, svg) {
  const el = (svg || document).querySelector(`#${id}`);
  if (!el) return;
  try {
    const l = el.getTotalLength();
    el.style.strokeDasharray = l;
    el.style.strokeDashoffset = l;
    el.style.transition = 'stroke-dashoffset 1.15s cubic-bezier(.4,0,.2,1)';
    requestAnimationFrame(() => { el.style.strokeDashoffset = 0; });
  } catch (_) { /* ignore */ }
}

function attachChartHover(root, svg) {
  const tip = root.querySelector('#c-tooltip');
  if (!tip || !svg) return;
  svg.querySelectorAll('.hpt').forEach((el) => {
    el.addEventListener('mouseenter', function onEnter() {
      tip.style.opacity = '1';
      tip.innerHTML = `<span style="color:var(--accent)">${this.dataset.v}</span> <span style="color:var(--t3)">·</span> ${CHART_DATES[+this.dataset.i] || ''}`;
      const r = svg.getBoundingClientRect();
      const er = this.getBoundingClientRect();
      const left = Math.max(0, Math.min(er.left - r.left - tip.offsetWidth / 2 + 8, r.width - tip.offsetWidth));
      tip.style.left = `${left}px`;
      tip.style.top = `${er.top - r.top - 44}px`;
    });
    el.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
  });
}

export function initSpreadChart(root, o) {
  const svg = root.querySelector('#fchart');
  if (!svg || !o) return;
  const W = 720; const H = 160; const px = 20; const py = 14;
  const base1 = parseFloat(o.minPrice) || 1;
  const base2 = parseFloat(o.maxPrice) || base1 * 1.01;
  const d1 = makeSeries(base1, 30, 0.005, base1 * 0.97, base1 * 1.03);
  const d2 = d1.map((v, i) => (i === 29 ? base2 : v * (1 + ((Number(o.spreadPct) || 0) / 100) * (0.4 + Math.random() * 0.6))));
  const all = [...d1, ...d2];
  const mn = Math.min(...all) * 0.999;
  const mx = Math.max(...all) * 1.001;
  const rng = mx - mn;
  const xS = (W - px * 2) / (d1.length - 1);
  const toY = (v) => py + (1 - (v - mn) / rng) * (H - py * 2);
  const p1 = d1.map((v, i) => ({ x: px + i * xS, y: toY(v), v }));
  const p2 = d2.map((v, i) => ({ x: px + i * xS, y: toY(v), v }));
  const path = (ps) => {
    let d = `M${ps[0].x},${ps[0].y}`;
    for (let i = 1; i < ps.length; i++) {
      const cx = (ps[i - 1].x + ps[i].x) / 2;
      d += ` C${cx},${ps[i - 1].y} ${cx},${ps[i].y} ${ps[i].x},${ps[i].y}`;
    }
    return d;
  };
  const d1s = path(p1);
  const d2s = path(p2);
  svg.innerHTML = `<defs>
    <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".18"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient>
    <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--blue)" stop-opacity=".18"/><stop offset="100%" stop-color="var(--blue)" stop-opacity="0"/></linearGradient>
  </defs>
  <path d="${d1s} L${p1[p1.length - 1].x},${H} L${p1[0].x},${H} Z" fill="url(#ag1)"/>
  <path d="${d2s} L${p2[p2.length - 1].x},${H} L${p2[0].x},${H} Z" fill="url(#ag2)"/>
  <path id="l1" d="${d1s}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
  <path id="l2" d="${d2s}" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round"/>
  <circle cx="${p1[p1.length - 1].x}" cy="${p1[p1.length - 1].y}" r="4" fill="var(--accent)" stroke="var(--bg)" stroke-width="2"/>
  <circle cx="${p2[p2.length - 1].x}" cy="${p2[p2.length - 1].y}" r="4" fill="var(--blue)" stroke="var(--bg)" stroke-width="2"/>
  ${p1.map((p, i) => `<rect x="${p.x - 12}" y="0" width="24" height="${H}" fill="transparent" class="hpt" data-i="${i}" data-v="${p1[i].v.toFixed(4)} / ${p2[i].v.toFixed(4)}"/>`).join('')}`;
  animPath('l1', svg);
  animPath('l2', svg);
  attachChartHover(root, svg);
}

export function initBasisChart(root, o) {
  const svg = root.querySelector('#fchart');
  if (!svg || !o) return;
  const W = 720; const H = 160; const px = 20; const py = 14;
  const data = makeSeries(Number(o.basisPct) || 0, 30, 0.6, (Number(o.basisPct) || 0) * -0.8, (Number(o.basisPct) || 0) * 2.8);
  const mn = Math.min(Math.min(...data) * 1.3, -0.15);
  const mx = Math.max(...data) * 1.15;
  const rng = mx - mn;
  const xS = (W - px * 2) / (data.length - 1);
  const toY = (v) => py + (1 - (v - mn) / rng) * (H - py * 2);
  const pts = data.map((v, i) => ({ x: px + i * xS, y: toY(v), v }));
  const zeroY = toY(0);
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C${cx},${pts[i - 1].y} ${cx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  svg.innerHTML = `<defs><linearGradient id="agB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--purple)" stop-opacity=".28"/><stop offset="100%" stop-color="var(--purple)" stop-opacity="0"/></linearGradient></defs>
  <path d="${d} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z" fill="url(#agB)"/>
  <line x1="${px}" y1="${zeroY}" x2="${W - px}" y2="${zeroY}" stroke="var(--border-lit)" stroke-width="1.2" stroke-dasharray="5,4" opacity=".8"/>
  <path id="bline" d="${d}" fill="none" stroke="var(--purple)" stroke-width="2" stroke-linecap="round"/>
  ${pts.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="5" fill="transparent" class="hpt" data-i="${i}" data-v="${p.v.toFixed(4)}%"/>`).join('')}
  <circle cx="${pts[pts.length - 1].x}" cy="${pts[pts.length - 1].y}" r="4" fill="var(--purple)" stroke="var(--bg)" stroke-width="2"/>`;
  animPath('bline', svg);
  attachChartHover(root, svg);
}

export function initOIChart(root, o) {
  const svg = root.querySelector('#fchart');
  if (!svg || !o) return;
  const W = 720; const H = 160; const px = 20; const py = 14; const bw = 15;
  const oiData = makeSeries(o.currentOiUsd, 30, 0.15, o.avg7dOiUsd * 0.5, o.currentOiUsd * 1.5);
  const priceData = makeSeries(1, 30, 0.04, 0.75, 1.4);
  const oiMn = Math.min(...oiData) * 0.9;
  const oiMx = Math.max(...oiData) * 1.05;
  const pMn = Math.min(...priceData) * 0.99;
  const pMx = Math.max(...priceData) * 1.01;
  const xS = (W - px * 2) / (oiData.length - 1);
  const toOiY = (v) => py + (1 - (v - oiMn) / (oiMx - oiMn)) * (H - py * 2);
  const toPY = (v) => py + (1 - (v - pMn) / (pMx - pMn)) * (H - py * 2);
  const pPts = priceData.map((v, i) => ({ x: px + i * xS, y: toPY(v), v }));
  let pPath = `M${pPts[0].x},${pPts[0].y}`;
  for (let i = 1; i < pPts.length; i++) {
    const cx = (pPts[i - 1].x + pPts[i].x) / 2;
    pPath += ` C${cx},${pPts[i - 1].y} ${cx},${pPts[i].y} ${pPts[i].x},${pPts[i].y}`;
  }
  const avgY = toOiY(o.avg7dOiUsd);
  const bars = oiData.map((v, i) => {
    const bx = px + i * xS - bw / 2;
    const bh = Math.max(2, ((v - oiMn) / (oiMx - oiMn)) * (H - py * 2));
    const by = H - py - bh;
    const up = i === 0 || v >= oiData[i - 1];
    return `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${up ? 'rgba(249,115,22,.5)' : 'rgba(249,115,22,.25)'}" rx="2" class="hpt" data-i="${i}" data-v="OI ${fmtOI(v)}"/>`;
  }).join('');
  svg.innerHTML = `<defs><linearGradient id="agOI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".18"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
  ${bars}
  <line x1="${px}" y1="${avgY}" x2="${W - px}" y2="${avgY}" stroke="var(--warn)" stroke-width="1" stroke-dasharray="5,4" opacity=".65"/>
  <path d="${pPath} L${pPts[pPts.length - 1].x},${H} L${pPts[0].x},${H} Z" fill="url(#agOI)"/>
  <path id="oiline" d="${pPath}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
  <circle cx="${pPts[pPts.length - 1].x}" cy="${pPts[pPts.length - 1].y}" r="4" fill="var(--accent)" stroke="var(--bg)" stroke-width="2"/>`;
  animPath('oiline', svg);
  attachChartHover(root, svg);
}

export function calcSpread(root, o) {
  if (!o || !root) return;
  const principal = parseFloat(root.querySelector('#inp-spread')?.value) || 10000;
  const feeRate = 0.001;
  const spreadPctNum = Number(o.spreadPct) || 0;
  const netSpread = spreadPctNum - feeRate * 2 * 100;
  const spreadPctText = truncateDecimals(o.spreadPct, 3);
  const steps = root.querySelector('#spread-steps');
  if (steps) {
    steps.innerHTML = `
      <div class="step-row"><div class="step-n">1</div><div class="step-txt">在 ${o.minExchange} 以 ${displayRawNum(o.minPrice, { prefix: '$' })} 买入 ${o.sym}</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>
      <div class="step-row"><div class="step-n">2</div><div class="step-txt">将 ${o.sym} 转账至 ${o.maxExchange}（链上或内部划转）</div><div class="step-amt">等待确认</div></div>
      <div class="step-row"><div class="step-n">3</div><div class="step-txt">在 ${o.maxExchange} 以 ${displayRawNum(o.maxPrice, { prefix: '$' })} 卖出 ${o.sym}</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>`;
  }
  const res = root.querySelector('#spread-res');
  if (res) {
    res.innerHTML = `
      <div class="res-row"><div class="res-l">毛价差收入（${spreadPctText == null ? '—' : `${spreadPctText}%`}）</div><div class="res-v p">+$${(principal * spreadPctNum / 100).toFixed(2)}</div></div>
      <div class="res-row"><div class="res-l">双所手续费（各 0.10%）</div><div class="res-v n">-$${(principal * 0.002).toFixed(2)}</div></div>
      <div class="res-row tot"><div class="res-l" style="font-weight:600;color:var(--t1)">单次净收益</div><div class="res-v tot" style="color:${netSpread > 0 ? 'var(--accent)' : 'var(--danger)'}">
        ${netSpread > 0 ? '+' : ''}$${(principal * netSpread / 100).toFixed(2)}
        <span style="font-size:11px;color:var(--t2)">（${netSpread > 0 ? '+' : ''}${truncateDecimals(netSpread, 3) ?? netSpread}%）</span>
      </div></div>`;
  }
}

export function calcBasis(root, o) {
  if (!o || !root) return;
  const principal = parseFloat(root.querySelector('#inp-basis')?.value) || 10000;
  const basisPctNum = Number(o.basisPct) || 0;
  const isPos = basisPctNum >= 0;
  const fundingAnn = Number(o.ann) || 0;
  const annRaw = o.ann == null || o.ann === '' ? null : truncateDecimals(o.ann, 3);
  const desc = root.querySelector('#basis-calc-desc');
  if (desc) {
    desc.textContent = isPos
      ? `当前策略：在 ${o.exchange} 买入现货 + 做空永续，等待基差收敛至零`
      : `当前策略：在 ${o.exchange} 做多永续 + 持有/借入现货做空，等待基差收敛`;
  }
  const steps = root.querySelector('#basis-steps');
  if (steps) {
    steps.innerHTML = isPos ? `
      <div class="step-row"><div class="step-n">1</div><div class="step-txt">在 ${o.exchange} 买入 ${o.sym} 现货，价格 ${displayRawNum(o.spotPrice, { prefix: '$' })}</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>
      <div class="step-row"><div class="step-n">2</div><div class="step-txt">在 ${o.exchange} 做空等量 ${o.sym} 永续合约（1x 杠杆），价格 ${displayRawNum(o.perpPrice, { prefix: '$' })}</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>
      <div class="step-row"><div class="step-n">3</div><div class="step-txt">持续收取 Funding 费率（${annRaw == null ? '—' : `${Number(o.ann) > 0 ? '+' : ''}${annRaw}%`}/年）并等待基差收敛</div><div class="step-amt">长期持有</div></div>`
      : `
      <div class="step-row"><div class="step-n">1</div><div class="step-txt">在 ${o.exchange} 做多 ${o.sym} 永续合约（1x 杠杆），价格 ${displayRawNum(o.perpPrice, { prefix: '$' })}</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>
      <div class="step-row"><div class="step-n">2</div><div class="step-txt">在 ${o.exchange} 借入并做空 ${o.sym} 现货，价格 ${displayRawNum(o.spotPrice, { prefix: '$' })}</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>
      <div class="step-row"><div class="step-n">3</div><div class="step-txt">贴水环境下 Funding 可能为负（空头付费），需综合评估</div><div class="step-amt">谨慎评估</div></div>`;
  }
  const res = root.querySelector('#basis-res');
  if (res) {
    const basisGain = principal * Math.abs(basisPctNum) / 100;
    const fundingGain = principal * Math.abs(fundingAnn) / 100 * 30 / 365;
    const fees = principal * 0.003;
    const total = basisGain + fundingGain - fees;
    res.innerHTML = `
      <div class="res-row"><div class="res-l">基差部分（若完全收敛）</div><div class="res-v p">+$${basisGain.toFixed(2)}</div></div>
      <div class="res-row"><div class="res-l">Funding 收益（按30天估算）</div><div class="res-v p">+$${fundingGain.toFixed(2)}</div></div>
      <div class="res-row"><div class="res-l">手续费（开+平 × 2）</div><div class="res-v n">-$${fees.toFixed(2)}</div></div>
      <div class="res-row tot"><div class="res-l" style="font-weight:600;color:var(--t1)">30日预期净收益</div><div class="res-v tot">+$${total.toFixed(2)}</div></div>`;
  }
}
