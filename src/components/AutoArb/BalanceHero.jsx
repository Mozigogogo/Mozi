'use client';

/**
 * 策略中心顶部：账户总余额（已部署 / 可用进度条 + 分所/账户 chips）
 * 视觉对齐原型 mozi-autoarb_副本.html · renderBalanceHero
 *
 * @param {{
 *   total?: number;
 *   available?: number;
 *   deployed?: number;
 *   byExchange?: Array<{ name: string; total: number }>;
 *   loading?: boolean;
 *   label?: string;
 *   deployedLabel?: string;
 *   availableLabel?: string;
 * }} props
 */
export default function BalanceHero({
  total = 0,
  available = 0,
  deployed = 0,
  byExchange = [],
  loading = false,
  label = '',
  deployedLabel = '',
  availableLabel = '',
}) {
  const safeTotal = Number(total) || 0;
  const safeDeployed = Number(deployed) || 0;
  const safeAvailable = Number(available) || 0;
  const denom = safeTotal > 0 ? safeTotal : safeDeployed + safeAvailable;
  const depPct = denom > 0 ? Math.round((safeDeployed / denom) * 100) : 0;
  const avaPct = denom > 0 ? Math.max(0, 100 - depPct) : 0;

  const fmt = (n) =>
    `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className={`balance-hero${loading ? ' is-loading' : ''}`}>
      <div className="bh-top">
        <div>
          <div className="bh-label">💳 {label}</div>
          <div className="bh-value">{loading ? '…' : fmt(safeTotal)}</div>
        </div>
        <div className="bh-legend">
          <span>
            🟡 {deployedLabel}{' '}
            <b>
              {loading ? '…' : fmt(safeDeployed)}
            </b>
            {loading ? null : `（${depPct}%）`}
          </span>
          <span>
            🟢 {availableLabel}{' '}
            <b>
              {loading ? '…' : fmt(safeAvailable)}
            </b>
            {loading ? null : `（${avaPct}%）`}
          </span>
        </div>
      </div>
      <div className="bh-bar" aria-hidden="true">
        <div className="bh-bar-deployed" style={{ width: `${depPct}%` }} />
        <div className="bh-bar-available" style={{ width: `${avaPct}%` }} />
      </div>
      {byExchange.length > 0 ? (
        <div className="bh-exchanges">
          {byExchange.map((ex) => (
            <div className="bh-ex-chip" key={ex.name}>
              {ex.name} <b>{fmt(ex.total)}</b>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
