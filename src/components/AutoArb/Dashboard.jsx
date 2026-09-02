'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ACTIVITY_TEMPLATES, DONUT_SEGMENTS } from './data';
import { ActivityText, Donut, Gauge, Modal, Sparkline, Tip } from './charts';
import './styles/dashboard.css';

function daysSince(dateStr) {
  return Math.max(
    1,
    Math.round((new Date('2026-08-16') - new Date(dateStr)) / 86400000),
  );
}

function buildRadarItems(strategies) {
  return strategies
    .filter((s) => s.status !== 'stopped')
    .map((s) => {
      const curRate = s.funding
        ? s.funding * 24 * 365 * 100
        : s.spread
          ? s.spread * 4
          : s.basis
            ? s.basis * 3
            : 1;
      const threshold = s.minProfitThreshold || 0.1;
      const pctToThreshold = Math.min(100, (curRate / (threshold * 3)) * 100);
      const armed = curRate >= threshold;
      return {
        id: s.id,
        name: s.name.split(' ')[0],
        curRate,
        threshold,
        pctToThreshold,
        armed,
        status: s.status,
      };
    });
}

function buildInitialActivity(t) {
  const initial = t('autoArb.dashboard.activity.initial', { returnObjects: true }) || [];
  return initial.map((item, i) => ({
    id: `a${i + 1}`,
    ico: item.ico,
    parts: item.parts,
    time:
      item.time === 'justNow'
        ? t('autoArb.dashboard.activity.justNow')
        : item.time,
  }));
}

/**
 * @param {{
 *   strategies: Array<object>;
 *   onStrategiesChange: Function;
 *   onNavigate: (view: string) => void;
 *   onToast: (msg: string) => void;
 *   onEmergencyConfirm: () => void;
 *   onStartWizard?: (source: object) => void;
 * }} props
 */
export default function Dashboard({
  strategies,
  onStrategiesChange,
  onNavigate,
  onToast,
  onEmergencyConfirm,
  onStartWizard,
}) {
  const { t, i18n } = useTranslation();
  const D = (key, opts) => t(`autoArb.dashboard.${key}`, opts);

  const initialActivity = useMemo(
    () => buildInitialActivity(t),
    [t, i18n.language],
  );

  const [activityLog, setActivityLog] = useState(initialActivity);
  const [autoStop, setAutoStop] = useState(true);
  const [negFundingPause, setNegFundingPause] = useState(true);
  const [timeoutAlert, setTimeoutAlert] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editMinProfit, setEditMinProfit] = useState(0.1);
  const [editLoss, setEditLoss] = useState(5);
  const actIdRef = useRef(100);

  useEffect(() => {
    setActivityLog(initialActivity);
  }, [initialActivity]);

  const detailStrat = strategies.find((s) => s.id === detailId);
  const editStrat = strategies.find((s) => s.id === editId);

  const totalCapital = strategies.reduce((s, x) => s + x.capital, 0);
  const totalPnl = strategies.reduce((s, x) => s + x.pnl, 0);
  const totalDailyPnl = strategies.reduce((s, x) => s + x.dailyPnl, 0);
  const running = strategies.filter((s) => s.status === 'running').length;
  const radarItems = buildRadarItems(strategies);

  const activityText = useMemo(
    () => t('autoArb.dashboard.activity.text', { returnObjects: true }) || {},
    [t, i18n.language],
  );

  useEffect(() => {
    const pnlInterval = setInterval(() => {
      onStrategiesChange((prev) =>
        prev.map((s) => {
          if (s.status !== 'running') return s;
          const delta = (Math.random() - 0.3) * 2;
          const pnl = parseFloat((s.pnl + delta).toFixed(2));
          const pnlPct = parseFloat(((pnl / s.capital) * 100).toFixed(2));
          return { ...s, pnl, pnlPct };
        }),
      );
    }, 2200);

    const scheduleNext = () => {
      const delay = 4000 + Math.random() * 5000;
      return setTimeout(() => {
        const tmpl =
          ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
        actIdRef.current += 1;
        setActivityLog((prev) =>
          [
            {
              id: `live-${actIdRef.current}`,
              ico: tmpl.ico,
              parts: tmpl.build(tmpl.strat, activityText),
              time: t('autoArb.dashboard.activity.justNow'),
            },
            ...prev,
          ].slice(0, 12),
        );
        actTimer = scheduleNext();
      }, delay);
    };
    let actTimer = scheduleNext();

    return () => {
      clearInterval(pnlInterval);
      clearTimeout(actTimer);
    };
  }, [onStrategiesChange, activityText, t]);

  const pauseStrat = (id) => {
    onStrategiesChange((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'paused' } : s)),
    );
    onToast(`⏸ ${D('toast.paused')}`);
  };

  const resumeStrat = (id) => {
    onStrategiesChange((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'running' } : s)),
    );
    onToast(`▶ ${D('toast.resumed')}`);
  };

  const openEdit = (s) => {
    setEditId(s.id);
    setEditMinProfit(s.minProfitThreshold ?? 0.1);
    setEditLoss(5);
  };

  const saveEdit = () => {
    if (!editId) return;
    onStrategiesChange((prev) =>
      prev.map((s) =>
        s.id === editId ? { ...s, minProfitThreshold: editMinProfit } : s,
      ),
    );
    setEditId(null);
    onToast(`✅ ${D('toast.paramsUpdated')}`);
  };

  const cloneStrat = (s) => {
    onStartWizard?.(s);
    onToast(D('toast.cloneConfig', { name: s.name }));
  };

  const stresses = useMemo(() => {
    const key = detailStrat?.typeKey || 'funding';
    return t(`autoArb.dashboard.stress.${key}`, { returnObjects: true }) || [];
  }, [detailStrat?.typeKey, t, i18n.language]);

  const strategyTypeLabel = (typeKey) =>
    D(`strategyTypes.${typeKey || 'funding'}`);

  return (
    <div className="view">
      <div className="emergency-bar">
        <div className="eb-text">
          ⚡{' '}
          <strong>{D('emergencyBar.runningCount', { count: running })}</strong> ·{' '}
          {D('emergencyBar.totalPosition')} ${totalCapital.toLocaleString()} ·{' '}
          {D('emergencyBar.todayPnl')}{' '}
          <strong
            style={{
              color: totalDailyPnl >= 0 ? 'var(--pos)' : 'var(--danger)',
            }}
          >
            {totalDailyPnl >= 0 ? '+' : ''}${totalDailyPnl.toFixed(2)}
          </strong>
        </div>
        <button type="button" className="stop-btn" onClick={onEmergencyConfirm}>
          🛑 {D('emergencyBar.stopAll')}
        </button>
      </div>

      <div className="dash-stats">
        <div className="ds-card">
          <div className="ds-lbl">💼 {D('stats.totalCapital')}</div>
          <div className="ds-val" style={{ color: 'var(--t1)' }}>
            ${totalCapital.toLocaleString()}
          </div>
          <div className="ds-sub">
            {D('stats.activeStrategies', { count: running })}
          </div>
        </div>
        <div className="ds-card">
          <div className="ds-lbl">📈 {D('stats.cumulativePnl')}</div>
          <div
            className="ds-val"
            style={{ color: totalPnl >= 0 ? 'var(--pos)' : 'var(--danger)' }}
          >
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </div>
          <div className="ds-sub">
            {D('stats.totalReturn', {
              pct: (totalCapital ? (totalPnl / totalCapital) * 100 : 0).toFixed(2),
            })}
          </div>
        </div>
        <div className="ds-card">
          <div className="ds-lbl">📅 {D('stats.todayPnl')}</div>
          <div
            className="ds-val"
            style={{
              color: totalDailyPnl >= 0 ? 'var(--pos)' : 'var(--danger)',
            }}
          >
            {totalDailyPnl >= 0 ? '+' : ''}${totalDailyPnl.toFixed(2)}
          </div>
          <div className="ds-sub">{D('stats.lastUpdated')}</div>
        </div>
        <div className="ds-card">
          <div className="ds-lbl">🛡️ {D('stats.overallRisk')}</div>
          <div className="ds-val" style={{ color: 'var(--pos)' }}>
            {D('stats.riskLow')}
          </div>
          <div className="ds-sub">{D('stats.riskScore', { score: 28 })}</div>
        </div>
        <div className="ds-card">
          <div className="ds-lbl">⚡ {D('stats.execSuccess')}</div>
          <div className="ds-val" style={{ color: 'var(--pos)' }}>
            99.4%
          </div>
          <div className="ds-sub">
            {D('stats.execSuccessSub', { ok: 114, total: 115 })}
          </div>
        </div>
      </div>

      <div className="dash-layout">
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--t2)',
                textTransform: 'uppercase',
                letterSpacing: '.07em',
              }}
            >
              {D('strategyList.title')}
            </div>
            <button
              type="button"
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--rs)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: 'linear-gradient(135deg,var(--gold),#FBBF24)',
                color: '#000',
                border: 'none',
              }}
              onClick={() => onNavigate('wizard')}
            >
              {D('strategyList.newStrategy')}
            </button>
          </div>
          <div className="strat-list">
            {strategies.map((s) => (
              <StratCard
                key={s.id}
                s={s}
                typeLabel={strategyTypeLabel(s.typeKey)}
                t={t}
                onPause={() => pauseStrat(s.id)}
                onResume={() => resumeStrat(s.id)}
                onConfig={() => openEdit(s)}
                onDetail={() => setDetailId(s.id)}
                onClone={() => cloneStrat(s)}
                onStop={() => onToast(D('toast.closeSent'))}
              />
            ))}
          </div>
        </div>

        <div className="right-panel">
          <div className="risk-panel">
            <div className="rp-title">
              {D('riskPanel.title')}
              <span className="tag tag-pos" style={{ fontSize: 9 }}>
                {D('riskPanel.healthy')}
              </span>
            </div>
            <div className="gauges-row">
              <Gauge pct={0.28} color="#10B981" label={D('riskPanel.fundUsage')} />
              <Gauge pct={0.62} color="#F59E0B" label={D('riskPanel.maxRiskStrategy')} />
              <Gauge pct={0.15} color="#10B981" label={D('riskPanel.overallRisk')} />
            </div>
            <div className="risk-settings">
              <div className="rs-row">
                <div className="rs-label">{D('riskPanel.dailyLossLimit')}</div>
                <div className="rs-val">$500</div>
              </div>
              <div className="rs-row">
                <div className="rs-label">{D('riskPanel.maxMarginUse')}</div>
                <div className="rs-val">30%</div>
              </div>
              <div className="rs-row">
                <div className="rs-label">{D('riskPanel.maxSlippage')}</div>
                <div className="rs-val">0.15%</div>
              </div>
              <ToggleRow
                label={D('riskPanel.autoEmergencyStop')}
                checked={autoStop}
                onChange={setAutoStop}
              />
              <ToggleRow
                label={D('riskPanel.negFundingPause')}
                checked={negFundingPause}
                onChange={setNegFundingPause}
              />
              <ToggleRow
                label={D('riskPanel.timeoutAlert')}
                checked={timeoutAlert}
                onChange={setTimeoutAlert}
              />
            </div>
          </div>

          <div className="radar-panel">
            <div className="rp-title" style={{ marginBottom: 10 }}>
              {D('radar.title')}
            </div>
            {radarItems.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                {D('radar.noRunning')}
              </div>
            ) : (
              radarItems.map((l) => {
                const paused = l.status === 'paused';
                const barColor = paused
                  ? 'var(--t4)'
                  : l.armed
                    ? 'var(--pos)'
                    : 'var(--gold)';
                return (
                  <div className="radar-item" key={l.id}>
                    <div className="radar-top">
                      <div className="radar-sym">
                        {l.name}
                        {paused ? (
                          <span
                            className="tag"
                            style={{
                              background: 'var(--surface)',
                              borderColor: 'var(--border)',
                              color: 'var(--t3)',
                              fontSize: 9,
                              marginLeft: 6,
                            }}
                          >
                            {D('radar.paused')}
                          </span>
                        ) : null}
                      </div>
                      <div
                        className="radar-val"
                        style={{
                          color: paused
                            ? 'var(--t3)'
                            : l.armed
                              ? 'var(--pos)'
                              : 'var(--t3)',
                        }}
                      >
                        {l.curRate.toFixed(2)}%{' '}
                        {paused
                          ? ''
                          : l.armed
                            ? `✓ ${D('radar.qualified')}`
                            : `· ${D('radar.threshold', { pct: l.threshold })}`}
                      </div>
                    </div>
                    <div className="radar-bar-track">
                      <div
                        className="radar-bar-fill"
                        style={{
                          width: `${l.pctToThreshold}%`,
                          background: barColor,
                        }}
                      />
                    </div>
                    <div className="radar-note">
                      {paused
                        ? D('radar.pausedNote')
                        : l.armed
                          ? D('radar.armedNote')
                          : D('radar.belowThreshold', {
                              pct: Math.max(0, l.threshold - l.curRate).toFixed(2),
                            })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="capital-panel">
            <div className="rp-title" style={{ marginBottom: 12 }}>
              {D('capital.title')}
            </div>
            <div className="donut-wrap">
              <Donut
                segments={DONUT_SEGMENTS}
                centerLabel={D('capital.totalPosition')}
                centerValue="$35K"
              />
              <div className="donut-legend">
                {DONUT_SEGMENTS.map((l) => (
                  <div className="dl-item" key={l.key}>
                    <div className="dl-dot" style={{ background: l.c }} />
                    <div className="dl-name">{D(`donut.${l.key}`)}</div>
                    <div className="dl-val">{l.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="activity-panel">
            <div className="ap-title">
              <div className="ap-live" />
              {D('activity.title')}
            </div>
            <div className="activity-feed">
              {activityLog.map((a) => (
                <div className="af-item" key={a.id}>
                  <div className="af-ico">{a.ico}</div>
                  <ActivityText parts={a.parts} />
                  <div className="af-time">{a.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={!!detailStrat}
        wide
        onClose={() => setDetailId(null)}
        header={
          <>
            <div
              className="modal-hdr-ico"
              style={{
                background:
                  detailStrat?.status === 'running'
                    ? 'var(--pos-dim)'
                    : 'var(--warn-dim)',
              }}
            >
              {detailStrat?.icon}
            </div>
            <div>
              <div className="modal-title">{detailStrat?.name}</div>
              <div className="modal-sub">
                {strategyTypeLabel(detailStrat?.typeKey)} · {detailStrat?.exchange} ·{' '}
                {D('detail.runningDays', {
                  days: detailStrat ? daysSince(detailStrat.startDate) : 0,
                })}
              </div>
            </div>
          </>
        }
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={() => {
                if (detailStrat) openEdit(detailStrat);
                setDetailId(null);
              }}
            >
              ⚙ {D('detail.adjustParams')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={() => setDetailId(null)}
            >
              {D('detail.close')}
            </button>
          </>
        }
      >
        {detailStrat ? (
          <>
            <div className="detail-metrics">
              {[
                [
                  D('detail.cumulativePnl'),
                  `${detailStrat.pnl >= 0 ? '+' : ''}$${detailStrat.pnl.toFixed(2)}`,
                  detailStrat.pnl >= 0 ? 'var(--pos)' : 'var(--danger)',
                ],
                [
                  D('detail.returnPct'),
                  `${detailStrat.pnlPct >= 0 ? '+' : ''}${detailStrat.pnlPct.toFixed(2)}%`,
                  detailStrat.pnl >= 0 ? 'var(--pos)' : 'var(--danger)',
                ],
                [
                  D('detail.marginRatio'),
                  `${detailStrat.marginRatio}%`,
                  detailStrat.marginRatio >= 50 ? 'var(--pos)' : 'var(--warn)',
                ],
                [
                  D('detail.leverage'),
                  `${detailStrat.leverage}x ${
                    detailStrat.marginMode === 'isolated'
                      ? D('detail.isolated')
                      : D('detail.cross')
                  }`,
                  'var(--t1)',
                ],
              ].map(([lbl, val, color]) => (
                <div className="dm-item" key={lbl}>
                  <div className="dm-lbl">{lbl}</div>
                  <div className="dm-val" style={{ color }}>
                    {val}
                  </div>
                </div>
              ))}
            </div>
            <div className="detail-section-title">{D('detail.pnlTrend')}</div>
            <Sparkline data={detailStrat.pnlHistory} w={640} h={72} color="#059669" />
            <div className="detail-section-title">{D('detail.positions')}</div>
            <table className="leg-table">
              <thead>
                <tr>
                  <th>{D('detail.table.role')}</th>
                  <th>{D('detail.table.symbol')}</th>
                  <th>{D('detail.table.entry')}</th>
                  <th>{D('detail.table.current')}</th>
                  <th>{D('detail.table.qty')}</th>
                </tr>
              </thead>
              <tbody>
                {(detailStrat.legs || []).map((leg) => (
                  <tr key={leg.symbol + leg.role}>
                    <td>
                      <span className="leg-role">
                        <span
                          className="leg-dot"
                          style={{ background: leg.dot }}
                        />
                        {leg.role}
                      </span>
                    </td>
                    <td>{leg.symbol}</td>
                    <td className="mono">${leg.entry.toFixed(2)}</td>
                    <td className="mono">${leg.current.toFixed(2)}</td>
                    <td className="mono">{leg.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="detail-section-title">{D('detail.execHistory')}</div>
            <div className="exec-timeline">
              {(detailStrat.execHistory || []).map((row) => (
                <div className="exec-tl-item" key={row.time + row.text}>
                  <div className="exec-tl-time">{row.time}</div>
                  <div>{row.text}</div>
                </div>
              ))}
            </div>
            <div className="detail-section-title">{D('detail.stressTitle')}</div>
            <div className="stress-grid">
              {stresses.map((st) => (
                <div className="stress-item" key={st.title}>
                  <div className="stress-scenario">
                    {st.icon} {st.title}
                  </div>
                  <div className="stress-outcome">{st.outcome}</div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        open={!!editStrat}
        onClose={() => setEditId(null)}
        header={
          <>
            <div className="modal-hdr-ico" style={{ background: 'var(--gold-dim)' }}>
              ⚙
            </div>
            <div>
              <div className="modal-title">{D('edit.title')}</div>
              <div className="modal-sub">
                {D('edit.sub', { name: editStrat?.name })}
              </div>
            </div>
          </>
        }
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setEditId(null)}
            >
              {D('edit.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={saveEdit}
            >
              {D('edit.save')}
            </button>
          </>
        }
      >
        {editStrat ? (
          <>
            <div className="field-locked" style={{ marginBottom: 14 }}>
              <div className="rs-row">
                <div className="rs-label">
                  {D('edit.leverage')}{' '}
                  <span className="locked-badge">{D('edit.lockedWhileRunning')}</span>
                </div>
                <div className="rs-val">{editStrat.leverage}x</div>
              </div>
              <div className="rs-row">
                <div className="rs-label">
                  {D('edit.marginMode')}{' '}
                  <span className="locked-badge">{D('edit.lockedWhileRunning')}</span>
                </div>
                <div className="rs-val">
                  {editStrat.marginMode === 'isolated'
                    ? D('detail.isolated')
                    : D('detail.cross')}
                </div>
              </div>
            </div>
            <div className="range-row">
              <div className="range-header">
                <div className="range-lbl">
                  {D('edit.minProfitThreshold')} <Tip tipKey="slippage" />
                </div>
                <div className="range-val">{editMinProfit}%</div>
              </div>
              <input
                className="range-input"
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={editMinProfit}
                onChange={(e) =>
                  setEditMinProfit(parseFloat(parseFloat(e.target.value).toFixed(2)))
                }
              />
            </div>
            <div className="range-row">
              <div className="range-header">
                <div className="range-lbl">{D('edit.dailyLossLimit')}</div>
                <div className="range-val">{editLoss}%</div>
              </div>
              <input
                className="range-input"
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={editLoss}
                onChange={(e) =>
                  setEditLoss(parseFloat(parseFloat(e.target.value).toFixed(1)))
                }
              />
            </div>
            <div className="param-ok">✓ {D('edit.effectiveNextCycle')}</div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="rs-row">
      <div className="rs-label">{label}</div>
      <label className="tgl">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="tgl-track" />
        <div className="tgl-thumb" />
      </label>
    </div>
  );
}

function StratCard({
  s,
  typeLabel,
  t,
  onPause,
  onResume,
  onConfig,
  onDetail,
  onClone,
  onStop,
}) {
  const D = (key) => t(`autoArb.dashboard.${key}`);
  const isUp = s.pnl >= 0;
  const profitColor = isUp ? 'var(--pos)' : 'var(--danger)';
  const riskColor =
    s.riskScore < 40
      ? 'var(--pos)'
      : s.riskScore < 70
        ? 'var(--warn)'
        : 'var(--danger)';

  const statusLabel =
    s.status === 'running'
      ? `● ${D('status.running')}`
      : s.status === 'paused'
        ? `⏸ ${D('status.paused')}`
        : `■ ${D('status.stopped')}`;

  return (
    <div className={`scard active ${s.status}`}>
      <div className="scard-hdr">
        <div
          className="sc-ico"
          style={{
            background:
              s.status === 'running' ? 'var(--pos-dim)' : 'var(--warn-dim)',
          }}
        >
          {s.icon}
        </div>
        <div>
          <div className="sc-name">{s.name}</div>
          <div className="sc-type">
            {typeLabel} · {s.exchange}
          </div>
        </div>
        <div
          className={`sc-status ${
            s.status === 'running'
              ? 'sc-running'
              : s.status === 'paused'
                ? 'sc-paused'
                : 'sc-stopped'
          }`}
        >
          {statusLabel}
        </div>
      </div>
      <div className="sc-metrics">
        <div className="scm">
          <div className="scm-l">{D('metrics.positionCapital')}</div>
          <div className="scm-v">${s.capital.toLocaleString()}</div>
        </div>
        <div className="scm">
          <div className="scm-l">{D('metrics.cumulativePnl')}</div>
          <div className="scm-v" style={{ color: profitColor }}>
            {isUp ? '+' : ''}${s.pnl.toFixed(2)}
          </div>
        </div>
        <div className="scm">
          <div className="scm-l">{D('metrics.returnPct')}</div>
          <div className="scm-v" style={{ color: profitColor }}>
            {isUp ? '+' : ''}
            {s.pnlPct.toFixed(2)}%
          </div>
        </div>
        <div className="scm">
          <div className="scm-l">{D('metrics.riskScore')}</div>
          <div className="scm-v" style={{ color: riskColor }}>
            {s.riskScore}/100
          </div>
        </div>
      </div>
      <div className="sc-bar">
        <div
          className="sc-bar-fill"
          style={{
            width: `${((s.posSize / s.maxCapital) * 100).toFixed(0)}%`,
            background: s.status === 'running' ? 'var(--pos)' : 'var(--warn)',
          }}
        />
      </div>
      <div className="sc-actions">
        {s.status === 'running' ? (
          <button type="button" className="sc-btn" onClick={onPause}>
            ⏸ {D('actions.pause')}
          </button>
        ) : (
          <button type="button" className="sc-btn primary" onClick={onResume}>
            ▶ {D('actions.resume')}
          </button>
        )}
        <button type="button" className="sc-btn" onClick={onConfig}>
          ⚙ {D('actions.config')}
        </button>
        <button type="button" className="sc-btn" onClick={onDetail}>
          📊 {D('actions.detail')}
        </button>
        <button type="button" className="sc-btn" onClick={onClone}>
          ⧉ {D('actions.clone')}
        </button>
        <button type="button" className="sc-btn danger" onClick={onStop}>
          ■ {D('actions.stop')}
        </button>
      </div>
    </div>
  );
}
