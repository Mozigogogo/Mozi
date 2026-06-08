'use client';

import styles from './index.module.less';

const SOURCE_LABELS = {
  bigorder_anomaly: '大单异动',
  quantitative: '量化六因子',
  technical: '技术分析',
};

const SOURCE_COLORS = {
  bigorder_anomaly: '#e5484d',
  quantitative: '#7c5cfc',
  technical: '#3b82f6',
};

const REGIME_LABELS = {
  trending_down: 'trending↓',
  trending_up: 'trending↑',
  ranging: 'ranging',
  volatile: 'volatile',
};

function formatPrice(value) {
  if (value === undefined || value === null || value === '') return '--';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `$${num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatPriceFull(value) {
  if (value === undefined || value === null || value === '') return '--';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `$${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPct(value, digits = 1) {
  if (value === undefined || value === null || value === '') return '--';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `${num >= 0 ? '+' : ''}${num.toFixed(digits)}%`;
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

function getSourceColor(name) {
  return SOURCE_COLORS[name] || '#11b787';
}

function ConfidenceRing({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={styles.confidenceRing}>
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#f0f0f0" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="#f5a623"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <div className={styles.confidenceInner}>
        <span className={styles.confidenceValue}>{Math.round(pct)}%</span>
        <span className={styles.confidenceUnit}>CONF</span>
      </div>
      <span className={styles.confidenceLabel}>置信度</span>
    </div>
  );
}

function Sparkline({ isShort }) {
  const points = isShort
    ? '2,14 12,10 20,12 28,8 38,10 46,6 58,8'
    : '2,8 12,10 20,8 28,12 38,10 46,14 58,12';

  return (
    <svg className={styles.sparkline} viewBox="0 0 60 18" preserveAspectRatio="none" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={isShort ? '#e5484d' : '#11b787'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EntryZoneBar({ low, high, currentPrice, isShort }) {
  if (low == null || high == null) return null;

  const min = Math.min(low, high, currentPrice ?? low);
  const max = Math.max(low, high, currentPrice ?? high);
  const span = max - min || 1;
  const leftPct = ((Math.min(low, high) - min) / span) * 100;
  const widthPct = (Math.abs(high - low) / span) * 100;

  return (
    <div className={styles.entrySection}>
      <div className={styles.entryLabels}>
        <span>{formatPrice(low)}</span>
        <span>{formatPrice(high)}</span>
      </div>
      <div className={styles.entryTrack}>
        <div
          className={`${styles.entryFill} ${isShort ? styles.entryFillShort : styles.entryFillLong}`}
          style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 8)}%` }}
        />
      </div>
      <div className={`${styles.entryHint} ${isShort ? styles.shortText : styles.longText}`}>
        进场区间
      </div>
    </div>
  );
}

function SourceBar({ name, score }) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  const color = getSourceColor(name);

  return (
    <div className={styles.sourceRow}>
      <span className={styles.sourceLabel}>{getSourceLabel(name)}</span>
      <div className={styles.sourceTrack}>
        <div className={styles.sourceFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={styles.sourceScore}>{Math.round(pct)}</span>
    </div>
  );
}

function parseMathNotes(display) {
  if (!display || typeof display !== 'string') return [];
  const lines = display.split('\n');
  return lines
    .map((line) => line.replace(/^[│\s·]+/, '').trim())
    .filter((line) => line.startsWith('·') || line.startsWith('•'))
    .map((line) => line.replace(/^[·•]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

export default function SignalCard({ data }) {
  if (!data) return null;

  const card = data.card || {};
  const math = data.math || {};
  const strategy = data.strategy || {};

  const {
    coin = '',
    direction = '',
    grade = '',
    confidence,
    current_price: currentPrice,
    entry_zone: entryZone = [],
    stop_loss: stopLoss,
    take_profit: takeProfit,
    risk_reward: riskReward,
    position_pct: positionPct,
    kelly_pct: kellyPct,
    invalidation,
    sources = [],
    win_rate: winRate,
    sample_count: sampleCount,
    avg_profit: avgProfit,
  } = card;

  const isShort = direction === 'short';
  const entryLow = Array.isArray(entryZone) ? entryZone[0] : null;
  const entryHigh = Array.isArray(entryZone) ? entryZone[1] : null;
  const tpChange = calcChangePct(currentPrice, takeProfit);
  const slChange = calcChangePct(currentPrice, stopLoss);
  const mcBearProb = math.mc_bull_prob != null ? (1 - Number(math.mc_bull_prob)) * 100 : null;
  const regime = math.market_regime || strategy.regime;
  const strategyVersion = strategy.version;
  const mathNotes = parseMathNotes(data.display);
  const resolvedKelly = kellyPct ?? data.kelly_pct;

  const mathTags = [
    math.hurst != null ? `Hurst ${Number(math.hurst).toFixed(2)}` : null,
    mcBearProb != null ? `MC看跌 ${Math.round(mcBearProb)}%` : null,
    math.volatility ? `波动率 ${math.volatility}` : null,
    resolvedKelly != null ? `Kelly ${Number(resolvedKelly).toFixed(1)}%` : null,
    regime ? `趋势 ${REGIME_LABELS[regime] || regime}` : null,
  ].filter(Boolean);

  const statChips = [
    winRate != null ? { label: '胜率', value: `${Math.round(Number(winRate) * (winRate <= 1 ? 100 : 1))}%`, tone: 'green' } : null,
    sampleCount != null ? { label: '样本', value: `n=${sampleCount}`, tone: 'green' } : null,
    avgProfit != null ? { label: '均盈', value: formatPct(avgProfit), tone: 'green' } : null,
    strategy.global_win_rate != null
      ? {
          label: '全局胜率',
          value: `${Math.round(Number(strategy.global_win_rate) * (strategy.global_win_rate <= 1 ? 100 : 1))}%`,
          tone: 'orange',
        }
      : null,
  ].filter(Boolean);

  if (!coin && data.display) {
    return <pre className={styles.displayFallback}>{data.display}</pre>;
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.badges}>
            {grade ? <span className={styles.gradeBadge}>{grade}级</span> : null}
            {coin ? <span className={styles.pairBadge}>{coin} / USDT</span> : null}
            {direction ? (
              <span className={`${styles.directionBadge} ${isShort ? styles.shortBadge : styles.longBadge}`}>
                {isShort ? '▼' : '▲'} {getDirectionLabel(direction)}
              </span>
            ) : null}
          </div>
          <div className={styles.subtitle}>
            实时交易信号{strategyVersion != null ? ` · 策略 v${strategyVersion}` : ''}
          </div>
        </div>
        {confidence != null ? <ConfidenceRing value={confidence} /> : null}
      </div>

      <div className={styles.priceSection}>
        <div className={styles.priceLabel}>当前价格</div>
        <div className={styles.priceValue}>{formatPriceFull(currentPrice)}</div>
        <div className={styles.priceUnit}>USD</div>
        <Sparkline isShort={isShort} />
      </div>

      <EntryZoneBar
        low={entryLow}
        high={entryHigh}
        currentPrice={currentPrice}
        isShort={isShort}
      />

      <div className={styles.divider} />

      <div className={styles.tpSlRow}>
        <div className={styles.tpSlItem}>
          <div className={`${styles.tpSlLabel} ${styles.success}`}>止盈 TP</div>
          <div className={styles.tpSlPrice}>{formatPrice(takeProfit)}</div>
          {tpChange != null ? (
            <div className={`${styles.tpSlChange} ${styles.success}`}>{formatPct(tpChange)}</div>
          ) : null}
        </div>
        <div className={styles.tpSlItem}>
          <div className={`${styles.tpSlLabel} ${styles.danger}`}>止损 SL</div>
          <div className={styles.tpSlPrice}>{formatPrice(stopLoss)}</div>
          {slChange != null ? (
            <div className={`${styles.tpSlChange} ${styles.danger}`}>{formatPct(slChange)}</div>
          ) : null}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.ratioRow}>
        <div className={styles.ratioItem}>
          <div className={`${styles.ratioValue} ${styles.orange}`}>
            {riskReward != null ? `${riskReward}x` : '--'}
          </div>
          <div className={styles.ratioLabel}>盈亏比</div>
        </div>
        <div className={styles.ratioDivider} />
        <div className={styles.ratioItem}>
          <div className={styles.ratioValue}>
            {positionPct != null ? `${Number(positionPct).toFixed(0)}%` : '--'}
          </div>
          <div className={styles.ratioLabel}>建议仓位</div>
        </div>
        <div className={styles.ratioDivider} />
        <div className={styles.ratioItem}>
          <div className={styles.ratioValue}>
            {resolvedKelly != null ? `${Number(resolvedKelly).toFixed(1)}%` : '--'}
          </div>
          <div className={styles.ratioLabel}>KELLY仓位</div>
        </div>
      </div>

      {sources.length > 0 ? (
        <>
          <div className={styles.divider} />
          <div className={styles.section}>
            <div className={styles.sectionTitle}>信号源融合</div>
            <div className={styles.sourceList}>
              {sources.map((source, idx) => (
                <SourceBar
                  key={`${source.name}-${idx}`}
                  name={source.name}
                  score={source.score}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}

      {mathTags.length > 0 || mathNotes.length > 0 ? (
        <>
          <div className={styles.divider} />
          <div className={styles.section}>
            <div className={styles.sectionTitle}>数学推导</div>
            {mathTags.length > 0 ? (
              <div className={styles.mathTags}>
                {mathTags.map((tag) => (
                  <span key={tag} className={styles.mathTag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            {mathNotes.length > 0 ? (
              <ul className={styles.mathNotes}>
                {mathNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
      ) : null}

      {statChips.length > 0 ? (
        <>
          <div className={styles.divider} />
          <div className={styles.statRow}>
            {statChips.map((chip) => (
              <span
                key={chip.label}
                className={`${styles.statChip} ${chip.tone === 'orange' ? styles.statOrange : styles.statGreen}`}
              >
                {chip.label} {chip.value}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {invalidation != null ? (
        <>
          <div className={styles.divider} />
          <div className={styles.invalidation}>
            <span className={styles.invalidationLabel}>失效条件</span>
            <span className={styles.invalidationValue}>
              <span className={styles.invalidationDot} aria-hidden />
              突破 {formatPrice(invalidation)}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
