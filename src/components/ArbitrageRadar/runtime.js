/* eslint-disable */
/** Adapted from public/mozi-radar.html */
import i18n from '@/i18n/config';
import {
  fetchCryptoArbFundingList,
  fetchCryptoArbSpreadList,
  fetchCryptoArbBasisList,
  fetchCryptoArbOIList,
  fetchCryptoArbFundingDetail,
  fetchCryptoArbSpreadDetail,
  fetchCryptoArbBasisDetail,
  fetchCryptoArbOIDetail,
} from '@/api/cryptoArb';
import {
  exColors,
  TAB_LABELS,
  renderIntroStrip,
  renderTypeTabs,
  tableHeadHTML,
  tableRowHTML,
  skeletonCellsHTML,
  mapSpreadItem,
  mapBasisItem,
  mapOIItem,
  renderSpreadDetail,
  renderBasisDetail,
  renderOIDetail,
  initSpreadChart,
  initBasisChart,
  initOIChart,
  calcSpread as calcSpreadTab,
  calcBasis as calcBasisTab,
  truncateDecimals,
  displayPctTrunc,
  displayRawNum,
  fmtOI,
  renderMobileListCards,
  renderMobileListSkeleton,
  symIco,
  parseLogoUrl,
} from './arbitrageTabs';

const LIST_PAGE_SIZE = 8;

function parseFundingPct(raw) {
  const n = parseFloat(String(raw ?? '').replace(/%/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function parsePeriodLabel(raw) {
  const s = String(raw ?? '').trim();
  return s || '8h';
}

function mapFundingItem(item, index) {
  if (!item || typeof item !== 'object') return null;
  const periodLabel = parsePeriodLabel(item.currentFundingPeriod ?? item.period);
  const periodMatch = periodLabel.match(/(\d+)/);
  const avg30Raw = item.mean30dPct;
  const avg30 =
    avg30Raw == null || avg30Raw === ''
      ? null
      : Number.isFinite(Number(avg30Raw))
        ? Number(avg30Raw)
        : null;
  const perp = Number(item.perpPrice ?? item.perp_price ?? item.perp);
  const spot = Number(item.spotPrice ?? item.spot_price ?? item.spot);
  const basisRaw = Number(item.basisPct ?? item.basis_pct ?? item.basis);
  const basis =
    Number.isFinite(basisRaw)
      ? basisRaw
      : Number.isFinite(perp) && Number.isFinite(spot) && spot !== 0
        ? ((perp - spot) / spot) * 100
        : null;
  const oiUsd = Number(
    item.oiUsd ?? item.oi_usd ?? item.openInterestUsd ?? item.currentOiUsd ?? item.current_oi_usd
  );
  const oiContracts = Number(item.oi ?? item.openInterest ?? item.open_interest);
  const oi24h = Number(item.oiChange24hPct ?? item.oi_change_24h_pct ?? item.oi24h);
  const oi7d = Number(item.oiChange7dPct ?? item.oi_change_7d_pct ?? item.oi7d);
  const takerFeeRate = Number(item.takerFeeRate ?? item.taker_fee_rate);
  const makerFeeRate = Number(item.makerFeeRate ?? item.maker_fee_rate);
  const openFeeRate = Number(item.openFeeRate ?? item.open_fee_rate);
  const closeFeeRate = Number(item.closeFeeRate ?? item.close_fee_rate);
  const settlementsPerDay = Number(
    item.fundingSettlementsPerDay ?? item.funding_settlements_per_day
  );
  const marginBufferRatio = Number(
    item.marginBufferRatio ?? item.margin_buffer_ratio
  );
  return {
    rank: Number(item.rank) || index + 1,
    sym: String(item.symbol || item.sym || '').trim().toUpperCase() || '—',
    exchange: String(item.exchange || '').trim() || '—',
    funding: parseFundingPct(item.currentFunding ?? item.funding),
    period: periodMatch ? Number(periodMatch[1]) : 8,
    periodLabel,
    ann: Number.isFinite(Number(item.annualizedPct)) ? Number(item.annualizedPct) : 0,
    avg30,
    days: Number.isFinite(Number(item.continuousDays)) ? Number(item.continuousDays) : 0,
    rating: Math.max(1, Math.min(5, Math.floor(Number(item.rating) || 0) || 1)),
    warn: String(item.riskTag || '') === 'warning_extreme',
    riskTooltip: item.riskTooltip != null ? String(item.riskTooltip) : null,
    quoteVolume24h: item.quoteVolume24h != null ? String(item.quoteVolume24h) : null,
    nextFundingTs: Number(item.nextFundingTs) || 0,
    dataTs: Number(item.dataTs) || 0,
    oiUsd: Number.isFinite(oiUsd) ? oiUsd : null,
    oiContracts: Number.isFinite(oiContracts) ? oiContracts : null,
    oi: Number.isFinite(oiUsd) ? oiUsd : Number.isFinite(oiContracts) ? oiContracts : null,
    oi24h: Number.isFinite(oi24h) ? oi24h : null,
    oi7d: Number.isFinite(oi7d) ? oi7d : null,
    basis: Number.isFinite(basis) ? basis : null,
    perp: Number.isFinite(perp) ? perp : null,
    spot: Number.isFinite(spot) ? spot : null,
    takerFeeRate: Number.isFinite(takerFeeRate) ? takerFeeRate : null,
    makerFeeRate: Number.isFinite(makerFeeRate) ? makerFeeRate : null,
    openFeeRate: Number.isFinite(openFeeRate) ? openFeeRate : null,
    closeFeeRate: Number.isFinite(closeFeeRate) ? closeFeeRate : null,
    fundingSettlementsPerDay:
      Number.isFinite(settlementsPerDay) && settlementsPerDay > 0 ? settlementsPerDay : null,
    marginBufferRatio:
      Number.isFinite(marginBufferRatio) && marginBufferRatio > 0 ? marginBufferRatio : null,
    logoUrl: parseLogoUrl(item),
  };
}

export function mountArbitrageRadar(__root, options = {}) {
  if (!__root || __root.__mounted) return () => {};
  __root.__mounted = true;
  const embedded = !!options.embedded;

  const _intervals = [];
  const _timeouts = [];
  // Must call native timers — local setInterval/setTimeout below would recurse otherwise
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);
  const nativeClearTimeout = window.clearTimeout.bind(window);
  const setInterval = (fn, t) => {
    const id = nativeSetInterval(fn, t);
    _intervals.push(id);
    return id;
  };
  const setTimeout = (fn, t) => {
    const id = nativeSetTimeout(fn, t);
    _timeouts.push(id);
    return id;
  };

  if (embedded) __root.classList.add('is-embedded');
  else __root.classList.remove('is-embedded');
  if (options.detailOnly) __root.classList.add('is-detail-only');
  else __root.classList.remove('is-detail-only');

  const onNavigateDetail = typeof options.onNavigateDetail === 'function' ? options.onNavigateDetail : null;
  const onBackToList = typeof options.onBackToList === 'function' ? options.onBackToList : null;
  const detailOnly = !!options.detailOnly;

  const MOBILE_MQ = '(max-width: 768px)';
  function isMobileLayout() {
    // 嵌入 PC 首页保持表格；独立页窄屏用卡片列表
    if (embedded) return false;
    try {
      return window.matchMedia(MOBILE_MQ).matches;
    } catch (_) {
      return false;
    }
  }
  function syncMobileClass() {
    __root.classList.toggle('is-mobile', isMobileLayout());
  }
  syncMobileClass();
  const mq = window.matchMedia(MOBILE_MQ);
  const onMqChange = () => {
    const wasMobile = __root.classList.contains('is-mobile');
    syncMobileClass();
    const nowMobile = __root.classList.contains('is-mobile');
    if (wasMobile !== nowMobile && currentView === 'radar') render();
  };
  if (mq.addEventListener) mq.addEventListener('change', onMqChange);
  else if (mq.addListener) mq.addListener(onMqChange);

  __root.innerHTML = embedded
    ? `<main class="main" id="main"></main><div id="toast"><span id="toast-txt"></span></div>`
    : `
<header class="hdr">
  <button type="button" class="hdr-back" id="nav-back" aria-label="返回"><svg class="hdr-back-ico" viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M31.7053818,5.11219264 L13.5234393,22.6612572 L13.5234393,22.6612572 C12.969699,23.2125856 12.9371261,24.0863155 13.4257204,24.6755735 L13.5234393,24.7825775 L31.7045714,42.8834676 C31.7795345,42.9580998 31.8810078,43 31.9867879,43 L35.1135102,43 C35.3344241,43 35.5135102,42.8209139 35.5135102,42.6 C35.5135102,42.4936115 35.4711279,42.391606 35.3957362,42.316542 L16.7799842,23.7816937 L16.7799842,23.7816937 L35.3764658,5.6866816 C35.5347957,5.53262122 35.5382568,5.27937888 35.3841964,5.121049 C35.3088921,5.04365775 35.205497,5 35.0975148,5 L31.9831711,5 C31.8795372,5 31.7799483,5.04022164 31.7053818,5.11219264 Z"/></svg></button>
  <div class="hdr-center">
    <div class="hdr-title" id="hdr-title">${TAB_LABELS[options.initialTab || 'funding'] || 'Funding 套利'}</div>
  </div>
</header>
<main class="main" id="main"></main>
<div id="toast"><span id="toast-txt"></span></div>`;

  
// ===== DATA（接口填充，最多展示 8 条）=====
const ops = [];
let listLoading = true;
let listError = null;
let listRequestId = 0;
let listPage = 1;
let listTotal = 0;

  const exColorsLocal = exColors;
const symColors = ['#00B890','#D97706','#6366F1','#DB2777','#0D9488','#7C3AED','#EA580C','#0891B2'];

// State
let currentView = detailOnly ? 'detail' : 'radar';
let selectedOp = null;
let selectedType = 'funding';
let activeTab = options.initialTab || 'funding';
if (detailOnly) {
  const dt = String(options.detailType || 'funding').trim();
  selectedType = ['funding', 'spread', 'basis', 'oi'].includes(dt) ? dt : 'funding';
  activeTab = selectedType;
  selectedOp = {
    sym: String(options.detailSymbol || '').trim().toUpperCase(),
    exchange: String(options.detailExchange || '').trim(),
    minExchange: String(options.detailMinExchange || '').trim() || undefined,
    maxExchange: String(options.detailMaxExchange || '').trim() || undefined,
    logoUrl: (() => {
      const u = String(options.detailLogoUrl || '').trim();
      return /^https?:\/\//i.test(u) ? u : null;
    })(),
  };
  listLoading = false;
}
let sortState = { key: null, dir: 'desc' }; // funding|ann|spreadAbs|spreadPct|quoteVolume|basisAbs|basisPct|changePct|null；默认不选中
let calcState = {principal:10000, period:30, costRate:10};
let countdown = {h:3,m:22,s:0};
let detailLoading = !!detailOnly;
let detailError = null;
let detailRequestId = 0;

function replaceOps(items) {
  ops.length = 0;
  (items || []).forEach((item) => ops.push(item));
}

function buildFundingQuery() {
  if (sortState.key === 'funding') {
    return { fundingSort: sortState.dir };
  }
  if (sortState.key === 'ann') {
    return { annSort: sortState.dir || 'desc' };
  }
  return {};
}

/** 现货价差排序：绝对价差 / 百分比价差 / 24h 成交量；都不传则服务端默认百分比降序 */
function buildSpreadQuery() {
  if (sortState.key === 'spreadAbs') {
    return { spreadAbsSort: sortState.dir };
  }
  if (sortState.key === 'spreadPct') {
    return { spreadPctSort: sortState.dir };
  }
  if (sortState.key === 'quoteVolume') {
    return { quoteVolumeSort: sortState.dir };
  }
  return {};
}

/** 期现基差排序：绝对基差 / 百分比基差；都不传则服务端默认百分比降序 */
function buildBasisQuery() {
  if (sortState.key === 'basisAbs') {
    return { basisAbsSort: sortState.dir };
  }
  if (sortState.key === 'basisPct') {
    return { basisPctSort: sortState.dir };
  }
  return {};
}

/** OI 异动排序：相对 7 日均值偏离 %；不传则服务端默认降序 */
function buildOiQuery() {
  if (sortState.key === 'changePct') {
    return { changePctSort: sortState.dir };
  }
  return {};
}

function applyDataDelay(sec) {
  if (!Number.isFinite(sec) || sec < 0) return;
  delayVal = Math.max(0, Math.round(sec));
  const el = __root.querySelector('#delay-val');
  if (el) el.textContent = delayVal;
}

function syncHeaderTitle() {
  const el = __root.querySelector('#hdr-title');
  if (!el) return;
  if (detailOnly && selectedOp?.sym) {
    el.textContent = `${selectedOp.sym}${selectedOp.exchange ? ` · ${selectedOp.exchange}` : ''}`;
    return;
  }
  el.textContent = TAB_LABELS[activeTab] || '套利专区';
}

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = '/home';
}

function getTotalPages() {
  return Math.max(1, Math.ceil((ops.length || 0) / LIST_PAGE_SIZE));
}

function clampListPage() {
  const max = getTotalPages();
  if (listPage > max) listPage = max;
  if (listPage < 1) listPage = 1;
}

function setListPage(page) {
  const next = Math.max(1, Math.min(getTotalPages(), Number(page) || 1));
  if (next === listPage) return;
  listPage = next;
  if (currentView === 'radar') {
    // 分页只换表体，避免整页重绘带动 intro 动画抖动
    if (!syncRadarTableDom()) render();
  }
}

async function loadActiveList({ showSkeleton, soft } = {}) {
  const reqId = ++listRequestId;
  const shouldShowSkeleton = showSkeleton != null ? !!showSkeleton : ops.length === 0;
  listLoading = true;
  listError = null;
  // 首次加载：出骨架；排序等 soft 刷新保留旧行，只在结束后局部更新表体
  if (currentView === 'radar' && shouldShowSkeleton) render();

  const loaders = {
    funding: () => fetchCryptoArbFundingList(buildFundingQuery()),
    spread: () => fetchCryptoArbSpreadList(buildSpreadQuery()),
    basis: () => fetchCryptoArbBasisList(buildBasisQuery()),
    oi: () => fetchCryptoArbOIList(buildOiQuery()),
  };
  const mappers = {
    funding: mapFundingItem,
    spread: mapSpreadItem,
    basis: mapBasisItem,
    oi: mapOIItem,
  };

  try {
    const result = await loaders[activeTab]();
    if (reqId !== listRequestId) return;
    const mapped = (result.list || [])
      .map((item, i) => mappers[activeTab](item, i))
      .filter(Boolean);
    replaceOps(mapped);
    listTotal = Number(result.total) || mapped.length;
    clampListPage();
    applyDataDelay(result.dataDelaySec);
  } catch (err) {
    if (reqId !== listRequestId) return;
    listError = err?.message || String(err);
    replaceOps([]);
    listTotal = 0;
    listPage = 1;
  } finally {
    if (reqId !== listRequestId) return;
    listLoading = false;
    if (currentView === 'radar') {
      // 接口返回只换表体/分页，避免 intro 入场动画再跑一遍造成闪烁
      if (syncRadarTableDom()) return;
      render();
    }
  }
}

async function loadFundingList(opts) {
  return loadActiveList(opts);
}

function sortBy(key) {
  const fundingKeys = ['funding', 'ann'];
  const spreadKeys = ['spreadAbs', 'spreadPct', 'quoteVolume'];
  const basisKeys = ['basisAbs', 'basisPct'];
  const oiKeys = ['changePct'];
  const allowed =
    (activeTab === 'funding' && fundingKeys.includes(key)) ||
    (activeTab === 'spread' && spreadKeys.includes(key)) ||
    (activeTab === 'basis' && basisKeys.includes(key)) ||
    (activeTab === 'oi' && oiKeys.includes(key));
  if (!allowed) return;

  // 服务端默认排序列：再点「默认降序」时取消激活态（key=null），不展示选中色
  const defaultDescKeys = {
    spread: 'spreadPct',
    basis: 'basisPct',
    oi: 'changePct',
  };
  const defaultKey = defaultDescKeys[activeTab];

  if (key === defaultKey) {
    // 三态：无激活(默认降序) → 降序激活 → 升序 → 无激活
    if (sortState.key == null) {
      // 首次点击：显式降序并激活（一点即亮下箭头）
      sortState.key = key;
      sortState.dir = 'desc';
    } else if (sortState.key === key && sortState.dir === 'desc') {
      sortState.key = key;
      sortState.dir = 'asc';
    } else if (sortState.key === key && sortState.dir === 'asc') {
      sortState.key = null;
      sortState.dir = 'desc';
    } else {
      // 从其他列切到默认列：直接降序激活
      sortState.key = key;
      sortState.dir = 'desc';
    }
  } else if (sortState.key === key) {
    sortState.dir = sortState.dir === 'desc' ? 'asc' : 'desc';
  } else {
    sortState.key = key;
    sortState.dir = 'desc';
  }
  listPage = 1;
  // 只亮箭头、保留旧行，避免骨架/整页重绘抖动
  patchSortHeaders();
  if (isMobileLayout()) {
    __root.querySelector('#list-cards')?.classList.add('is-busy');
  } else {
    __root.querySelector('#tbl-body-scroll')?.classList.add('is-busy');
  }
  loadActiveList({ showSkeleton: false, soft: true });
}

function getDisplayOps() {
  clampListPage();
  const start = (listPage - 1) * LIST_PAGE_SIZE;
  return ops.slice(start, start + LIST_PAGE_SIZE);
}

/** 页码窗口：当前页附近若干页 + 首尾 */
function getPagerPages(totalPages, current) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set([1, totalPages, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

function renderPager() {
  if (listLoading || listError || ops.length <= LIST_PAGE_SIZE) return '';
  clampListPage();
  const totalPages = getTotalPages();
  const pages = getPagerPages(totalPages, listPage);
  const prevDisabled = listPage <= 1;
  const nextDisabled = listPage >= totalPages;
  const totalLabel = listTotal > 0 ? listTotal : ops.length;

  return `<div class="tbl-pager" role="navigation" aria-label="列表分页">
    <button type="button" class="pager-btn pager-nav"${prevDisabled ? ' disabled' : ''} onclick="setListPage(${listPage - 1})" aria-label="上一页">‹</button>
    ${pages.map((p) => (
      p === '…'
        ? '<span class="pager-ellipsis">…</span>'
        : `<button type="button" class="pager-btn${p === listPage ? ' on' : ''}" onclick="setListPage(${p})" aria-current="${p === listPage ? 'page' : 'false'}">${p}</button>`
    )).join('')}
    <button type="button" class="pager-btn pager-nav"${nextDisabled ? ' disabled' : ''} onclick="setListPage(${listPage + 1})" aria-label="下一页">›</button>
    <span class="pager-meta">${listPage}/${totalPages} · ${totalLabel}条</span>
  </div>`;
}

function sortInd(key) {
  // key=null 表示服务端默认排序，表头不激活；显式升/降序时对应箭头亮
  const on = sortState.key === key;
  const up = on && sortState.dir === 'asc' ? 'on' : '';
  const dn = on && sortState.dir === 'desc' ? 'on' : '';
  return `<span class="sort-ind" data-sort-key="${key}" aria-hidden="true"><span class="sort-up ${up}">▲</span><span class="sort-dn ${dn}">▼</span></span>`;
}

// ===== NAVIGATION =====
function nav(view) {
  currentView = view;
  __root.querySelectorAll('.nbtn').forEach(b=>b.classList.remove('on'));
  const btn = __root.querySelector('#nav-'+view);
  if(btn) btn.classList.add('on');
  render();
}

function openDetail(op, type = activeTab) {
  const t = type || activeTab || 'funding';
  // 独立路由：跳转到 /arbitrage/detail
  if (onNavigateDetail && !detailOnly) {
    onNavigateDetail(op, t);
    return;
  }
  selectedOp = op;
  selectedType = t;
  currentView = 'detail';
  detailError = null;
  detailLoading = false;
  if (
    (selectedType === 'funding' ||
      selectedType === 'spread' ||
      selectedType === 'basis' ||
      selectedType === 'oi') &&
    op
  ) {
    detailLoading = true;
    render();
    if (selectedType === 'funding') loadFundingDetail(op);
    else if (selectedType === 'spread') loadSpreadDetail(op);
    else if (selectedType === 'basis') loadBasisDetail(op);
    else loadOIDetail(op);
  } else {
    render();
  }
  const scroller = __root.closest('[class*="contentMain"]') || __root;
  if (scroller && scroller.scrollTo) scroller.scrollTo({ top: 0, behavior: 'smooth' });
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadFundingDetail(op) {
  const reqId = ++detailRequestId;
  const symbol = String(op?.sym || op?.symbol || '').trim();
  const exchange = String(op?.exchange || '').trim();
  detailLoading = true;
  detailError = null;
  try {
    const detail = await fetchCryptoArbFundingDetail({ symbol, exchange });
    if (reqId !== detailRequestId) return;
    selectedOp = {
      ...op,
      ...(detail.sym ? { sym: detail.sym } : {}),
      ...(detail.exchange ? { exchange: detail.exchange } : {}),
      funding: detail.funding != null ? detail.funding : op.funding,
      ann: detail.ann != null ? detail.ann : op.ann,
      avg30: detail.avg30,
      days: detail.days,
      rating: detail.rating != null ? detail.rating : op.rating,
      chart30d: detail.chart30d,
      perp: detail.perp != null ? detail.perp : op.perp,
      spot: detail.spot != null ? detail.spot : op.spot,
      basis: detail.basis != null ? detail.basis : op.basis,
      oi: detail.oi != null ? detail.oi : op.oi,
      oiUsd: detail.oiUsd != null ? detail.oiUsd : op.oiUsd,
      oiContracts: detail.oiContracts != null ? detail.oiContracts : op.oiContracts,
      oi24h: detail.oi24h,
      oi7d: detail.oi7d,
      takerFeeRate: detail.takerFeeRate != null ? detail.takerFeeRate : op.takerFeeRate,
      makerFeeRate: detail.makerFeeRate != null ? detail.makerFeeRate : op.makerFeeRate,
      openFeeRate: detail.openFeeRate != null ? detail.openFeeRate : op.openFeeRate,
      closeFeeRate: detail.closeFeeRate != null ? detail.closeFeeRate : op.closeFeeRate,
      fundingSettlementsPerDay:
        detail.fundingSettlementsPerDay != null
          ? detail.fundingSettlementsPerDay
          : op.fundingSettlementsPerDay,
      marginBufferRatio:
        detail.marginBufferRatio != null ? detail.marginBufferRatio : op.marginBufferRatio,
      periodLabel: detail.periodLabel || op.periodLabel,
      period: detail.period != null ? detail.period : op.period,
      nextFundingTs:
        detail.nextFundingTs != null && detail.nextFundingTs > 0
          ? detail.nextFundingTs
          : op.nextFundingTs,
      logoUrl: detail.logoUrl || op.logoUrl || null,
      detailLoaded: true,
    };
    detailLoading = false;
    detailError = null;
  } catch (err) {
    if (reqId !== detailRequestId) return;
    detailLoading = false;
    detailError = err?.message || String(err) || '加载详情失败';
  }
  if (currentView === 'detail' && selectedType === 'funding') render();
}

async function loadSpreadDetail(op) {
  const reqId = ++detailRequestId;
  const symbol = String(op?.sym || op?.symbol || '').trim();
  detailLoading = true;
  detailError = null;
  try {
    const detail = await fetchCryptoArbSpreadDetail({ symbol });
    if (reqId !== detailRequestId) return;
    selectedOp = {
      ...op,
      ...(detail.sym ? { sym: detail.sym } : {}),
      ...(detail.minExchange ? { minExchange: detail.minExchange } : {}),
      ...(detail.maxExchange ? { maxExchange: detail.maxExchange } : {}),
      minPrice: detail.minPrice != null ? detail.minPrice : op.minPrice,
      maxPrice: detail.maxPrice != null ? detail.maxPrice : op.maxPrice,
      avgPrice: detail.avgPrice != null ? detail.avgPrice : op.avgPrice,
      spreadPct: detail.spreadPct != null ? detail.spreadPct : op.spreadPct,
      spreadAbs: detail.spreadAbs != null ? detail.spreadAbs : op.spreadAbs,
      minExchangeFeeRate:
        detail.minExchangeFeeRate != null ? detail.minExchangeFeeRate : op.minExchangeFeeRate,
      maxExchangeFeeRate:
        detail.maxExchangeFeeRate != null ? detail.maxExchangeFeeRate : op.maxExchangeFeeRate,
      transferEtaMin: detail.transferEtaMin != null ? detail.transferEtaMin : op.transferEtaMin,
      transferEtaMax: detail.transferEtaMax != null ? detail.transferEtaMax : op.transferEtaMax,
      slippageHintNotional:
        detail.slippageHintNotional != null
          ? detail.slippageHintNotional
          : op.slippageHintNotional,
      withdrawFeeUsd: detail.withdrawFeeUsd,
      chain: detail.chain != null ? detail.chain : op.chain,
      quote: detail.quote != null ? detail.quote : op.quote,
      validExchanges: detail.validExchanges?.length ? detail.validExchanges : op.validExchanges,
      volume24h: detail.volume24h != null ? detail.volume24h : op.volume24h,
      ts: detail.ts || op.ts,
      dataTs: detail.dataTs || op.dataTs,
      chart30d: detail.chart30d,
      logoUrl: detail.logoUrl || op.logoUrl || null,
      detailLoaded: true,
    };
    detailLoading = false;
    detailError = null;
  } catch (err) {
    if (reqId !== detailRequestId) return;
    detailLoading = false;
    detailError = err?.message || String(err) || '加载详情失败';
  }
  if (currentView === 'detail' && selectedType === 'spread') render();
}

async function loadBasisDetail(op) {
  const reqId = ++detailRequestId;
  const symbol = String(op?.sym || op?.symbol || '').trim();
  const exchange = String(op?.exchange || '').trim();
  detailLoading = true;
  detailError = null;
  try {
    const detail = await fetchCryptoArbBasisDetail({ symbol, exchange });
    if (reqId !== detailRequestId) return;
    selectedOp = {
      ...op,
      ...(detail.sym ? { sym: detail.sym } : {}),
      ...(detail.exchange ? { exchange: detail.exchange } : {}),
      perpPrice: detail.perpPrice != null ? detail.perpPrice : op.perpPrice,
      spotPrice: detail.spotPrice != null ? detail.spotPrice : op.spotPrice,
      basisAbs: detail.basisAbs != null ? detail.basisAbs : op.basisAbs,
      basisPct: detail.basisPct != null ? detail.basisPct : op.basisPct,
      ann: detail.ann != null ? detail.ann : op.ann,
      currentFunding:
        detail.currentFunding != null ? detail.currentFunding : op.currentFunding,
      fundingPeriod: detail.fundingPeriod || op.fundingPeriod,
      spotFeeRate: detail.spotFeeRate != null ? detail.spotFeeRate : op.spotFeeRate,
      perpOpenFeeRate:
        detail.perpOpenFeeRate != null ? detail.perpOpenFeeRate : op.perpOpenFeeRate,
      perpCloseFeeRate:
        detail.perpCloseFeeRate != null ? detail.perpCloseFeeRate : op.perpCloseFeeRate,
      recommendedLeverage:
        detail.recommendedLeverage != null
          ? detail.recommendedLeverage
          : op.recommendedLeverage,
      marginRatioHint:
        detail.marginRatioHint != null ? detail.marginRatioHint : op.marginRatioHint,
      convergenceAssumptionDays:
        detail.convergenceAssumptionDays != null
          ? detail.convergenceAssumptionDays
          : op.convergenceAssumptionDays,
      perpVolume24h: detail.perpVolume24h != null ? detail.perpVolume24h : op.perpVolume24h,
      spotVolume24h: detail.spotVolume24h != null ? detail.spotVolume24h : op.spotVolume24h,
      volume24h: detail.volume24h != null ? detail.volume24h : op.volume24h,
      ts: detail.ts || op.ts,
      dataTs: detail.dataTs || op.dataTs,
      chart30d: detail.chart30d,
      logoUrl: detail.logoUrl || op.logoUrl || null,
      detailLoaded: true,
    };
    detailLoading = false;
    detailError = null;
  } catch (err) {
    if (reqId !== detailRequestId) return;
    detailLoading = false;
    detailError = err?.message || String(err) || '加载详情失败';
  }
  if (currentView === 'detail' && selectedType === 'basis') render();
}

async function loadOIDetail(op) {
  const reqId = ++detailRequestId;
  const symbol = String(op?.sym || op?.symbol || '').trim();
  const exchange = String(op?.exchange || '').trim();
  detailLoading = true;
  detailError = null;
  try {
    const detail = await fetchCryptoArbOIDetail({ symbol, exchange });
    if (reqId !== detailRequestId) return;
    selectedOp = {
      ...op,
      ...(detail.sym ? { sym: detail.sym } : {}),
      ...(detail.exchange ? { exchange: detail.exchange } : {}),
      currentOiUsd: detail.currentOiUsd != null ? detail.currentOiUsd : op.currentOiUsd,
      avg7dOiUsd: detail.avg7dOiUsd != null ? detail.avg7dOiUsd : op.avg7dOiUsd,
      oiChangePct: detail.oiChangePct != null ? detail.oiChangePct : op.oiChangePct,
      priceChange24hPct:
        detail.priceChange24hPct != null ? detail.priceChange24hPct : op.priceChange24hPct,
      correlationHint: detail.correlationHint || op.correlationHint,
      volume24h: detail.volume24h != null ? detail.volume24h : op.volume24h,
      sampleCount: detail.sampleCount != null ? detail.sampleCount : op.sampleCount,
      ts: detail.ts || op.ts,
      dataTs: detail.dataTs || op.dataTs,
      chart30d: detail.chart30d,
      logoUrl: detail.logoUrl || op.logoUrl || null,
      detailLoaded: true,
    };
    detailLoading = false;
    detailError = null;
  } catch (err) {
    if (reqId !== detailRequestId) return;
    detailLoading = false;
    detailError = err?.message || String(err) || '加载详情失败';
  }
  if (currentView === 'detail' && selectedType === 'oi') render();
}

function backToRadar() {
  detailRequestId += 1;
  detailLoading = false;
  detailError = null;
  if (onBackToList) {
    onBackToList();
    return;
  }
  if (detailOnly) {
    // 详情独立页无回调时回列表路由
    window.location.href = `/arbitrage?tab=${encodeURIComponent(selectedType || activeTab || 'funding')}`;
    return;
  }
  currentView = 'radar';
  selectedType = activeTab;
  render();
}

// 排序/刷新重绘表格时保留横向滚动位置
let pendingTableScrollLeft = 0;
// 按 Tab 锁定满页表体高度，避免末页行少导致容器上下跳动
const lockedTblBodyH = {};
// 按 Tab 锁定列宽，排序换行后不再重测，避免表头列宽抖动
const lockedColWidths = {};

function getTableScrollLeft() {
  const body = __root.querySelector('#tbl-body-scroll');
  const head = __root.querySelector('#tbl-head-scroll');
  const top = __root.querySelector('#tbl-hscroll');
  return Math.max(body?.scrollLeft || 0, head?.scrollLeft || 0, top?.scrollLeft || 0);
}

function setTableScrollLeft(x) {
  const left = Math.max(0, Number(x) || 0);
  const body = __root.querySelector('#tbl-body-scroll');
  const head = __root.querySelector('#tbl-head-scroll');
  const top = __root.querySelector('#tbl-hscroll');
  if (body) body.scrollLeft = left;
  if (head) head.scrollLeft = left;
  if (top) top.scrollLeft = left;
}

function syncTableBodyHeightLock() {
  const body = __root.querySelector('#tbl-body-scroll');
  const wrap = __root.querySelector('.tbl-wrap');
  if (!body || !wrap || currentView !== 'radar') return;

  const table = body.querySelector('table.tbl-sync');
  const dataCount = body.querySelectorAll('tbody tr:not(.skel-row)').length;
  const canMeasure = !listLoading && !listError && dataCount >= LIST_PAGE_SIZE && !!table;

  // 始终清掉固定 height，否则会把容器撑出大块空白
  body.style.height = '';

  if (canMeasure) {
    body.style.minHeight = '';
    wrap.style.minHeight = '';
    // 以表格内容高度为准，避免滚动容器被旧样式撑高后测歪
    const contentH = Math.ceil(table.getBoundingClientRect().height);
    if (contentH > 40) {
      lockedTblBodyH[activeTab] = { body: contentH };
    }
  }

  const lock = lockedTblBodyH[activeTab];
  if (!lock?.body) return;
  // 只用 minHeight 稳住末页高度，不用固定 height
  body.style.minHeight = `${lock.body}px`;
  wrap.style.minHeight = '';
}

// ===== RENDER ROUTER =====
function render() {
  if (currentView === 'radar') {
    pendingTableScrollLeft = getTableScrollLeft();
  }
  syncHeaderTitle();
  const m = __root.querySelector("#main");
  if(currentView==='radar') m.innerHTML = renderRadar();
  else if(currentView==='detail') m.innerHTML = renderDetailRoute();
  else if(currentView==='sub') m.innerHTML = renderSub();
  m.className = 'main view';
  if(currentView==='detail') {
    if (selectedType === 'funding') {
      if (!detailLoading && !detailError) {
        initChart();
        calcUpdate();
        startCountdown();
      }
    }
    else if (selectedType === 'spread') {
      if (!detailLoading && !detailError) {
        initSpreadChart(__root, selectedOp);
        calcSpread();
      }
    }
    else if (selectedType === 'basis') {
      if (!detailLoading && !detailError) {
        initBasisChart(__root, selectedOp);
        calcBasis();
      }
    }
    else if (selectedType === 'oi') {
      if (!detailLoading && !detailError) {
        initOIChart(__root, selectedOp);
      }
    }
  }
  animateRows();
  if(currentView==='radar') {
    if (isMobileLayout()) {
      // 移动端卡片列表，无需表头测宽/横向滚动
      return;
    }
    initTableHScroll();
    if (pendingTableScrollLeft > 0) setTableScrollLeft(pendingTableScrollLeft);
    initTableHeaderTips();
    // 先套用已锁定高度，再在布局稳定后复测满页高度
    syncTableBodyHeightLock();
    requestAnimationFrame(() => requestAnimationFrame(syncTableBodyHeightLock));
  }
}

// ===== RADAR VIEW =====
function buildRadarBodyContent() {
  // 有旧数据时加载不切骨架，避免排序闪动
  const useSkeleton = listLoading && ops.length === 0;
  const staticCols = listError || (!listLoading && !getDisplayOps().length);
  const pageStart = (listPage - 1) * LIST_PAGE_SIZE;
  const bodyContent = useSkeleton
    ? `<table class="tbl-sync" id="tbl-body-table"><tbody>${skeletonRowsHTML(LIST_PAGE_SIZE)}</tbody></table>`
    : listError
      ? `<div class="tbl-state tbl-state-error" id="tbl-body-table">${escapeHtml(formatListError(listError))}<button type="button" class="tbl-retry" onclick="loadActiveList()">重试</button></div>`
      : getDisplayOps().length
        ? `<table class="tbl-sync" id="tbl-body-table"><tbody>${getDisplayOps().map((o, i) => tableRowHTML(activeTab, o, ops.indexOf(o), pageStart + i + 1, { rowHTML })).join('')}</tbody></table>`
        : `<div class="tbl-state" id="tbl-body-table">暂无数据</div>`;
  return { bodyContent, staticCols };
}

/** 仅切换排序箭头 class，不重写 thead（避免表头重排/列宽抖动） */
function patchSortHeaders() {
  const headTable = __root.querySelector('#tbl-head-table');
  if (!headTable) return;
  headTable.querySelectorAll('.sort-ind[data-sort-key]').forEach((ind) => {
    const key = ind.getAttribute('data-sort-key');
    const on = sortState.key === key;
    ind.querySelector('.sort-up')?.classList.toggle('on', on && sortState.dir === 'asc');
    ind.querySelector('.sort-dn')?.classList.toggle('on', on && sortState.dir === 'desc');
  });
}

/** 把固定列宽套到当前表头 + 表体，不清空重测 */
function applyFixedColWidths(widths) {
  const headTable = __root.querySelector('#tbl-head-table');
  const bodyTable = __root.querySelector('#tbl-body-table');
  const spacer = __root.querySelector('#tbl-hscroll-inner');
  const top = __root.querySelector('#tbl-hscroll');
  const body = __root.querySelector('#tbl-body-scroll');
  const head = __root.querySelector('#tbl-head-scroll');
  if (!headTable || !widths?.length) return false;

  const ths = headTable.querySelectorAll('thead th');
  if (ths.length !== widths.length) return false;

  const presetTotal = widths.reduce((a, b) => a + b, 0);
  // 容器比预设宽时按比例拉满，避免右侧大块留白
  const containerW = Math.max(body?.clientWidth || 0, head?.clientWidth || 0);
  let applied = widths.slice();
  let total = Math.max(720, presetTotal);
  if (containerW > presetTotal + 1) {
    const scale = containerW / presetTotal;
    applied = widths.map((w) => Math.max(1, Math.floor(w * scale)));
    const sum = applied.reduce((a, b) => a + b, 0);
    applied[applied.length - 1] += containerW - sum;
    total = containerW;
  }

  headTable.style.tableLayout = 'fixed';
  headTable.style.width = `${total}px`;
  headTable.style.minWidth = `${total}px`;
  ths.forEach((th, i) => {
    th.style.width = `${applied[i]}px`;
    th.style.minWidth = `${applied[i]}px`;
  });

  if (bodyTable && bodyTable.tagName === 'TABLE' && !bodyTable.classList.contains('tbl-state')) {
    clearStaticHeadColMode();
    bodyTable.style.tableLayout = 'fixed';
    bodyTable.style.width = `${total}px`;
    bodyTable.style.minWidth = `${total}px`;
    bodyTable.querySelectorAll('tbody tr').forEach((tr) => {
      [...tr.children].forEach((td, i) => {
        if (applied[i] == null) return;
        td.style.width = `${applied[i]}px`;
        td.style.minWidth = `${applied[i]}px`;
      });
    });
  }

  if (spacer) spacer.style.width = `${total}px`;
  if (top && body) {
    const need = total > body.clientWidth + 1;
    top.classList.toggle('show', need);
    if (!need) {
      top.scrollLeft = 0;
      body.scrollLeft = 0;
      if (head) head.scrollLeft = 0;
    }
  }
  return true;
}

/** 局部更新表体/分页；表头 DOM 与列宽保持不动 */
function syncRadarTableDom() {
  if (currentView !== 'radar') return false;

  // 移动端卡片列表局部刷新
  if (isMobileLayout()) {
    const list = __root.querySelector('#list-cards');
    if (!list) return false;
    list.classList.toggle('is-busy', listLoading && ops.length > 0);
    list.innerHTML = buildMobileListContent();
    const pagerHtml = renderPager();
    const existingPager = __root.querySelector('.tbl-pager');
    if (existingPager) {
      if (pagerHtml) existingPager.outerHTML = pagerHtml;
      else existingPager.remove();
    } else if (pagerHtml) {
      list.insertAdjacentHTML('afterend', pagerHtml);
    }
    return true;
  }

  const wrap = __root.querySelector('.tbl-wrap');
  const bodyScroll = __root.querySelector('#tbl-body-scroll');
  if (!wrap || !bodyScroll || !__root.querySelector('#tbl-head-table')) return false;

  pendingTableScrollLeft = getTableScrollLeft();
  const { bodyContent, staticCols } = buildRadarBodyContent();
  patchSortHeaders();
  bodyScroll.innerHTML = bodyContent;
  bodyScroll.classList.toggle('is-busy', listLoading && ops.length > 0);
  wrap.classList.toggle('is-static-cols', staticCols);

  const pagerHtml = renderPager();
  const existingPager = __root.querySelector('.tbl-pager');
  if (existingPager) {
    if (pagerHtml) existingPager.outerHTML = pagerHtml;
    else existingPager.remove();
  } else if (pagerHtml) {
    wrap.insertAdjacentHTML('afterend', pagerHtml);
  }

  const widths = getPresetColWidths(__root.querySelector('#tbl-head-table'));
  if (widths?.length && applyFixedColWidths(widths)) {
    lockedColWidths[activeTab] = widths;
    bindTableHScrollOnly();
  } else {
    initTableHScroll();
  }
  if (pendingTableScrollLeft > 0) setTableScrollLeft(pendingTableScrollLeft);
  syncTableBodyHeightLock();
  requestAnimationFrame(() => requestAnimationFrame(syncTableBodyHeightLock));
  return true;
}

function buildMobileListContent() {
  if (listLoading && ops.length === 0) return renderMobileListSkeleton(LIST_PAGE_SIZE);
  if (listError) {
    return `<div class="tbl-state tbl-state-error">${escapeHtml(formatListError(listError))}<button type="button" class="tbl-retry" onclick="loadActiveList()">重试</button></div>`;
  }
  const display = getDisplayOps();
  if (!display.length) return `<div class="tbl-state">暂无数据</div>`;
  return renderMobileListCards(activeTab, display, ops);
}

function updObDots(el) {
  const dots = __root.querySelectorAll('#ob-dots .dot');
  if (!dots.length || !el) return;
  const i = Math.round(el.scrollLeft / 210);
  dots.forEach((d, j) => d.classList.toggle('on', j === i));
}

function renderRadar() {
  const mobile = isMobileLayout();
  if (mobile) {
    return `${renderIntroStrip(activeTab, { mobile: true })}
  <div class="type-tabs">${renderTypeTabs(activeTab)}</div>
  <div class="list-cards${listLoading && ops.length > 0 ? ' is-busy' : ''}" id="list-cards">${buildMobileListContent()}</div>
  ${renderPager()}`;
  }

  const { bodyContent, staticCols } = buildRadarBodyContent();
  return `${renderIntroStrip(activeTab)}
  <div class="type-tabs">${renderTypeTabs(activeTab)}</div>
  <div class="tbl-wrap${staticCols ? ' is-static-cols' : ''}">
    <div class="tbl-head-scroll" id="tbl-head-scroll">
      <table class="tbl-sync" id="tbl-head-table">
        <thead>${tableHeadHTML(activeTab, sortInd)}</thead>
      </table>
    </div>
    <div class="tbl-hscroll" id="tbl-hscroll" aria-label="表格横向滚动">
      <div class="tbl-hscroll-inner" id="tbl-hscroll-inner"></div>
    </div>
    <div class="tbl-body-scroll${listLoading && ops.length > 0 ? ' is-busy' : ''}" id="tbl-body-scroll">${bodyContent}</div>
  </div>
  ${renderPager()}`;
}

function renderDetailRoute() {
  const o = selectedOp;
  const idx = ops.indexOf(o);
  if (selectedType === 'spread') {
    return renderSpreadDetail(o, idx, { detailLoading, detailError });
  }
  if (selectedType === 'basis') {
    return renderBasisDetail(o, idx, { detailLoading, detailError });
  }
  if (selectedType === 'oi') return renderOIDetail(o, idx, { detailLoading, detailError });
  return renderFundingDetail(o);
}

function getPresetColWidths(headTable) {
  if (!headTable) return [];
  return [...headTable.querySelectorAll('thead th')].map((th) => {
    if (th.classList.contains('col-num')) return 48;
    if (th.classList.contains('col-sym')) return 132;
    if (th.classList.contains('col-ex')) return 110;
    if (th.classList.contains('col-funding')) return 200;
    if (th.classList.contains('col-ann')) return 120;
    if (th.classList.contains('col-avg')) return 100;
    if (th.classList.contains('col-days')) return 72;
    if (th.classList.contains('col-stars') || th.classList.contains('col-rating')) return 100;
    if (th.classList.contains('col-flow')) return 280;
    if (th.classList.contains('col-prices')) return 180;
    if (th.classList.contains('col-spread-abs') || th.classList.contains('col-basis-abs')) return 150;
    if (th.classList.contains('col-spread') || th.classList.contains('col-basis')) return 150;
    if (th.classList.contains('col-vol')) return 160;
    if (th.classList.contains('col-oi')) return 160;
    if (th.classList.contains('col-oi-chg')) return 120;
    if (th.classList.contains('col-price-chg')) return 100;
    if (th.classList.contains('col-signal')) return 120;
    if (th.classList.contains('col-dir')) return 120;
    if (th.classList.contains('col-funding-ann')) return 120;
    return 100;
  });
}

function applyStaticHeadColWidths(headTable, spacer, top, body) {
  if (!headTable) return;
  const widths = getPresetColWidths(headTable);
  if (!widths.length) return;
  lockedColWidths[activeTab] = widths;
  applyFixedColWidths(widths);
  const wrap = __root.querySelector('.tbl-wrap');
  wrap?.classList.add('is-static-cols');
  if (top && body && pendingTableScrollLeft > 0) {
    const headEl = __root.querySelector('#tbl-head-scroll');
    const maxLeft = Math.max(0, (top.scrollWidth || 0) - (top.clientWidth || 0));
    const nextLeft = Math.min(pendingTableScrollLeft, maxLeft);
    top.scrollLeft = nextLeft;
    body.scrollLeft = nextLeft;
    if (headEl) headEl.scrollLeft = nextLeft;
  }
}

function clearStaticHeadColMode() {
  __root.querySelector('.tbl-wrap')?.classList.remove('is-static-cols');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatListError(msg) {
  const s = String(msg || '').trim();
  if (!s) return '加载失败，请稍后再试';
  if (/status code 404/i.test(s)) return '列表接口暂不可用（404）';
  if (/status code 5\d\d/i.test(s)) return '服务暂时异常，请稍后再试';
  if (/Network Error|Failed to fetch|timeout|ECONNABORTED/i.test(s)) return '网络异常，请检查网络后重试';
  if (/Request failed with status code/i.test(s)) {
    const code = (s.match(/status code\s+(\d+)/i) || [])[1];
    return code ? `请求失败（${code}），请稍后再试` : '请求失败，请稍后再试';
  }
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}

function skeletonRowsHTML(count = LIST_PAGE_SIZE) {
  return Array.from({ length: count }, (_, i) => `
    <tr class="skel-row" aria-hidden="true" style="animation-delay:${i * 40}ms">
      ${skeletonCellsHTML(activeTab)}
    </tr>
  `).join('');
}

function rowHTML(o,opsIdx,displayRank) {
  const col = symColors[opsIdx%symColors.length];
  const ex = exColorsLocal[o.exchange]||{bg:'rgba(15,23,42,.04)',border:'rgba(15,23,42,.12)',color:'#64748b'};
  const annCls = o.ann>=25?'ann-h':o.ann>=8?'ann-m':'ann-l';
  const stars = [1,2,3,4,5].map(s=>`<span class="${s<=o.rating?'s-on':'s-off'}">★</span>`).join('');
  const periodLabel = o.periodLabel || `${o.period || 8}h`;
  const avg30Text = o.avg30 == null ? '—' : displayPctTrunc(o.avg30);
  const warnTitle = o.riskTooltip ? ` title="${String(o.riskTooltip).replace(/"/g, '&quot;')}"` : '';
  return `<tr onclick="openDetail(ops[${opsIdx}],'funding')" style="animation-delay:${(displayRank-1)*35}ms">
    <td class="td-num">${o.rank || displayRank}</td>
    <td>
      <div class="sym-cell">
        ${symIco(o.sym, opsIdx, o.logoUrl)}
        <div>
          <div class="sym-name">${o.sym}</div>
          <div class="sym-sub">USDT 永续</div>
        </div>
      </div>
    </td>
    <td><span class="exbadge" style="background:${ex.bg};border-color:${ex.border};color:${ex.color}">${o.exchange}</span></td>
    <td><span class="mono">${displayPctTrunc(o.funding)}<span style="color:var(--t3);font-size:11px">/${periodLabel}</span></span></td>
    <td>
      <span class="ann ${annCls}">${displayPctTrunc(o.ann)}</span>
      ${o.warn?`<span class="warn-tag" style="margin-left:6px"${warnTitle}>⚠️ 极值</span>`:''}
    </td>
    <td><span class="mono" style="color:var(--t3)">${avg30Text}</span></td>
    <td><span class="mono" style="color:var(--t2)">${o.days}d</span></td>
    <td><div class="stars">${stars}</div></td>
  </tr>`;
}

function setTab(tab, el) {
  if (activeTab === tab) return;
  activeTab = tab;
  selectedType = tab;
  syncHeaderTitle();
  sortState.key = null;
  sortState.dir = 'desc';
  pendingTableScrollLeft = 0;
  listPage = 1;
  replaceOps([]);
  listError = null;
  // 切 Tab 后按新列结构重新测高/列宽，避免沿用错误锁
  delete lockedTblBodyH[tab];
  delete lockedColWidths[tab];
  loadActiveList();
}

function calcSpread() {
  calcSpreadTab(__root, selectedOp);
}

function calcBasis() {
  calcBasisTab(__root, selectedOp);
}

// ===== DETAIL VIEW =====
function formatChartAxisLabel(ts, isLast) {
  if (isLast) {
    const d = new Date(ts);
    const now = new Date();
    if (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    ) {
      return '今天';
    }
  }
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function buildChartAxisLabels(points) {
  if (!points.length) {
    return '<span>—</span>';
  }
  const n = points.length;
  const idxs = n <= 5
    ? points.map((_, i) => i)
    : [0, Math.floor((n - 1) * 0.25), Math.floor((n - 1) * 0.5), Math.floor((n - 1) * 0.75), n - 1];
  const uniq = [...new Set(idxs)];
  return uniq
    .map((i) => `<span>${formatChartAxisLabel(points[i].ts, i === n - 1)}</span>`)
    .join('');
}

function formatHoverDate(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  ) {
    return '今天';
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function renderFundingDetail(o) {
  if (!o) {
    return `<button class="back-btn" onclick="backToRadar()"><svg class="back-btn-ico" viewBox="0 0 48 48" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M31.7053818,5.11219264 L13.5234393,22.6612572 C12.969699,23.2125856 12.9371261,24.0863155 13.4257204,24.6755735 L13.5234393,24.7825775 L31.7045714,42.8834676 C31.7795345,42.9580998 31.8810078,43 31.9867879,43 L35.1135102,43 C35.3344241,43 35.5135102,42.8209139 35.5135102,42.6 C35.5135102,42.4936115 35.4711279,42.391606 35.3957362,42.316542 L16.7799842,23.7816937 L35.3764658,5.6866816 C35.5347957,5.53262122 35.5382568,5.27937888 35.3841964,5.121049 C35.3088921,5.04365775 35.205497,5 35.0975148,5 L31.9831711,5 C31.8795372,5 31.7799483,5.04022164 31.7053818,5.11219264 Z"/></svg> 返回列表</button>
      <div class="tbl-state tbl-state-error">暂无详情数据</div>`;
  }

  if (detailError) {
    return `<button class="back-btn" onclick="backToRadar()"><svg class="back-btn-ico" viewBox="0 0 48 48" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M31.7053818,5.11219264 L13.5234393,22.6612572 C12.969699,23.2125856 12.9371261,24.0863155 13.4257204,24.6755735 L13.5234393,24.7825775 L31.7045714,42.8834676 C31.7795345,42.9580998 31.8810078,43 31.9867879,43 L35.1135102,43 C35.3344241,43 35.5135102,42.8209139 35.5135102,42.6 C35.5135102,42.4936115 35.4711279,42.391606 35.3957362,42.316542 L16.7799842,23.7816937 L35.3764658,5.6866816 C35.5347957,5.53262122 35.5382568,5.27937888 35.3841964,5.121049 C35.3088921,5.04365775 35.205497,5 35.0975148,5 L31.9831711,5 C31.8795372,5 31.7799483,5.04022164 31.7053818,5.11219264 Z"/></svg> 返回列表</button>
      <div class="tbl-state tbl-state-error">${escapeHtml(detailError)}
        <button type="button" class="tbl-retry" onclick="retryFundingDetail()">重试</button>
      </div>`;
  }

  const col = symColors[Math.max(0, ops.indexOf(o)) % symColors.length] || '#00B890';
  const ex = exColorsLocal[o.exchange] || { color: '#64748b' };
  const stars = [1, 2, 3, 4, 5].map((s) => `<span class="${s <= o.rating ? 's-on' : 's-off'}">★</span>`).join('');
  const daysText = o.days == null ? '—' : `${o.days} 天`;
  const avg30Text = o.avg30 == null ? '—' : displayPctTrunc(o.avg30);
  let meanRatioText = '';
  if (o.avg30 != null && Number(o.avg30) !== 0 && o.funding != null) {
    const ratio = Number(o.funding) / Number(o.avg30);
    if (Number.isFinite(ratio) && ratio > 0.01 && ratio < 100) {
      meanRatioText = ` · 当前为均值 ${ratio.toFixed(1)}x`;
    }
  } else if (o.avg30 != null && Number(o.avg30) !== 0 && o.ann != null) {
    const ratio = Number(o.ann) / Number(o.avg30);
    if (Number.isFinite(ratio) && ratio > 0.01 && ratio < 100) {
      meanRatioText = ` · 当前为均值 ${ratio.toFixed(1)}x`;
    }
  }
  const chartPoints = Array.isArray(o.chart30d) ? o.chart30d : [];
  const axisHTML = buildChartAxisLabels(chartPoints);
  const chartBody = detailLoading
    ? `<div class="tbl-state" style="min-height:160px;display:flex;align-items:center;justify-content:center">加载中…</div>`
    : chartPoints.length
      ? `<svg id="fchart" width="100%" height="160" viewBox="0 0 700 160" preserveAspectRatio="none" style="display:block"></svg>
         <div class="c-tooltip" id="c-tooltip"></div>`
      : `<div class="tbl-state" style="min-height:160px;display:flex;align-items:center;justify-content:center">暂无走势数据</div>`;

  return `
  <button class="back-btn" onclick="backToRadar()"><svg class="back-btn-ico" viewBox="0 0 48 48" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M31.7053818,5.11219264 L13.5234393,22.6612572 C12.969699,23.2125856 12.9371261,24.0863155 13.4257204,24.6755735 L13.5234393,24.7825775 L31.7045714,42.8834676 C31.7795345,42.9580998 31.8810078,43 31.9867879,43 L35.1135102,43 C35.3344241,43 35.5135102,42.8209139 35.5135102,42.6 C35.5135102,42.4936115 35.4711279,42.391606 35.3957362,42.316542 L16.7799842,23.7816937 L35.3764658,5.6866816 C35.5347957,5.53262122 35.5382568,5.27937888 35.3841964,5.121049 C35.3088921,5.04365775 35.205497,5 35.0975148,5 L31.9831711,5 C31.8795372,5 31.7799483,5.04022164 31.7053818,5.11219264 Z"/></svg> 返回列表</button>
  <div class="det-hdr">
    <div class="det-left">
      <div class="det-ttl">
        ${symIco(o.sym, Math.max(0, ops.indexOf(o)), o.logoUrl)}
        ${escapeHtml(o.sym)}/USDT
        <span style="font-size:14px;font-weight:500;color:var(--t3)">·</span>
        <span style="font-size:14px;font-weight:500;color:${ex.color}">${escapeHtml(o.exchange)}</span>
        ${o.warn ? '<span class="warn-tag">⚠️ 极值</span>' : ''}
      </div>
      <div class="det-meta">
        <div class="stars">${stars}</div>
        <div class="cntd">⏱ 下次结算 <span class="cntd-val" id="cntd-val">--:--:--</span></div>
        <div style="font-size:11px;color:var(--t3)">持续 ${daysText}</div>
      </div>
    </div>
    <div class="det-right">
      <div class="fund-big">${o.funding == null ? '—' : displayPctTrunc(o.funding)}<span style="font-size:16px;color:var(--t2);font-weight:400">/${o.periodLabel || `${o.period || 8}h`}</span></div>
      <div class="fund-ann">${o.ann == null ? '—' : `年化 ${displayPctTrunc(o.ann)}`}</div>
      <div class="fund-sub">30日均值 ${avg30Text}${meanRatioText}</div>
    </div>
  </div>

  <div class="chart-card">
    <div class="chart-card-hdr">
      <div class="chart-title">Funding 30日走势</div>
      <div class="chart-legend">
        <div class="leg-item"><div class="leg-dot" style="background:var(--accent)"></div> 费率</div>
        <div class="leg-item"><div class="leg-dot" style="background:var(--warn);height:2px;width:16px;border-radius:1px"></div> 30日均值</div>
      </div>
    </div>
    <div class="chart-svg-wrap">${chartBody}</div>
    <div style="display:flex;justify-content:space-between;margin-top:8px;font-family:var(--mono);font-size:10px;color:var(--t3);padding:0 4px">
      ${axisHTML}
    </div>
  </div>

  <div class="g2">
    <div class="card">
      <div class="card-t">实时价格</div>
      <div class="met-row"><div class="met-l">永续合约</div><div class="met-v mono">${displayRawNum(o.perp, { prefix: '$' })}</div></div>
      <div class="met-row"><div class="met-l">现货</div><div class="met-v mono">${displayRawNum(o.spot, { prefix: '$' })}</div></div>
      <div class="met-row"><div class="met-l">基差 <span class="tip" style="margin-left:2px"><span class="tip-ico">?</span><span class="tip-txt">(永续价 - 现货价) / 现货价。正值 = 升水，空头套利有保护。</span></span></div><div class="met-v mono" style="color:${Number(o.basis) >= 0 ? 'var(--pos)' : 'var(--danger)'}">${o.basis == null || o.basis === '' ? '—' : displayPctTrunc(o.basis, { signed: true })}</div></div>
    </div>
    <div class="card">
      <div class="card-t">持仓量 (OI)</div>
      <div class="met-row"><div class="met-l">当前 OI</div><div class="met-v mono">${fmtOI(o.oiUsd != null ? o.oiUsd : o.oi)}</div></div>
      ${o.oiContracts != null ? `<div class="met-row"><div class="met-l">持仓张数</div><div class="met-v mono">${Number(o.oiContracts).toLocaleString()}</div></div>` : ''}
      <div class="met-row"><div class="met-l">24h 变化</div><div class="met-v mono ${o.oi24h == null ? '' : Number(o.oi24h) >= 0 ? 'chg-up' : 'chg-dn'}">${o.oi24h == null || o.oi24h === '' ? '—' : `${Number(o.oi24h) >= 0 ? '↑' : '↓'} ${truncateDecimals(Math.abs(Number(o.oi24h)), 3) ?? '—'}%`}</div></div>
      <div class="met-row"><div class="met-l">7d 变化</div><div class="met-v mono ${o.oi7d == null ? '' : Number(o.oi7d) >= 0 ? 'chg-up' : 'chg-dn'}">${o.oi7d == null || o.oi7d === '' ? '—' : `${Number(o.oi7d) >= 0 ? '↑' : '↓'} ${truncateDecimals(Math.abs(Number(o.oi7d)), 3) ?? '—'}%`}</div></div>
    </div>
  </div>

  <div class="calc-card">
    <div class="calc-t">🧮 收益模拟器 <span style="font-size:11px;font-weight:400;color:var(--t2)">调整参数实时计算净收益</span></div>
    <div class="inp-row">
      <div class="inp-g">
        <label class="inp-lbl">持仓本金 <span class="tip"><span class="tip-ico">?</span><span class="tip-txt">你打算投入的总资金量（USDT）</span></span></label>
        <div class="inp-wrap"><span class="inp-pfx">$</span><input class="inp-f" id="inp-principal" type="number" value="10000" min="100" onchange="calcUpdate()"></div>
      </div>
      <div class="inp-g">
        <label class="inp-lbl">持仓周期</label>
        <div class="pbtns">
          <button class="pbtn" onclick="setPeriod(7,this)">7天</button>
          <button class="pbtn on" id="pbtn-30" onclick="setPeriod(30,this)">30天</button>
          <button class="pbtn" onclick="setPeriod(90,this)">90天</button>
        </div>
      </div>
      <div class="inp-g">
        <label class="inp-lbl">资金成本利率 <span class="tip"><span class="tip-ico">?</span><span class="tip-txt">你的资金放 USDT 理财的机会成本，默认按 Binance 活期约10%/年</span></span></label>
        <div class="inp-wrap"><input class="inp-f np" id="inp-rate" type="number" value="10" min="0" max="30" onchange="calcUpdate()"><span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--t3);font-size:12px">%</span></div>
      </div>
    </div>
    <div class="steps-box" id="steps-box"></div>
    <div class="res-table" id="res-table"></div>
  </div>

  <div class="disc">⚠️ 以上为基于当前费率的模拟计算，不构成投资建议。实际收益受 Funding 费率波动、基差变化、手续费及市场流动性影响，可能与模拟结果存在偏差。</div>

  <div class="risk-box">
    <div class="risk-t">⚠️ 风险提示</div>
    <div class="risk-li">Funding 回归风险：${
      o.avg30 && o.funding
        ? `当前费率为 30d 均值的 ${(Number(o.funding) / Number(o.avg30)).toFixed(1)}x，持续 ${o.days == null ? '—' : o.days} 天后存在均值回归概率${o.ann != null && o.funding ? `，年化可能降至 ${(Number(o.avg30) / Number(o.funding) * Number(o.ann)).toFixed(1)}%` : ''}`
        : `持续 ${o.days == null ? '—' : o.days} 天后费率可能回落，年化收益不稳定`
    }</div>
    <div class="risk-li">基差扩大风险：建议保证金率 ≥ 50%，不要加杠杆。参考案例：2024年3月 BTC 单日 -15%，基差扩大至 2%+，3x 杠杆用户普遍被强平</div>
    <div class="risk-li">平台风险：分散交易所持仓，单所资金建议不超过总仓位 30%（参考：2022.11 FTX 事件）</div>
    ${o.warn ? '<div class="risk-li" style="color:var(--warn)">极值警告：当前费率异常偏高，可能存在诱多行情，建议仓位减半或等待费率回落后入场</div>' : ''}
  </div>`;
}

// ===== CHART =====
function initChart() {
  const svg = __root.querySelector('#fchart');
  if (!svg) return;
  const o = selectedOp;
  if (!o) return;

  const points = Array.isArray(o.chart30d) ? o.chart30d : [];
  if (points.length < 2) return;

  const hist = points.map((p) => p.value);
  const W = 700;
  const H = 160;
  const px = 20;
  const py = 16;
  const minV = Math.min(...hist);
  const maxV = Math.max(...hist);
  const pad = Math.max((maxV - minV) * 0.15, Math.abs(maxV) * 0.05 || 0.0001);
  const min = minV - pad;
  const max = maxV + pad;
  const range = max - min || 1;
  const xStep = (W - px * 2) / (hist.length - 1);
  const toY = (v) => py + (1 - (v - min) / range) * (H - py * 2);
  const pts = hist.map((v, i) => ({ x: px + i * xStep, y: toY(v), v, ts: points[i].ts }));

  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C${cx},${pts[i - 1].y} ${cx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }

  // 走势线均值（与 chart 同单位）；无数据时回退 mean30dPct
  const chartMean = hist.reduce((a, b) => a + b, 0) / hist.length;
  const meanVal = Number.isFinite(chartMean) ? chartMean : (o.avg30 == null ? o.funding : o.avg30);
  const meanY = toY(meanVal);
  const fillD = `${d} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity=".35"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${fillD}" fill="url(#ag)"/>
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="${px}" y1="${meanY}" x2="${W - px}" y2="${meanY}" stroke="var(--warn)" stroke-width="1.2" stroke-dasharray="6,4" opacity=".7"/>
    ${pts.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="transparent" class="hpt" data-i="${i}" data-v="${displayPctTrunc(p.v)}" data-label="${formatHoverDate(p.ts)}" data-x="${p.x}"/>`).join('')}
    <circle cx="${pts[pts.length - 1].x}" cy="${pts[pts.length - 1].y}" r="4" fill="var(--accent)" stroke="var(--bg)" stroke-width="2"/>
  `;

  const pathEl = svg.querySelector('path:nth-of-type(2)');
  if (pathEl) {
    const len = pathEl.getTotalLength?.() || 1000;
    pathEl.style.strokeDasharray = len;
    pathEl.style.strokeDashoffset = len;
    pathEl.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)';
    requestAnimationFrame(() => { pathEl.style.strokeDashoffset = 0; });
  }

  const tip = __root.querySelector('#c-tooltip');
  svg.querySelectorAll('.hpt').forEach((el) => {
    el.addEventListener('mouseenter', function onEnter() {
      if (!tip) return;
      tip.style.opacity = '1';
      tip.innerHTML = `<span style="color:var(--accent)">${this.dataset.v}</span> <span style="color:var(--t3)">·</span> ${this.dataset.label || ''}`;
      const rect = svg.getBoundingClientRect();
      const elRect = this.getBoundingClientRect();
      tip.style.left = `${Math.max(0, elRect.left - rect.left - tip.offsetWidth / 2 + 8)}px`;
      tip.style.top = `${elRect.top - rect.top - 44}px`;
    });
    el.addEventListener('mouseleave', () => { if (tip) tip.style.opacity = '0'; });
  });
}

// ===== CALCULATOR =====
let currentPeriod = 30;

function setPeriod(d, el) {
  currentPeriod = d;
  __root.querySelectorAll('.pbtn').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
  calcUpdate();
}

function retryFundingDetail() {
  if (!selectedOp) return;
  detailError = null;
  detailLoading = true;
  render();
  loadFundingDetail(selectedOp);
}

function retrySpreadDetail() {
  if (!selectedOp) return;
  detailError = null;
  detailLoading = true;
  render();
  loadSpreadDetail(selectedOp);
}

function retryBasisDetail() {
  if (!selectedOp) return;
  detailError = null;
  detailLoading = true;
  render();
  loadBasisDetail(selectedOp);
}

function retryOIDetail() {
  if (!selectedOp) return;
  detailError = null;
  detailLoading = true;
  render();
  loadOIDetail(selectedOp);
}

function calcUpdate() {
  const o = selectedOp;
  if (!o || detailLoading || detailError) return;
  const principal = parseFloat(__root.querySelector('#inp-principal')?.value) || 10000;
  const period = currentPeriod;
  const costRate = parseFloat(__root.querySelector('#inp-rate')?.value) || 10;
  const spot = Number(o.spot) || 0;
  const perp = Number(o.perp) || 0;
  const priceForQty = spot > 0 ? spot : perp;
  const funding = Number(o.funding) || 0;

  const openFee = Number.isFinite(Number(o.openFeeRate)) ? Number(o.openFeeRate) : null;
  const closeFee = Number.isFinite(Number(o.closeFeeRate)) ? Number(o.closeFeeRate) : null;
  const takerFee = Number.isFinite(Number(o.takerFeeRate)) ? Number(o.takerFeeRate) : null;
  let feeRateSum;
  let feeLabel;
  if (openFee != null || closeFee != null) {
    const open = openFee != null ? openFee : takerFee != null ? takerFee : 0.0004;
    const close = closeFee != null ? closeFee : takerFee != null ? takerFee : 0.0004;
    feeRateSum = open + close;
    feeLabel = `开 ${(open * 100).toFixed(2)}% + 平 ${(close * 100).toFixed(2)}%`;
  } else if (takerFee != null) {
    feeRateSum = takerFee * 2;
    feeLabel = `Taker ${(takerFee * 100).toFixed(2)}% × 2`;
  } else {
    feeRateSum = 0.0004 * 2;
    feeLabel = '开仓 + 平仓';
  }

  const settlementsPerDay =
    Number.isFinite(Number(o.fundingSettlementsPerDay)) && Number(o.fundingSettlementsPerDay) > 0
      ? Number(o.fundingSettlementsPerDay)
      : 3;
  const marginRatio =
    Number.isFinite(Number(o.marginBufferRatio)) && Number(o.marginBufferRatio) > 0
      ? Number(o.marginBufferRatio)
      : 1.3;

  const qty = priceForQty > 0 ? (principal / priceForQty).toFixed(4) : '—';
  const totalCapital = (principal * marginRatio).toFixed(0);
  const sessions = Math.floor(period * settlementsPerDay);
  const fundingIncome = (principal * (funding / 100) * sessions).toFixed(2);
  const fees = (principal * feeRateSum).toFixed(2);
  const costAmount = (principal * (costRate / 100) * (period / 365)).toFixed(2);
  const net = (parseFloat(fundingIncome) - parseFloat(fees) - parseFloat(costAmount)).toFixed(2);
  const netAnn = ((parseFloat(net) / principal) * (365 / period) * 100).toFixed(1);
  const priceHint = spot > 0 ? '现货' : perp > 0 ? '永续' : '';

  const stepsEl = __root.querySelector('#steps-box');
  if (stepsEl) {
    stepsEl.innerHTML = `
      <div class="step-row"><div class="step-n">1</div><div class="step-txt">${escapeHtml(o.exchange)} 现货买入 ${qty} 个 ${escapeHtml(o.sym)}${priceHint ? `（按${priceHint}价）` : ''}</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>
      <div class="step-row"><div class="step-n">2</div><div class="step-txt">${escapeHtml(o.exchange)} 永续合约做空 ${qty} ${escapeHtml(o.sym)}（1x 杠杆）</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>
      <div class="step-row"><div class="step-n">3</div><div class="step-txt">总占用资金（含保证金 ×${marginRatio}）</div><div class="step-amt">≈ $${parseInt(totalCapital, 10).toLocaleString()}</div></div>`;
  }

  const resEl = __root.querySelector('#res-table');
  if (resEl) {
    const rows = resEl.querySelectorAll('.res-row');
    rows.forEach((r) => r.classList.add('flash'));
    setTimeout(() => rows.forEach((r) => r.classList.remove('flash')), 400);
    resEl.innerHTML = `
      <div class="res-row"><div class="res-l">📥 Funding 收入（${period}天 × ${sessions}次结算 · ${settlementsPerDay}次/日）</div><div class="res-v p">+$${parseFloat(fundingIncome).toLocaleString()}</div></div>
      <div class="res-row"><div class="res-l">💸 手续费（${feeLabel}）</div><div class="res-v n">-$${fees}</div></div>
      <div class="res-row"><div class="res-l">🏦 资金机会成本（按 ${costRate}%/年）</div><div class="res-v n">-$${parseFloat(costAmount).toLocaleString()}</div></div>
      <div class="res-row tot"><div class="res-l" style="font-weight:600;color:var(--t1)">净收益 · ${period}天</div><div class="res-v tot">+$${parseFloat(net).toLocaleString()} <span style="font-size:12px;color:var(--t2)">（净年化 ${netAnn}%）</span></div></div>`;
  }
}

// ===== COUNTDOWN =====
let cdInterval = null;
function startCountdown() {
  if (cdInterval) clearInterval(cdInterval);
  const targetTs = Number(selectedOp?.nextFundingTs) || 0;

  function tick() {
    let s;
    if (targetTs > 0) {
      s = Math.max(0, Math.floor((targetTs - Date.now()) / 1000));
    } else {
      // 无下次结算时间时用当前周期倒计时兜底
      const periodHours = Number(selectedOp?.period) > 0 ? Number(selectedOp.period) : 8;
      const fallbackSecs = periodHours * 3600;
      if (typeof tick._fallback !== 'number') tick._fallback = fallbackSecs;
      tick._fallback = tick._fallback <= 0 ? fallbackSecs : tick._fallback - 1;
      s = tick._fallback;
    }
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const el = __root.querySelector('#cntd-val');
    if (el) {
      el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
  }
  tick();
  cdInterval = setInterval(tick, 1000);
}

// ===== SUB VIEW =====
function renderSub() {
  return `
  <div class="stitle">我的订阅</div>
  <div class="ssub">设置关注的标的和阈值，在 Telegram 第一时间收到信号推送</div>

  <div class="scard">
    <div class="scard-t">关注标的</div>
    <div class="tags-wrap">
      <div class="tag on">BTC <span style="font-size:10px;margin-left:2px;color:var(--t3)" onclick="event.stopPropagation();showToast('已移除 BTC')">×</span></div>
      <div class="tag on">ETH <span style="font-size:10px;margin-left:2px;color:var(--t3)" onclick="event.stopPropagation();showToast('已移除 ETH')">×</span></div>
      <div class="tag on">SOL <span style="font-size:10px;margin-left:2px;color:var(--t3)" onclick="event.stopPropagation();showToast('已移除 SOL')">×</span></div>
      <div class="tag tag-add" onclick="showToast('搜索并添加标的')">+ 添加</div>
    </div>
  </div>

  <div class="scard">
    <div class="scard-t">关注交易所</div>
    <div class="tags-wrap">
      <div class="tag on" onclick="this.classList.toggle('on')">Binance</div>
      <div class="tag on" onclick="this.classList.toggle('on')">Bybit</div>
      <div class="tag" onclick="this.classList.toggle('on')">OKX</div>
      <div class="tag" onclick="this.classList.toggle('on')">Gate.io</div>
      <div class="tag" onclick="this.classList.toggle('on')">Bitget</div>
    </div>
  </div>

  <div class="scard">
    <div class="scard-t">推送阈值</div>
    <div class="thr-row">
      <div class="thr-l">Funding 年化 ≥ <span class="tip" style="margin-left:4px"><span class="tip-ico">?</span><span class="tip-txt">超过此年化时才推送，避免频繁打扰</span></span></div>
      <div class="thr-r"><input class="thr-inp" type="number" value="25"><span class="thr-u">%</span></div>
    </div>
    <div class="thr-row">
      <div class="thr-l">价差 ≥</div>
      <div class="thr-r"><input class="thr-inp" type="number" value="0.5" step="0.1"><span class="thr-u">%</span></div>
    </div>
    <div class="thr-row">
      <div class="thr-l">基差预警 ≥ <span class="tip" style="margin-left:4px"><span class="tip-ico">?</span><span class="tip-txt">基差超过此值时提醒你注意强平风险</span></span></div>
      <div class="thr-r"><input class="thr-inp" type="number" value="0.3" step="0.1"><span class="thr-u">%</span></div>
    </div>
    <div class="thr-row">
      <div class="thr-l">推送时段</div>
      <div class="thr-r" style="gap:6px;font-family:var(--mono);font-size:12px;color:var(--t2)">
        <input class="thr-inp" style="width:60px" value="08:00" type="time">
        <span>—</span>
        <input class="thr-inp" style="width:60px" value="23:59" type="time">
      </div>
    </div>
  </div>

  <div class="scard">
    <div class="scard-t">推送渠道</div>
    <div class="ch-row">
      <div class="ch-l">
        <div class="ch-ico" style="background:#E0F2FE">✈️</div>
        <div>
          <div class="ch-name">Telegram</div>
          <div class="ch-note" id="tg-status">未绑定 · <span style="color:var(--accent);cursor:pointer" onclick="bindTG()">点击绑定 Bot</span></div>
        </div>
      </div>
      <label class="tgl"><input type="checkbox" id="tg-tog" disabled><div class="tgl-track"></div><div class="tgl-thumb"></div></label>
    </div>
    <div class="ch-row" style="opacity:.5">
      <div class="ch-l">
        <div class="ch-ico" style="background:#DCFCE7">💬</div>
        <div>
          <div class="ch-name">微信</div>
          <div class="ch-note">即将开放</div>
        </div>
      </div>
      <span class="coming">即将开放</span>
    </div>
    <div class="ch-row" style="opacity:.5">
      <div class="ch-l">
        <div class="ch-ico" style="background:#EDE9FE">📧</div>
        <div>
          <div class="ch-name">邮件</div>
          <div class="ch-note">即将开放</div>
        </div>
      </div>
      <span class="coming">即将开放</span>
    </div>
  </div>

  <div class="scard">
    <div class="scard-t">TG 推送预览</div>
    <div class="tg-wrap">
      <div class="tg-msg">🚨 <strong>Funding 套利机会 #1</strong><br>────────────────<br>标的：<strong>SOL/USDT</strong><br>交易所：Bybit<br>当前：<strong>0.025%/8h</strong><br>年化：<strong>27.4%</strong>（↑ 为30日均值 1.7x）<br>基差：+0.12% · OI：$124M<br><br>💡 建议策略：Cash &amp; Carry<br>⚠️ 持续 8 天，可能均值回归</div>
      <div class="tg-time">刚刚</div>
      <a class="tg-btn" onclick="openDetail(ops[0]);nav('radar')">→ 查看详情</a>
    </div>
  </div>

  <div class="save-bar">
    <button class="btn" onclick="showToast('已重置为默认设置')">重置</button>
    <button class="btn btn-p" onclick="showToast('✅ 设置已保存')">保存设置</button>
  </div>`;
}

function bindTG() {
  const status = __root.querySelector("#tg-status");
  const tog = __root.querySelector("#tg-tog");
  if(status) status.innerHTML = '生成绑定码中…';
  setTimeout(()=>{
    if(status) status.innerHTML = '绑定码：<span style="font-family:var(--mono);color:var(--accent)">/bind M0Z1-4829</span> · 发送给 <a style="color:var(--accent)" href="#" onclick="return false">@MoziArbitBot</a>';
    if(tog) { tog.disabled=false; tog.checked=true; }
    showToast('✅ 请在 TG 内发送绑定码完成绑定');
  },1200);
}

// ===== TABLE HEADER TIPS（portal 到 body，避免被 tbl overflow 裁切）=====
function initTableHeaderTips() {
  if (__root.__tblTipCleanup) {
    __root.__tblTipCleanup();
    __root.__tblTipCleanup = null;
  }

  const tips = Array.from(__root.querySelectorAll('.tbl-head-scroll .tip'));
  if (!tips.length) return;

  let floating = document.getElementById('mozi-arb-tip-float');
  if (!floating) {
    floating = document.createElement('div');
    floating.id = 'mozi-arb-tip-float';
    floating.className = 'mozi-arb-tip-float';
    floating.setAttribute('role', 'tooltip');
    document.body.appendChild(floating);
  }

  let activeTip = null;
  let hideTimer = null;

  const clearHideTimer = () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const hideTip = () => {
    clearHideTimer();
    activeTip = null;
    floating.classList.remove('show');
    floating.textContent = '';
    floating.style.left = '';
    floating.style.top = '';
  };

  const positionFloating = (tip) => {
    if (!tip) return;
    const rect = tip.getBoundingClientRect();
    // 先显示以测量尺寸
    floating.classList.add('show');
    const tipWidth = Math.min(220, Math.max(floating.offsetWidth || 200, 180));
    const tipHeight = floating.offsetHeight || 48;
    const pad = 12;
    let left = rect.left + rect.width / 2;
    left = Math.max(pad + tipWidth / 2, Math.min(window.innerWidth - pad - tipWidth / 2, left));

    let top = rect.bottom + 8;
    if (top + tipHeight > window.innerHeight - pad) {
      top = Math.max(pad, rect.top - tipHeight - 8);
    }

    floating.style.left = `${left}px`;
    floating.style.top = `${top}px`;
  };

  const placeTip = (tip) => {
    const src = tip.querySelector('.tip-txt');
    const text = (src?.textContent || '').trim();
    if (!text) return;
    clearHideTimer();
    activeTip = tip;
    floating.textContent = text;
    positionFloating(tip);
  };

  // 仅在真正滚走/离开 tip 时关闭；避免 syncColWidths 触发的假 scroll 立刻藏掉
  const onReposition = () => {
    if (!activeTip) return;
    if (activeTip.isConnected && activeTip.matches(':hover')) {
      positionFloating(activeTip);
      return;
    }
    hideTip();
  };

  const cleanups = [];

  tips.forEach((tip) => {
    const src = tip.querySelector('.tip-txt');
    if (src) src.setAttribute('aria-hidden', 'true');

    const onEnter = (e) => {
      e.stopPropagation();
      placeTip(tip);
    };
    const onLeave = () => {
      // 短暂延迟，避免子节点重排导致的瞬时 mouseleave
      clearHideTimer();
      hideTimer = setTimeout(() => {
        if (activeTip === tip && !tip.matches(':hover')) hideTip();
      }, 80);
    };
    const stop = (e) => e.stopPropagation();

    tip.addEventListener('mouseenter', onEnter);
    tip.addEventListener('mouseleave', onLeave);
    tip.addEventListener('focusin', onEnter);
    tip.addEventListener('focusout', onLeave);
    tip.addEventListener('click', stop);
    tip.addEventListener('mousedown', stop);

    cleanups.push(() => {
      tip.removeEventListener('mouseenter', onEnter);
      tip.removeEventListener('mouseleave', onLeave);
      tip.removeEventListener('focusin', onEnter);
      tip.removeEventListener('focusout', onLeave);
      tip.removeEventListener('click', stop);
      tip.removeEventListener('mousedown', stop);
    });
  });

  const head = __root.querySelector('#tbl-head-scroll');
  const body = __root.querySelector('#tbl-body-scroll');
  // 不用 capture 全局 scroll（容易被表格内部同步滚动误触发）
  head?.addEventListener('scroll', onReposition, { passive: true });
  body?.addEventListener('scroll', onReposition, { passive: true });
  window.addEventListener('resize', onReposition);
  cleanups.push(() => {
    head?.removeEventListener('scroll', onReposition);
    body?.removeEventListener('scroll', onReposition);
    window.removeEventListener('resize', onReposition);
    hideTip();
  });

  __root.__tblTipCleanup = () => {
    cleanups.forEach((fn) => {
      try { fn(); } catch (_) {}
    });
  };
}

// ===== TABLE TOP SCROLLBAR (between thead & tbody) =====
/** 只绑定横向滚动同步，不测列宽（排序局部刷新用） */
function bindTableHScrollOnly() {
  const head = __root.querySelector('#tbl-head-scroll');
  const top = __root.querySelector('#tbl-hscroll');
  const body = __root.querySelector('#tbl-body-scroll');
  if (!head || !top || !body) return;

  if (__root.__tblScrollCleanup) {
    __root.__tblScrollCleanup();
    __root.__tblScrollCleanup = null;
  }

  let lock = false;
  const setScroll = (left) => {
    if (lock) return;
    lock = true;
    pendingTableScrollLeft = left;
    if (top.scrollLeft !== left) top.scrollLeft = left;
    if (body.scrollLeft !== left) body.scrollLeft = left;
    if (head.scrollLeft !== left) head.scrollLeft = left;
    lock = false;
  };

  const onTopScroll = () => setScroll(top.scrollLeft);
  const onBodyScroll = () => setScroll(body.scrollLeft);
  const onHeadScroll = () => setScroll(head.scrollLeft);
  const onWinResize = () => {
    const widths = getPresetColWidths(__root.querySelector('#tbl-head-table'));
    if (widths?.length) {
      lockedColWidths[activeTab] = widths;
      applyFixedColWidths(widths);
    } else {
      initTableHScroll();
    }
  };

  top.addEventListener('scroll', onTopScroll);
  body.addEventListener('scroll', onBodyScroll);
  head.addEventListener('scroll', onHeadScroll);
  window.addEventListener('resize', onWinResize);

  __root.__tblScrollCleanup = () => {
    top.removeEventListener('scroll', onTopScroll);
    body.removeEventListener('scroll', onBodyScroll);
    head.removeEventListener('scroll', onHeadScroll);
    window.removeEventListener('resize', onWinResize);
  };
}

function initTableHScroll() {
  const head = __root.querySelector('#tbl-head-scroll');
  const top = __root.querySelector('#tbl-hscroll');
  const body = __root.querySelector('#tbl-body-scroll');
  const spacer = __root.querySelector('#tbl-hscroll-inner');
  const headTable = __root.querySelector('#tbl-head-table');
  if (!head || !top || !body || !spacer || !headTable) return;

  if (__root.__tblScrollCleanup) {
    __root.__tblScrollCleanup();
    __root.__tblScrollCleanup = null;
  }

  const restoreScroll = (prevLeft) => {
    const need = (parseFloat(spacer.style.width) || 0) > body.clientWidth + 1;
    top.classList.toggle('show', need);
    if (!need) {
      top.scrollLeft = 0;
      body.scrollLeft = 0;
      head.scrollLeft = 0;
      syncTableBodyHeightLock();
      return;
    }
    const maxLeft = Math.max(0, (top.scrollWidth || 0) - (top.clientWidth || 0));
    const nextLeft = Math.min(prevLeft, maxLeft);
    top.scrollLeft = nextLeft;
    body.scrollLeft = nextLeft;
    head.scrollLeft = nextLeft;
    syncTableBodyHeightLock();
  };

  // 一律用预设列宽，避免窄屏重测把列挤扁（只剩 #）
  const syncColWidths = () => {
    const bodyTable = __root.querySelector('#tbl-body-table');
    if (!bodyTable) return;

    const prevLeft = Math.max(
      pendingTableScrollLeft || 0,
      top.scrollLeft || 0,
      body.scrollLeft || 0,
      head.scrollLeft || 0
    );
    const ths = headTable.querySelectorAll('thead th');
    if (!ths.length) return;

    const isStaticBody =
      bodyTable.tagName !== 'TABLE' || bodyTable.classList?.contains('tbl-state');
    const firstRow =
      bodyTable.tagName === 'TABLE'
        ? bodyTable.querySelector('tbody tr:not(.skel-row)') || bodyTable.querySelector('tbody tr')
        : null;

    // 始终用最新预设列宽（避免 HMR/改宽后仍沿用旧锁）
    const widths = getPresetColWidths(headTable);
    lockedColWidths[activeTab] = widths;

    if (isStaticBody || !firstRow) {
      applyStaticHeadColWidths(headTable, spacer, top, body);
      return;
    }

    clearStaticHeadColMode();
    applyFixedColWidths(widths);
    restoreScroll(prevLeft);
  };

  let lock = false;
  const setScroll = (left) => {
    if (lock) return;
    lock = true;
    pendingTableScrollLeft = left;
    if (top.scrollLeft !== left) top.scrollLeft = left;
    if (body.scrollLeft !== left) body.scrollLeft = left;
    if (head.scrollLeft !== left) head.scrollLeft = left;
    lock = false;
  };

  const onTopScroll = () => setScroll(top.scrollLeft);
  const onBodyScroll = () => setScroll(body.scrollLeft);
  const onHeadScroll = () => setScroll(head.scrollLeft);

  top.addEventListener('scroll', onTopScroll);
  body.addEventListener('scroll', onBodyScroll);
  head.addEventListener('scroll', onHeadScroll);

  let ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    // 容器变窄时只复用预设列宽 + 更新横向滚动条，绝不重测
    ro = new ResizeObserver(() => syncColWidths());
    ro.observe(body);
    ro.observe(headTable);
  }
  const onWinResize = () => syncColWidths();
  window.addEventListener('resize', onWinResize);
  requestAnimationFrame(() => requestAnimationFrame(syncColWidths));

  __root.__tblScrollCleanup = () => {
    top.removeEventListener('scroll', onTopScroll);
    body.removeEventListener('scroll', onBodyScroll);
    head.removeEventListener('scroll', onHeadScroll);
    window.removeEventListener('resize', onWinResize);
    if (ro) ro.disconnect();
  };
}

// ===== ANIMATIONS =====
function animateRows() {
  __root.querySelectorAll('tbody tr').forEach((tr,i)=>{
    tr.style.animationDelay=`${i*40}ms`;
  });
}

// ===== DELAY COUNTER =====
let delayVal = 0;
setInterval(()=>{
  if (!Number.isFinite(delayVal) || delayVal <= 0) return;
  delayVal = Math.max(0, delayVal + Math.floor(Math.random()*3-1));
  const el = __root.querySelector("#delay-val");
  if(el) el.textContent=delayVal;
},4000);

// ===== TOAST =====
function showToast(msg) {
  const t=__root.querySelector("#toast");
  __root.querySelector("#toast-txt").textContent=msg;
  t.style.display='flex';
  clearTimeout(window._toastTimer);
  window._toastTimer=setTimeout(()=>{t.style.display='none'},2800);
}

// ===== INIT =====


  // Patch render templates: after each render, nothing needed if we use window bridge
  const api = {
    nav, goBack, openDetail, backToRadar, setTab, setListPage, sortBy, setPeriod, calcUpdate, calcSpread, calcBasis, bindTG, showToast, ops, render, loadFundingList, loadActiveList, retryFundingDetail, retrySpreadDetail, retryBasisDetail, retryOIDetail, updObDots
  };
  Object.assign(__root, api);

  // Bridge for inline onclick handlers in generated HTML
  const keys = Object.keys(api);
  const prev = {};
  keys.forEach(k => { prev[k] = window[k]; window[k] = api[k]; });

  // Header nav (standalone only)
  __root.querySelector('#nav-back')?.addEventListener('click', () => {
    if (detailOnly) backToRadar();
    else goBack();
  });
  syncHeaderTitle();

  const onLanguageChanged = () => {
    if (currentView === 'radar' || currentView === 'detail') render();
  };
  i18n.on('languageChanged', onLanguageChanged);

  if (detailOnly && selectedOp?.sym) {
    syncHeaderTitle();
    render();
    if (selectedType === 'funding') loadFundingDetail(selectedOp);
    else if (selectedType === 'spread') loadSpreadDetail(selectedOp);
    else if (selectedType === 'basis') loadBasisDetail(selectedOp);
    else if (selectedType === 'oi') loadOIDetail(selectedOp);
  } else {
    loadActiveList();
  }

  return function cleanup() {
    listRequestId += 1;
    i18n.off('languageChanged', onLanguageChanged);
    if (mq.removeEventListener) mq.removeEventListener('change', onMqChange);
    else if (mq.removeListener) mq.removeListener(onMqChange);
    if (__root.__tblTipCleanup) {
      __root.__tblTipCleanup();
      __root.__tblTipCleanup = null;
    }
    const floating = document.getElementById('mozi-arb-tip-float');
    if (floating) floating.remove();
    if (__root.__tblScrollCleanup) {
      __root.__tblScrollCleanup();
      __root.__tblScrollCleanup = null;
    }
    _intervals.forEach(nativeClearInterval);
    _timeouts.forEach(nativeClearTimeout);
    try { if (cdInterval) nativeClearInterval(cdInterval); } catch (_) {}
    keys.forEach(k => {
      if (prev[k] === undefined) delete window[k];
      else window[k] = prev[k];
    });
    __root.__mounted = false;
    __root.innerHTML = '';
  };
}
