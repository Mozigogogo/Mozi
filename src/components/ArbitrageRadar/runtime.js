/* eslint-disable */
/** Adapted from public/mozi-radar.html */
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

  __root.innerHTML = embedded
    ? `<main class="main" id="main"></main><div id="toast"><span id="toast-txt"></span></div>`
    : `
<header class="hdr">
  <nav class="nav">
    <button type="button" class="nbtn on" id="nav-radar" data-nav="radar">套利雷达</button>
  </nav>
  <div class="hdr-r">
    <div class="delay">
      <div class="d-dot"></div>
      <span>延迟 <span id="delay-val">38</span>s</span>
    </div>
  </div>
</header>
<main class="main" id="main"></main>
<div id="toast"><span id="toast-txt"></span></div>`;

  
// ===== DATA =====
const ops = [
  {rank:1,sym:'SOL',exchange:'Bybit',funding:0.025,period:8,ann:27.4,avg30:0.015,days:8,rating:4,warn:false,oi:124,oi24h:-3.2,oi7d:8.5,basis:0.12,perp:145.20,spot:145.03},
  {rank:2,sym:'WIF',exchange:'Binance',funding:0.085,period:8,ann:93.1,avg30:0.040,days:2,rating:2,warn:true,oi:38,oi24h:12.4,oi7d:65.3,basis:0.21,perp:2.847,spot:2.841},
  {rank:3,sym:'PEPE',exchange:'OKX',funding:0.045,period:8,ann:49.3,avg30:0.020,days:5,rating:4,warn:false,oi:92,oi24h:-1.8,oi7d:4.2,basis:0.08,perp:0.00001541,spot:0.00001540},
  {rank:4,sym:'ORDI',exchange:'Bybit',funding:0.032,period:8,ann:35.0,avg30:0.018,days:3,rating:4,warn:false,oi:21,oi24h:2.3,oi7d:-1.1,basis:0.15,perp:31.42,spot:31.37},
  {rank:5,sym:'BTC',exchange:'Binance',funding:0.018,period:8,ann:19.7,avg30:0.012,days:12,rating:5,warn:false,oi:4821,oi24h:-0.8,oi7d:3.1,basis:0.06,perp:61240,spot:61203},
  {rank:6,sym:'ETH',exchange:'Bybit',funding:0.015,period:8,ann:16.4,avg30:0.011,days:6,rating:5,warn:false,oi:1243,oi24h:1.1,oi7d:2.8,basis:0.04,perp:3381,spot:3379.6},
  {rank:7,sym:'DOGE',exchange:'OKX',funding:0.022,period:8,ann:24.1,avg30:0.019,days:4,rating:3,warn:false,oi:187,oi24h:-2.4,oi7d:6.7,basis:0.11,perp:0.1621,spot:0.1619},
  {rank:8,sym:'AVAX',exchange:'Binance',funding:0.019,period:8,ann:20.8,avg30:0.014,days:7,rating:4,warn:false,oi:96,oi24h:0.6,oi7d:5.3,basis:0.09,perp:37.82,spot:37.79},
];

  const exColors = {
  Bybit:{bg:'rgba(255,166,0,.12)',border:'rgba(255,166,0,.35)',color:'#D97706'},
  Binance:{bg:'rgba(240,185,11,.12)',border:'rgba(240,185,11,.4)',color:'#B45309'},
  OKX:{bg:'rgba(15,23,42,.04)',border:'rgba(15,23,42,.12)',color:'#475569'},
};
const symColors = ['#00B890','#D97706','#6366F1','#DB2777','#0D9488','#7C3AED','#EA580C','#0891B2'];

// 30d fake funding history
function makeFundingHistory(baseRate) {
  const pts = [];
  let v = baseRate * 0.8;
  for(let i=0;i<30;i++){
    v += (Math.random()-.45)*baseRate*.4;
    v = Math.max(0.001, Math.min(baseRate*2.2, v));
    pts.push(parseFloat(v.toFixed(5)));
  }
  pts[29] = baseRate;
  return pts;
}

// State
let currentView = 'radar';
let selectedOp = null;
let activeTab = 'funding';
let calcState = {principal:10000, period:30, costRate:10};
let countdown = {h:3,m:22,s:0};

// ===== NAVIGATION =====
function nav(view) {
  currentView = view;
  __root.querySelectorAll('.nbtn').forEach(b=>b.classList.remove('on'));
  const btn = __root.querySelector('#nav-'+view);
  if(btn) btn.classList.add('on');
  render();
}

function openDetail(op) {
  selectedOp = op;
  currentView = 'detail';
  render();
  const scroller = __root.closest('[class*="contentMain"]') || __root;
  if (scroller && scroller.scrollTo) scroller.scrollTo({ top: 0, behavior: 'smooth' });
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToRadar() {
  currentView = 'radar';
  render();
}

// ===== RENDER ROUTER =====
function render() {
  const m = __root.querySelector("#main");
  if(currentView==='radar') m.innerHTML = renderRadar();
  else if(currentView==='detail') m.innerHTML = renderDetail(selectedOp);
  else if(currentView==='sub') m.innerHTML = renderSub();
  m.className = 'main view';
  if(currentView==='detail') initChart();
  if(currentView==='detail') calcUpdate();
  animateRows();
  if(currentView==='detail') startCountdown();
  if(currentView==='radar') initTableHScroll();
}

// ===== RADAR VIEW =====
function renderRadar() {
  return `
  <div class="intro-strip">
    <div class="intro-card">
      <div class="intro-icon">📡</div>
      <div class="intro-label">什么是 Funding 套利？</div>
      <div class="intro-desc">同时持有现货多单和永续合约空单，Funding 费率为正时持续收取资金费，方向风险接近中性。</div>
    </div>
    <div class="intro-card">
      <div class="intro-icon">🧮</div>
      <div class="intro-label">年化怎么算？</div>
      <div class="intro-desc">当前 8h 费率 × 3 × 365，代表如果费率不变全年持仓的理论收益，实际会随市场波动。</div>
    </div>
    <div class="intro-card">
      <div class="intro-icon">⭐</div>
      <div class="intro-label">评级代表什么？</div>
      <div class="intro-desc">综合年化高低、历史稳定性、持续天数打分。5星 = 当前最优质机会，不代表无风险。</div>
    </div>
    <div class="intro-card">
      <div class="intro-icon">⚠️</div>
      <div class="intro-label">「极值」标签</div>
      <div class="intro-desc">费率超过30日均值2倍时触发。费率可能快速回落，存在诱多风险，新手需谨慎。</div>
    </div>
  </div>

  <div class="type-tabs">
    <button class="ttab on" onclick="setTab('funding',this)">Funding 套利</button>
    <button class="ttab" onclick="setTab('spread',this)">现货价差</button>
    <button class="ttab" onclick="setTab('basis',this)">基差套利</button>
    <button class="ttab" onclick="setTab('oi',this)">OI 异动</button>
  </div>

  <div class="tbl-wrap">
    <div class="tbl-head-scroll" id="tbl-head-scroll">
      <table class="tbl-sync" id="tbl-head-table">
        <thead>
          <tr>
            <th>#</th>
            <th>标的</th>
            <th>交易所</th>
            <th>当前 Funding <span class="tip" style="margin-left:4px"><span class="tip-ico">?</span><span class="tip-txt">每8小时结算一次的资金费率，正数代表多头支付给空头</span></span></th>
            <th>年化 <span class="tip" style="margin-left:4px"><span class="tip-ico">?</span><span class="tip-txt">按当前一期费率折算，实际收益受市场波动影响</span></span></th>
            <th>30d 均值</th>
            <th>持续</th>
            <th>评级</th>
          </tr>
        </thead>
      </table>
    </div>
    <div class="tbl-hscroll" id="tbl-hscroll" aria-label="表格横向滚动">
      <div class="tbl-hscroll-inner" id="tbl-hscroll-inner"></div>
    </div>
    <div class="tbl-body-scroll" id="tbl-body-scroll">
      <table class="tbl-sync" id="tbl-body-table">
        <tbody>
          ${ops.map((o,i)=>rowHTML(o,i)).join('')}
        </tbody>
      </table>
    </div>
    <button class="load-more" onclick="showToast('📊 已加载全部实时数据')">加载更多 ↓</button>
  </div>`;
}

function rowHTML(o,i) {
  const col = symColors[i%symColors.length];
  const ex = exColors[o.exchange]||{bg:'rgba(15,23,42,.04)',border:'rgba(15,23,42,.12)',color:'#64748b'};
  const annCls = o.ann>=25?'ann-h':o.ann>=8?'ann-m':'ann-l';
  const stars = [1,2,3,4,5].map(s=>`<span class="${s<=o.rating?'s-on':'s-off'}">★</span>`).join('');
  return `<tr onclick="openDetail(ops[${i}])" style="animation-delay:${i*35}ms">
    <td class="td-num">${o.rank}</td>
    <td>
      <div class="sym-cell">
        <div class="sym-ico" style="background:${col}22;color:${col}">${o.sym.slice(0,3)}</div>
        <div>
          <div class="sym-name">${o.sym}</div>
          <div class="sym-sub">USDT 永续</div>
        </div>
      </div>
    </td>
    <td><span class="exbadge" style="background:${ex.bg};border-color:${ex.border};color:${ex.color}">${o.exchange}</span></td>
    <td><span class="mono">${o.funding.toFixed(3)}%<span style="color:var(--t3);font-size:11px">/8h</span></span></td>
    <td>
      <span class="ann ${annCls}">${o.ann.toFixed(1)}%</span>
      ${o.warn?'<span class="warn-tag" style="margin-left:6px">⚠️ 极值</span>':''}
    </td>
    <td><span class="mono" style="color:var(--t3)">${o.avg30.toFixed(3)}%</span></td>
    <td><span class="mono" style="color:var(--t2)">${o.days}d</span></td>
    <td><div class="stars">${stars}</div></td>
  </tr>`;
}

function setTab(tab,el) {
  activeTab=tab;
  __root.querySelectorAll('.ttab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  if(tab!=='funding') showToast('📊 切换数据维度：'+{spread:'现货价差',basis:'基差套利',oi:'OI 异动'}[tab]);
}

// ===== DETAIL VIEW =====
function renderDetail(o) {
  const col = symColors[ops.indexOf(o)%symColors.length]||'#00B890';
  const ex = exColors[o.exchange]||{color:'#64748b'};
  const stars = [1,2,3,4,5].map(s=>`<span class="${s<=o.rating?'s-on':'s-off'}">★</span>`).join('');
  return `
  <button class="back-btn" onclick="backToRadar()">← 返回列表</button>
  <div class="det-hdr">
    <div class="det-left">
      <div class="det-ttl">
        <div class="sym-ico" style="background:${col}22;color:${col};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">${o.sym.slice(0,3)}</div>
        ${o.sym}/USDT
        <span style="font-size:14px;font-weight:500;color:var(--t3)">·</span>
        <span style="font-size:14px;font-weight:500;color:${ex.color}">${o.exchange}</span>
        ${o.warn?'<span class="warn-tag">⚠️ 极值</span>':''}
      </div>
      <div class="det-meta">
        <div class="stars">${stars}</div>
        <div class="cntd">⏱ 下次结算 <span class="cntd-val" id="cntd-val">03:22:00</span></div>
        <div style="font-size:11px;color:var(--t3)">持续 ${o.days} 天</div>
      </div>
    </div>
    <div class="det-right">
      <div class="fund-big">${o.funding.toFixed(3)}%<span style="font-size:16px;color:var(--t2);font-weight:400">/8h</span></div>
      <div class="fund-ann">年化 ${o.ann.toFixed(1)}%</div>
      <div class="fund-sub">30日均值 ${o.avg30.toFixed(3)}% · 当前为均值 ${(o.funding/o.avg30).toFixed(1)}x</div>
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
    <div class="chart-svg-wrap">
      <svg id="fchart" width="100%" height="160" viewBox="0 0 700 160" preserveAspectRatio="none" style="display:block"></svg>
      <div class="c-tooltip" id="c-tooltip"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:8px;font-family:var(--mono);font-size:10px;color:var(--t3);padding:0 4px">
      <span>6月 1日</span><span>6月 8日</span><span>6月 15日</span><span>6月 22日</span><span>今天</span>
    </div>
  </div>

  <div class="g2">
    <div class="card">
      <div class="card-t">实时价格</div>
      <div class="met-row"><div class="met-l">永续合约</div><div class="met-v mono">$${o.perp.toLocaleString()}</div></div>
      <div class="met-row"><div class="met-l">现货</div><div class="met-v mono">$${o.spot.toLocaleString()}</div></div>
      <div class="met-row"><div class="met-l">基差 <span class="tip" style="margin-left:2px"><span class="tip-ico">?</span><span class="tip-txt">(永续价 - 现货价) / 现货价。正值 = 升水，空头套利有保护。</span></span></div><div class="met-v mono" style="color:var(--pos)">+${o.basis}%</div></div>
    </div>
    <div class="card">
      <div class="card-t">持仓量 (OI)</div>
      <div class="met-row"><div class="met-l">当前 OI</div><div class="met-v mono">$${o.oi}M</div></div>
      <div class="met-row"><div class="met-l">24h 变化</div><div class="met-v mono ${o.oi24h>=0?'chg-up':'chg-dn'}">${o.oi24h>=0?'↑':'↓'} ${Math.abs(o.oi24h)}%</div></div>
      <div class="met-row"><div class="met-l">7d 变化</div><div class="met-v mono ${o.oi7d>=0?'chg-up':'chg-dn'}">${o.oi7d>=0?'↑':'↓'} ${Math.abs(o.oi7d)}%</div></div>
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
    <div class="risk-li">Funding 回归风险：当前费率为 30d 均值的 ${(o.funding/o.avg30).toFixed(1)}x，持续 ${o.days} 天后存在均值回归概率，年化可能降至 ${(o.avg30/o.funding*o.ann).toFixed(1)}%</div>
    <div class="risk-li">基差扩大风险：建议保证金率 ≥ 50%，不要加杠杆。参考案例：2024年3月 BTC 单日 -15%，基差扩大至 2%+，3x 杠杆用户普遍被强平</div>
    <div class="risk-li">平台风险：分散交易所持仓，单所资金建议不超过总仓位 30%（参考：2022.11 FTX 事件）</div>
    ${o.warn?'<div class="risk-li" style="color:var(--warn)">极值警告：当前费率异常偏高，可能存在诱多行情，建议仓位减半或等待费率回落后入场</div>':''}
  </div>`;
}

// ===== CHART =====
function initChart() {
  const svg = __root.querySelector("#fchart");
  if(!svg) return;
  const o = selectedOp;
  const hist = makeFundingHistory(o.funding);
  const W=700,H=160,px=20,py=16;
  const min=Math.min(...hist)*.8, max=Math.max(...hist)*1.1;
  const range=max-min;
  const xStep=(W-px*2)/(hist.length-1);
  const toY=v=>py+(1-(v-min)/range)*(H-py*2);
  const pts=hist.map((v,i)=>({x:px+i*xStep,y:toY(v),v}));

  // Smooth path using bezier
  let d=`M${pts[0].x},${pts[0].y}`;
  for(let i=1;i<pts.length;i++){
    const cx=(pts[i-1].x+pts[i].x)/2;
    d+=` C${cx},${pts[i-1].y} ${cx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }

  const meanY=toY(o.avg30);
  const fillD=d+` L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;

  svg.innerHTML=`
    <defs>
      <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity=".35"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${fillD}" fill="url(#ag)"/>
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="${px}" y1="${meanY}" x2="${W-px}" y2="${meanY}" stroke="var(--warn)" stroke-width="1.2" stroke-dasharray="6,4" opacity=".7"/>
    ${pts.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="transparent" class="hpt" data-i="${i}" data-v="${p.v.toFixed(5)}" data-x="${p.x}"/>`).join('')}
    <circle cx="${pts[pts.length-1].x}" cy="${pts[pts.length-1].y}" r="4" fill="var(--accent)" stroke="var(--bg)" stroke-width="2"/>
  `;

  // Animate path
  const pathEl = svg.querySelector('path:nth-of-type(2)');
  if(pathEl){
    const len=pathEl.getTotalLength?.()|| 1000;
    pathEl.style.strokeDasharray=len;
    pathEl.style.strokeDashoffset=len;
    pathEl.style.transition='stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)';
    requestAnimationFrame(()=>{ pathEl.style.strokeDashoffset=0; });
  }

  // Hover
  const tip=__root.querySelector("#c-tooltip");
  svg.querySelectorAll('.hpt').forEach(el=>{
    el.addEventListener('mouseenter',function(){
      tip.style.opacity='1';
      tip.innerHTML=`<span style="color:var(--accent)">${this.dataset.v}%</span> <span style="color:var(--t3)">·</span> ${['6/1','6/2','6/3','6/4','6/5','6/6','6/7','6/8','6/9','6/10','6/11','6/12','6/13','6/14','6/15','6/16','6/17','6/18','6/19','6/20','6/21','6/22','6/23','6/24','6/25','6/26','6/27','6/28','6/29','今天'][+this.dataset.i]}`;
      const rect=svg.getBoundingClientRect();
      const elRect=this.getBoundingClientRect();
      tip.style.left=`${elRect.left-rect.left-tip.offsetWidth/2+8}px`;
      tip.style.top=`${elRect.top-rect.top-44}px`;
    });
    el.addEventListener('mouseleave',()=>{tip.style.opacity='0'});
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

function calcUpdate() {
  const o = selectedOp;
  if(!o) return;
  const principal = parseFloat(__root.querySelector("#inp-principal")?.value)||10000;
  const period = currentPeriod;
  const costRate = parseFloat(__root.querySelector("#inp-rate")?.value)||10;

  const qty = (principal/o.spot).toFixed(2);
  const totalCapital = (principal*1.3).toFixed(0);
  const sessions = Math.floor(period*3);
  const fundingIncome = (principal * (o.funding/100) * sessions).toFixed(2);
  const fees = (principal*0.0004*2).toFixed(2);
  const costAmount = (principal*(costRate/100)*(period/365)).toFixed(2);
  const net = (parseFloat(fundingIncome)-parseFloat(fees)-parseFloat(costAmount)).toFixed(2);
  const netAnn = ((parseFloat(net)/principal)*(365/period)*100).toFixed(1);

  const stepsEl = __root.querySelector("#steps-box");
  if(stepsEl) {
    stepsEl.innerHTML=`
      <div class="step-row"><div class="step-n">1</div><div class="step-txt">${o.exchange} 现货买入 ${qty} 个 ${o.sym}</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>
      <div class="step-row"><div class="step-n">2</div><div class="step-txt">${o.exchange} 永续合约做空 ${qty} ${o.sym}（1x 杠杆）</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>
      <div class="step-row"><div class="step-n">3</div><div class="step-txt">总占用资金（含保证金）</div><div class="step-amt">≈ $${parseInt(totalCapital).toLocaleString()}</div></div>`;
  }

  const resEl = __root.querySelector("#res-table");
  if(resEl) {
    const rows = resEl.querySelectorAll('.res-row');
    rows.forEach(r=>r.classList.add('flash'));
    setTimeout(()=>rows.forEach(r=>r.classList.remove('flash')),400);
    resEl.innerHTML=`
      <div class="res-row"><div class="res-l">📥 Funding 收入（${period}天 × ${sessions}次结算）</div><div class="res-v p">+$${parseFloat(fundingIncome).toLocaleString()}</div></div>
      <div class="res-row"><div class="res-l">💸 手续费（开仓 + 平仓）</div><div class="res-v n">-$${fees}</div></div>
      <div class="res-row"><div class="res-l">🏦 资金机会成本（按 ${costRate}%/年）</div><div class="res-v n">-$${parseFloat(costAmount).toLocaleString()}</div></div>
      <div class="res-row tot"><div class="res-l" style="font-weight:600;color:var(--t1)">净收益 · ${period}天</div><div class="res-v tot">+$${parseFloat(net).toLocaleString()} <span style="font-size:12px;color:var(--t2)">（净年化 ${netAnn}%）</span></div></div>`;
  }
}

// ===== COUNTDOWN =====
let cdInterval = null;
function startCountdown() {
  if(cdInterval) clearInterval(cdInterval);
  let s = 3*3600+22*60;
  function tick() {
    if(s<=0){s=8*3600}
    s--;
    const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
    const el=__root.querySelector("#cntd-val");
    if(el) el.textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }
  cdInterval=setInterval(tick,1000);
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

// ===== TABLE TOP SCROLLBAR (between thead & tbody) =====
function initTableHScroll() {
  const head = __root.querySelector('#tbl-head-scroll');
  const top = __root.querySelector('#tbl-hscroll');
  const body = __root.querySelector('#tbl-body-scroll');
  const spacer = __root.querySelector('#tbl-hscroll-inner');
  const headTable = __root.querySelector('#tbl-head-table');
  const bodyTable = __root.querySelector('#tbl-body-table');
  if (!head || !top || !body || !spacer || !headTable || !bodyTable) return;

  if (__root.__tblScrollCleanup) {
    __root.__tblScrollCleanup();
    __root.__tblScrollCleanup = null;
  }

  const syncColWidths = () => {
    const ths = headTable.querySelectorAll('thead th');
    const firstRow = bodyTable.querySelector('tbody tr');
    if (!ths.length || !firstRow) return;
    const tds = firstRow.children;

    // clear fixed widths first to measure natural size
    ths.forEach((th) => { th.style.width = ''; th.style.minWidth = ''; });
    bodyTable.querySelectorAll('tbody tr td').forEach((td) => {
      td.style.width = '';
      td.style.minWidth = '';
    });
    headTable.style.tableLayout = 'auto';
    bodyTable.style.tableLayout = 'auto';
    headTable.style.width = '';
    bodyTable.style.width = '';

    const widths = [];
    ths.forEach((th, i) => {
      const td = tds[i];
      const w = Math.ceil(Math.max(
        th.getBoundingClientRect().width,
        td ? td.getBoundingClientRect().width : 0
      ));
      widths.push(Math.max(w, 48));
    });

    const total = widths.reduce((a, b) => a + b, 0);
    headTable.style.width = total + 'px';
    bodyTable.style.width = total + 'px';
    ths.forEach((th, i) => {
      th.style.width = widths[i] + 'px';
      th.style.minWidth = widths[i] + 'px';
    });
    // apply widths to all body rows
    bodyTable.querySelectorAll('tbody tr').forEach((tr) => {
      Array.from(tr.children).forEach((td, i) => {
        if (!widths[i]) return;
        td.style.width = widths[i] + 'px';
        td.style.minWidth = widths[i] + 'px';
      });
    });

    bodyTable.style.tableLayout = 'fixed';
    headTable.style.tableLayout = 'fixed';

    spacer.style.width = total + 'px';
    const need = total > body.clientWidth + 1;
    top.classList.toggle('show', need);
    if (!need) {
      top.scrollLeft = 0;
      body.scrollLeft = 0;
      head.scrollLeft = 0;
    }
  };

  let lock = false;
  const setScroll = (left) => {
    if (lock) return;
    lock = true;
    top.scrollLeft = left;
    body.scrollLeft = left;
    head.scrollLeft = left;
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
    ro = new ResizeObserver(() => syncColWidths());
    ro.observe(body);
    ro.observe(headTable);
    ro.observe(bodyTable);
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
let delayVal = 38;
setInterval(()=>{
  delayVal = Math.max(12, Math.min(95, delayVal + Math.floor(Math.random()*10-4)));
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
    nav, openDetail, backToRadar, setTab, setPeriod, calcUpdate, bindTG, showToast, ops, render
  };
  Object.assign(__root, api);

  // Bridge for inline onclick handlers in generated HTML
  const keys = Object.keys(api);
  const prev = {};
  keys.forEach(k => { prev[k] = window[k]; window[k] = api[k]; });

  // Header nav (standalone only)
  __root.querySelector('#nav-radar')?.addEventListener('click', () => nav('radar'));

  render();

  return function cleanup() {
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
