'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import styles from './index.module.less';

const SOURCE_LABELS = {
  bigorder_anomaly: '大单异动',
  quantitative: '量化六因子',
  technical: '技术分析',
};

const SOURCE_GRADIENTS = {
  bigorder_anomaly: 'linear-gradient(90deg, #ff3b5c, #ff6b9d)',
  quantitative: 'linear-gradient(90deg, #a78bfa, #c4b5fd)',
  technical: 'linear-gradient(90deg, #38bdf8, #7dd3fc)',
};

const SIDEBAR_SOURCE_GRADIENTS = {
  bigorder_anomaly: 'linear-gradient(90deg, #ff8c42, #ffb347)',
  quantitative: 'linear-gradient(90deg, #a78bfa, #c4b5fd)',
  technical: 'linear-gradient(90deg, #38bdf8, #7dd3fc)',
};

const REGIME_LABELS = {
  trending_down: 'trending_down',
  trending_up: 'trending_up',
  ranging: 'ranging',
  volatile: 'volatile',
};

const GRADE_BADGE_CLASS = {
  S: 'gradeBadgeS',
  A: 'gradeBadgeA',
  B: 'gradeBadgeB',
  C: 'gradeBadgeC',
};

const GRADE_AMBIENT_CLASS = {
  S: 'ambientGlowS',
  A: 'ambientGlowA',
  B: 'ambientGlowB',
  C: 'ambientGlowC',
};

const GRADE_RING_GRADIENTS = {
  S: ['#ef4444', '#f97316'],
  A: ['#f97316', '#fbbf24'],
  B: ['#eab308', '#facc15'],
  C: ['#64748b', '#94a3b8'],
};

const GRADE_ACCENT = {
  S: { text: '#fca5a5', rgb: '239, 68, 68' },
  A: { text: '#fed7aa', rgb: '249, 115, 22' },
  B: { text: '#fef08a', rgb: '234, 179, 8' },
  C: { text: '#cbd5e1', rgb: '100, 116, 139' },
};

/** K 线 / 进场区间 — 按等级配色，与 btc_signal_all_grades.html 一致 */
const GRADE_CHART = {
  S: {
    stroke: 'rgba(239, 68, 68, 0.7)',
    fillTop: 'rgba(239, 68, 68, 0.15)',
    entryFill: 'rgba(239, 68, 68, 0.5)',
    entryMid: '#f87171',
    bigorderGradient: 'linear-gradient(90deg, #ef4444, #f87171)',
  },
  A: {
    stroke: 'rgba(249, 115, 22, 0.7)',
    fillTop: 'rgba(249, 115, 22, 0.15)',
    entryFill: 'rgba(249, 115, 22, 0.5)',
    entryMid: '#fb923c',
    bigorderGradient: 'linear-gradient(90deg, #f97316, #fdba74)',
  },
  B: {
    stroke: 'rgba(234, 179, 8, 0.7)',
    fillTop: 'rgba(234, 179, 8, 0.15)',
    entryFill: 'rgba(234, 179, 8, 0.45)',
    entryMid: '#facc15',
    bigorderGradient: 'linear-gradient(90deg, #eab308, #fde047)',
  },
  C: {
    stroke: 'rgba(100, 116, 139, 0.7)',
    fillTop: 'rgba(100, 116, 139, 0.15)',
    entryFill: 'rgba(100, 116, 139, 0.5)',
    entryMid: '#94a3b8',
    bigorderGradient: 'linear-gradient(90deg, #64748b, #94a3b8)',
  },
};

function getGradeChart(grade) {
  const key = String(grade || '').toUpperCase();
  return GRADE_CHART[key] || GRADE_CHART.S;
}

function getGradeBadgeClassName(grade, stylesMap) {
  const key = String(grade || '').toUpperCase();
  const token = GRADE_BADGE_CLASS[key];
  return token ? stylesMap[token] : '';
}

function getGradeAmbientClassName(grade, stylesMap) {
  const key = String(grade || '').toUpperCase();
  const token = GRADE_AMBIENT_CLASS[key];
  return token ? stylesMap[token] : stylesMap.ambientGlowS;
}

function getGradeAccent(grade) {
  const key = String(grade || '').toUpperCase();
  return GRADE_ACCENT[key] || GRADE_ACCENT.S;
}

const RING_CIRCUMFERENCE = 157;

function formatPct(value, digits = 1) {
  if (value === undefined || value === null || value === '') return '--';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  const sign = num >= 0 ? '+' : '−';
  return `${sign}${Math.abs(num).toFixed(digits)}%`;
}

function calcChangePct(from, to) {
  if (from == null || to == null) return null;
  const base = Number(from);
  const target = Number(to);
  if (!base || Number.isNaN(base) || Number.isNaN(target)) return null;
  return ((target - base) / base) * 100;
}

function getDirectionLabel(direction) {
  if (direction === 'short') return '做空';
  if (direction === 'long') return '做多';
  return direction || '--';
}

function getSourceLabel(name) {
  return SOURCE_LABELS[name] || name || '--';
}

function parseMathNotes(display) {
  if (!display || typeof display !== 'string') return [];
  return display
    .split('\n')
    .map((line) => line.replace(/^[│\s·]+/, '').trim())
    .filter((line) => line.startsWith('·') || line.startsWith('•'))
    .map((line) => line.replace(/^[·•]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

function parseMathChip(tag) {
  const idx = tag.indexOf(' ');
  if (idx < 0) return { label: tag, value: '' };
  return { label: tag.slice(0, idx), value: tag.slice(idx + 1) };
}

function buildSparkData(basePrice, points = 80) {
  const base = Number(basePrice) || 100000;
  const data = [];
  for (let i = 0; i < points; i += 1) {
    const prev = data.length ? data[data.length - 1] : base;
    data.push(prev + (Math.random() - 0.52) * (base * 0.002));
  }
  return data;
}

function drawSparkline(canvas, data, strokeColor, fillTopColor) {
  if (!canvas || !data.length) return;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const width = canvas.clientWidth || 300;
  const height = 44;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const padY = 6;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - padY - ((v - min) / span) * (height - padY * 2),
  }));

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, fillTopColor);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function ConfidenceRing({ value, isShort, variant = 'default', grade = '' }) {
  const uid = useId().replace(/:/g, '');
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const ringOffset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * pct) / 100;
  const isSidebar = variant === 'sidebar';
  const gradeKey = String(grade || '').toUpperCase();
  const gradeRing = GRADE_RING_GRADIENTS[gradeKey] || GRADE_RING_GRADIENTS.S;
  const gradeRingId = `ringGradGrade-${uid}`;
  const ringStroke = isSidebar
    ? `url(#${gradeRingId})`
    : isShort
      ? 'url(#ringGradShort)'
      : 'url(#ringGradLong)';

  return (
    <div className={styles.confRing}>
      <svg
        className={styles.ringSvg}
        width="56"
        height="56"
        viewBox="0 0 56 56"
        aria-hidden
      >
        <circle cx="28" cy="28" r="25" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
        <circle
          className={styles.ringProgress}
          cx="28"
          cy="28"
          r="25"
          fill="none"
          stroke={ringStroke}
          strokeWidth="3"
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ '--ring-offset': ringOffset }}
        />
        <defs>
          {isSidebar ? (
            <linearGradient id={gradeRingId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradeRing[0]} />
              <stop offset="100%" stopColor={gradeRing[1]} />
            </linearGradient>
          ) : null}
          <linearGradient id="ringGradShort" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff3b5c" />
            <stop offset="100%" stopColor="#ff6b35" />
          </linearGradient>
          <linearGradient id="ringGradLong" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00e5a0" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <text
          x="28"
          y={isSidebar ? 26 : 24}
          textAnchor="middle"
          fontFamily="Roboto Mono, monospace"
          fontSize="11"
          fontWeight="500"
          fill="#f5f5f7"
        >
          {Math.round(pct)}%
        </text>
        {isSidebar ? (
          <text
            x="28"
            y="36"
            textAnchor="middle"
            fontFamily="inherit"
            fontSize="7"
            fill="rgba(245,245,247,0.45)"
          >
            置信度
          </text>
        ) : (
          <text
            x="28"
            y="35"
            textAnchor="middle"
            fontFamily="inherit"
            fontSize="7.5"
            fill="rgba(245,245,247,0.4)"
            letterSpacing="0.3"
          >
            CONF
          </text>
        )}
      </svg>
      {!isSidebar ? <div className={styles.ringLabel}>置信度</div> : null}
    </div>
  );
}

function AnimatedSignalBar({ name, target, delay = 0, isSidebar = false, grade = '' }) {
  const [width, setWidth] = useState(0);
  const [display, setDisplay] = useState(0);
  const gradeChart = getGradeChart(grade);
  const palette = isSidebar ? SIDEBAR_SOURCE_GRADIENTS : SOURCE_GRADIENTS;
  let gradient = palette[name] || 'linear-gradient(90deg, #11b787, #38bdf8)';
  if (name === 'bigorder_anomaly') {
    gradient = gradeChart.bigorderGradient;
  }

  useEffect(() => {
    const goal = Math.max(0, Math.min(100, Math.round(Number(target) || 0)));
    let current = 0;
    let frameId = 0;
    const timer = window.setTimeout(() => {
      const step = () => {
        if (current >= goal) return;
        current = Math.min(current + 1, goal);
        setWidth(current);
        setDisplay(current);
        frameId = window.requestAnimationFrame(step);
      };
      frameId = window.requestAnimationFrame(step);
    }, delay);

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frameId);
    };
  }, [target, delay]);

  return (
    <div className={styles.sigRow}>
      <div className={styles.sigName}>{getSourceLabel(name)}</div>
      <div className={styles.sigBar}>
        <div className={styles.sigFill} style={{ width: `${width}%`, background: gradient }} />
      </div>
      <div className={styles.sigVal}>{display}</div>
    </div>
  );
}

export default function SignalCard({
  data,
  isPC = false,
  embedded = false,
  variant = 'default',
  hideAmbient = false,
  surfaceHosted = false,
  onViewMore,
}) {
  const isSidebar = variant === 'sidebar';
  const cardRef = useRef(null);
  const sparkRef = useRef(null);
  const sparkDataRef = useRef([]);
  const { formatSmallDecimal } = useFormatNumber();

  const formatPrice = useCallback(
    (value) => {
      if (value === undefined || value === null || value === '') return '--';
      const num = Number(value);
      if (Number.isNaN(num)) return String(value);
      if (num !== 0 && Math.abs(num) < 1) {
        return `$${formatSmallDecimal(num)}`;
      }
      return `$${num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    },
    [formatSmallDecimal]
  );

  const card = data?.card || {};
  const math = data?.math || {};
  const strategy = data?.strategy || {};

  const coin = card.coin || '';
  const direction = card.direction || '';
  const grade = card.grade || '';
  const confidence = card.confidence;
  const currentPrice = card.current_price ?? card.currentPrice;
  const entryZone =
    card.entry_zone ??
    card.entryZone ??
    (card.entry_low != null && card.entry_high != null
      ? [card.entry_low, card.entry_high]
      : []);
  const stopLoss = card.stop_loss ?? card.stopLoss;
  const takeProfit = card.take_profit ?? card.takeProfit;
  const riskReward = card.risk_reward ?? card.riskReward ?? card.risk_reward_ratio;
  const positionPct = card.position_pct ?? card.positionPct;
  const kellyPct = card.kelly_pct ?? card.kellyPct ?? data?.kellyPct;
  const invalidation = card.invalidation ?? card.invalidation_price;
  const sources = card.sources || [];
  const winRate = card.win_rate ?? card.winRate;
  const sampleCount = card.sample_count ?? card.sampleCount;
  const avgProfit = card.avg_profit ?? card.avgProfit ?? card.avg_profit_pct;

  const isShort = direction !== 'long';
  const gradeBadgeClass = getGradeBadgeClassName(grade, styles);
  const gradeAmbientClass = getGradeAmbientClassName(grade, styles);
  const gradeAccent = getGradeAccent(grade);
  const gradeChart = useMemo(() => getGradeChart(grade), [grade]);
  const sidebarGradeStyle = isSidebar
    ? {
        '--grade-accent': gradeAccent.text,
        '--grade-accent-rgb': gradeAccent.rgb,
      }
    : undefined;
  const entryLow = Array.isArray(entryZone) ? entryZone[0] : null;
  const entryHigh = Array.isArray(entryZone) ? entryZone[1] : null;
  const tpChange = calcChangePct(currentPrice, takeProfit);
  const slChange = calcChangePct(currentPrice, stopLoss);
  const mcBullProb = math.mc_bull_prob ?? math.mcBullProb ?? math.monte_carlo_bull_prob;
  const mcProb =
    mcBullProb != null
      ? (isShort ? 1 - Number(mcBullProb) : Number(mcBullProb)) * 100
      : null;
  const regime = math.market_regime ?? math.marketRegime ?? strategy.regime;
  const strategyVersion = strategy.version ?? strategy.strategy_version;
  const mathNotes =
    (Array.isArray(math.notes) ? math.notes : null) ||
    (Array.isArray(math.key_findings) ? math.key_findings : null) ||
    parseMathNotes(data?.displayText || data?.display);
  const resolvedKelly = kellyPct ?? data?.kelly_pct ?? data?.kellyPct;
  const showExpandedDetail = !isSidebar || embedded;

  const entryStyle = useMemo(() => {
    if (entryLow == null || entryHigh == null) {
      return { '--entry-width': '42%', '--entry-left': '30%' };
    }
    const min = Math.min(entryLow, entryHigh, currentPrice ?? entryLow);
    const max = Math.max(entryLow, entryHigh, currentPrice ?? entryHigh);
    const span = max - min || 1;
    const leftPct = ((Math.min(entryLow, entryHigh) - min) / span) * 100;
    const widthPct = Math.max((Math.abs(entryHigh - entryLow) / span) * 100, 8);
    return {
      '--entry-width': `${widthPct}%`,
      '--entry-left': `${leftPct}%`,
    };
  }, [entryLow, entryHigh, currentPrice]);

  const sidebarEntryFill = useMemo(() => {
    if (entryLow == null || entryHigh == null) {
      return { width: '42%', left: '29%' };
    }
    const low = Math.min(entryLow, entryHigh);
    const high = Math.max(entryLow, entryHigh);
    const range = high - low || 1;
    const pad = range * 0.38;
    const min = low - pad;
    const max = high + pad;
    const span = max - min || 1;
    const leftPct = ((low - min) / span) * 100;
    const widthPct = (range / span) * 100;
    return {
      width: `${widthPct}%`,
      left: `${leftPct}%`,
    };
  }, [entryLow, entryHigh]);

  const mathTags = useMemo(
    () =>
      [
        math.hurst != null ? `Hurst ${Number(math.hurst).toFixed(2)}` : null,
        mcProb != null
          ? `${isShort ? 'MC看跌' : 'MC看涨'} ${Math.round(mcProb)}%`
          : null,
        (math.volatility ?? math.vol_regime)
          ? `波动率 ${math.volatility ?? math.vol_regime}`
          : null,
        resolvedKelly != null ? `Kelly ${Number(resolvedKelly).toFixed(1)}%` : null,
        regime && !embedded ? `趋势 ${REGIME_LABELS[regime] || regime}` : null,
      ].filter(Boolean),
    [math.hurst, math.volatility, mcProb, resolvedKelly, regime, isShort, embedded]
  );

  const statChips = useMemo(
    () =>
      [
        winRate != null
          ? {
              label: '胜率',
              value: `${Math.round(Number(winRate) * (winRate <= 1 ? 100 : 1))}%`,
              warn: false,
            }
          : null,
        sampleCount != null ? { label: '样本', value: `n=${sampleCount}`, warn: false } : null,
        avgProfit != null ? { label: '均盈', value: formatPct(avgProfit), warn: false } : null,
        (strategy.global_win_rate ?? strategy.globalWinRate) != null
          ? {
              label: '全局胜率',
              value: `${Math.round(Number(strategy.global_win_rate ?? strategy.globalWinRate) * ((strategy.global_win_rate ?? strategy.globalWinRate) <= 1 ? 100 : 1))}%`,
              warn: true,
            }
          : null,
      ].filter(Boolean),
    [winRate, sampleCount, avgProfit, strategy.global_win_rate]
  );

  const strokeColor = gradeChart.stroke;
  const fillTopColor = gradeChart.fillTop;

  const entryFillStyle = useMemo(
    () => ({
      ...(isSidebar ? sidebarEntryFill : entryStyle),
      background: gradeChart.entryFill,
    }),
    [isSidebar, sidebarEntryFill, entryStyle, gradeChart.entryFill]
  );

  const paintSparkline = useCallback(() => {
    if (!sparkRef.current) return;
    if (!sparkDataRef.current.length) {
      sparkDataRef.current = buildSparkData(currentPrice);
    }
    drawSparkline(sparkRef.current, sparkDataRef.current, strokeColor, fillTopColor);
  }, [currentPrice, strokeColor, fillTopColor]);

  useEffect(() => {
    sparkDataRef.current = buildSparkData(currentPrice);
    paintSparkline();
    const onResize = () => paintSparkline();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [currentPrice, paintSparkline]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof window === 'undefined' || isSidebar) return undefined;

    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canHover) return undefined;

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 8;
      const y = ((e.clientY - r.top) / r.height - 0.5) * -5;
      el.style.transition = 'transform 0.12s ease';
      el.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
    };

    const onLeave = () => {
      el.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.transform = 'rotateY(0deg) rotateX(0deg)';
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      el.style.transform = '';
      el.style.transition = '';
    };
  }, [data, isSidebar]);

  if (!data) return null;

  if (!coin && (data.displayText || data.display)) {
    const displayText =
      typeof data.displayText === 'string'
        ? data.displayText
        : typeof data.display === 'string'
          ? data.display
          : typeof data.display === 'object' && typeof data.display?.data === 'string'
            ? data.display.data
            : '';
    if (!displayText) return null;
    return (
      <pre className={`${styles.displayFallback} ${isPC ? styles.pcMode : ''}`}>
        {displayText}
      </pre>
    );
  }

  return (
    <div
      className={`${styles.root} ${isPC ? styles.pcMode : ''} ${embedded || isSidebar ? styles.embedded : ''} ${isSidebar ? styles.sidebarVariant : ''} ${isSidebar && embedded ? styles.sidebarExpanded : ''} ${isShort ? '' : styles.rootLong}`}
      style={sidebarGradeStyle}
    >
      <div
        ref={cardRef}
        className={`${styles.cardSurface} ${surfaceHosted ? styles.cardSurfaceHosted : ''}`.trim()}
      >
      {!hideAmbient ? (
        <div className={`${styles.ambientGlow} ${gradeAmbientClass}`} aria-hidden />
      ) : null}

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.gradeRow}>
            {grade ? (
              <div className={`${styles.gradeBadge} ${gradeBadgeClass}`.trim()}>
                {grade}级
              </div>
            ) : null}
            {coin ? (
              <div className={`${styles.coinTag} ${isSidebar ? styles.coinTagSidebar : ''}`}>
                {isSidebar ? coin : `${coin} / USDT`}
              </div>
            ) : null}
            {direction ? (
              <div className={styles.directionTag}>
                <span className={styles.directionArrow}>{isShort ? '▼' : '▲'}</span>
                {getDirectionLabel(direction)}
              </div>
            ) : null}
          </div>
          {!isSidebar ? (
            <div className={styles.headerTitle}>
              实时交易信号{strategyVersion != null ? ` · 策略 v${strategyVersion}` : ''}
            </div>
          ) : null}
        </div>
        {confidence != null ? (
          <ConfidenceRing value={confidence} isShort={isShort} variant={variant} grade={grade} />
        ) : null}
      </div>

      <div className={styles.priceSection}>
        {!isSidebar ? <div className={styles.priceLabel}>当前价格</div> : null}
        <div className={styles.priceHero}>
          <div className={`${styles.priceNum} ${isSidebar && !isShort ? styles.priceNumLong : ''}`}>
            {formatPrice(currentPrice)}
          </div>
          <div className={styles.priceTicker}>USD</div>
        </div>
        <div className={styles.sparklineWrap}>
          <canvas ref={sparkRef} className={styles.sparkCanvas} height={44} />
        </div>
      </div>

      {entryLow != null && entryHigh != null ? (
        <div className={`${styles.entryZone} ${isSidebar ? styles.entryZoneSidebar : ''}`}>
          <div className={styles.entryLabel}>进场区间</div>
          <div className={styles.entryBar}>
            <div
              className={`${styles.entryFill} ${isSidebar ? styles.entryFillSidebar : ''}`}
              style={entryFillStyle}
            />
          </div>
          <div className={`${styles.entryPrices} ${isSidebar ? styles.entryPricesSidebar : ''}`}>
            <div className={styles.entryLow}>{formatPrice(entryLow)}</div>
            <div
              className={`${styles.entryMid} ${isSidebar ? styles.entryMidSidebar : ''}`}
              style={{ color: gradeChart.entryMid }}
            >
              进场区间
            </div>
            <div className={styles.entryHigh}>{formatPrice(entryHigh)}</div>
          </div>
        </div>
      ) : null}

      {!isSidebar ? (
        <div className={styles.tpslSection}>
          <div className={styles.tpslCell}>
            <div className={`${styles.tpslType} ${styles.tpType}`}>止盈 TP</div>
            <div className={styles.tpslPrice}>{formatPrice(takeProfit)}</div>
            {tpChange != null ? (
              <div className={`${styles.tpslPct} ${styles.tpPct}`}>{formatPct(tpChange)}</div>
            ) : null}
          </div>
          <div className={styles.tpslCell}>
            <div className={`${styles.tpslType} ${styles.slType}`}>止损 SL</div>
            <div className={styles.tpslPrice}>{formatPrice(stopLoss)}</div>
            {slChange != null ? (
              <div className={`${styles.tpslPct} ${styles.slPct}`}>{formatPct(slChange)}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={`${styles.metrics} ${isSidebar ? styles.metricsSidebar : ''}`}>
        <div className={styles.metric}>
          <div className={`${styles.metricVal} ${styles.metricValAccent}`}>
            {riskReward != null ? `${riskReward}x` : '--'}
          </div>
          <div className={styles.metricLbl}>盈亏比</div>
        </div>
        {!isSidebar ? (
          <div className={styles.metric}>
            <div className={styles.metricVal}>
              {positionPct != null ? `${Number(positionPct).toFixed(0)}%` : '--'}
            </div>
            <div className={styles.metricLbl}>建议仓位</div>
          </div>
        ) : null}
        <div className={styles.metric}>
          <div className={styles.metricVal}>
            {resolvedKelly != null ? `${Number(resolvedKelly).toFixed(0)}%` : '--'}
          </div>
          <div className={styles.metricLbl}>Kelly仓位</div>
        </div>
      </div>

      {sources.length > 0 ? (
        <div className={`${styles.signals} ${isSidebar ? styles.signalsSidebar : ''}`}>
          <div className={styles.sectionHead}>
            {isSidebar && !embedded ? '信号源' : '信号源融合'}
          </div>
          {sources.map((source, idx) => (
            <AnimatedSignalBar
              key={`${source.name}-${idx}`}
              name={source.name}
              target={source.score}
              delay={isSidebar ? idx * 80 : 900 + idx * 100}
              isSidebar={isSidebar}
              grade={grade}
            />
          ))}
        </div>
      ) : null}

      {showExpandedDetail && (mathTags.length > 0 || mathNotes.length > 0) ? (
        <div className={`${styles.mathBlock} ${embedded ? styles.mathBlockExpanded : ''}`}>
          {!embedded ? <div className={styles.sectionHead}>数学推导</div> : null}
          {mathTags.length > 0 ? (
            <div className={styles.mathChips}>
              {mathTags.map((tag) => {
                const { label, value } = parseMathChip(tag);
                return (
                  <div key={tag} className={styles.mchip}>
                    {label}
                    {value ? (
                      <>
                        {' '}
                        <span className={styles.mchipValue}>{value}</span>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {mathNotes.length > 0 ? (
            <ul className={styles.insightList}>
              {mathNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {showExpandedDetail && (statChips.length > 0 || invalidation != null) ? (
        <div className={embedded ? styles.expandedFooter : undefined}>
          {statChips.length > 0 ? (
            <div className={`${styles.backtest} ${embedded ? styles.backtestExpanded : ''}`}>
              {statChips.map((chip) => (
                <div
                  key={chip.label}
                  className={`${styles.btPill} ${chip.warn ? styles.btPillWarn : ''}`}
                >
                  {chip.label} <strong>{chip.value}</strong>
                </div>
              ))}
            </div>
          ) : embedded ? (
            <div className={`${styles.backtest} ${styles.backtestExpanded} ${styles.backtestPlaceholder}`} aria-hidden />
          ) : null}

          {invalidation != null ? (
            <div className={`${styles.invalid} ${embedded ? styles.invalidExpanded : ''}`}>
              <div className={styles.invalidLabel}>失效条件</div>
              <div
                className={styles.invalidPrice}
                style={embedded ? { color: gradeAccent.text } : undefined}
              >
                <span
                  className={styles.dotLive}
                  style={embedded ? { background: gradeAccent.text } : undefined}
                  aria-hidden
                />
                {isShort ? '突破' : '跌破'} {formatPrice(invalidation)}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {isSidebar && !embedded ? (
        <button type="button" className={styles.viewMore} onClick={(e) => { e.stopPropagation(); onViewMore?.(); }}>
          <span className={styles.viewMoreIcon} aria-hidden>
            ︾
          </span>
          查看更多
        </button>
      ) : null}
      </div>
    </div>
  );
}
