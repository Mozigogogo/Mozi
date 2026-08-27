'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ACTIVITY_TEMPLATES,
  DONUT_SEGMENTS,
  INITIAL_ACTIVITY,
  STRESS_BY_TYPE,
} from './data';
import { ActivityText, Donut, Gauge, Modal, Sparkline, Tip } from './charts';

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
  const [activityLog, setActivityLog] = useState(INITIAL_ACTIVITY);
  const [autoStop, setAutoStop] = useState(true);
  const [negFundingPause, setNegFundingPause] = useState(true);
  const [timeoutAlert, setTimeoutAlert] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editMinProfit, setEditMinProfit] = useState(0.1);
  const [editLoss, setEditLoss] = useState(5);
  const actIdRef = useRef(100);

  const detailStrat = strategies.find((s) => s.id === detailId);
  const editStrat = strategies.find((s) => s.id === editId);

  const totalCapital = strategies.reduce((s, x) => s + x.capital, 0);
  const totalPnl = strategies.reduce((s, x) => s + x.pnl, 0);
  const totalDailyPnl = strategies.reduce((s, x) => s + x.dailyPnl, 0);
  const running = strategies.filter((s) => s.status === 'running').length;
  const radarItems = buildRadarItems(strategies);

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
        const t =
          ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
        actIdRef.current += 1;
        setActivityLog((prev) =>
          [
            {
              id: `live-${actIdRef.current}`,
              ico: t.ico,
              parts: t.build(t.strat),
              time: '刚刚',
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
  }, [onStrategiesChange]);

  const pauseStrat = (id) => {
    onStrategiesChange((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'paused' } : s)),
    );
    onToast('⏸ 策略已暂停，当前仓位维持不变');
  };

  const resumeStrat = (id) => {
    onStrategiesChange((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'running' } : s)),
    );
    onToast('▶ 策略已恢复运行');
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
    onToast('✅ 策略参数已更新');
  };

  const cloneStrat = (s) => {
    onStartWizard?.(s);
    onToast(`已带入「${s.name}」的配置，可调整后创建新策略`);
  };

  const stresses =
    STRESS_BY_TYPE[detailStrat?.type] || STRESS_BY_TYPE['Funding 套利'];

  return (
    <div className="view">
      <div className="emergency-bar">
        <div className="eb-text">
          ⚡ <strong>{running} 个策略运行中</strong> · 总仓位 $
          {totalCapital.toLocaleString()} · 今日净收益{' '}
          <strong
            style={{
              color: totalDailyPnl >= 0 ? 'var(--pos)' : 'var(--danger)',
            }}
          >
            {totalDailyPnl >= 0 ? '+' : ''}${totalDailyPnl.toFixed(2)}
          </strong>
        </div>
        <button type="button" className="stop-btn" onClick={onEmergencyConfirm}>
          🛑 紧急停止全部
        </button>
      </div>

      <div className="dash-stats">
        <div className="ds-card">
          <div className="ds-lbl">💼 投入总资金</div>
          <div className="ds-val" style={{ color: 'var(--t1)' }}>
            ${totalCapital.toLocaleString()}
          </div>
          <div className="ds-sub">跨 {running} 个活跃策略</div>
        </div>
        <div className="ds-card">
          <div className="ds-lbl">📈 累计净收益</div>
          <div
            className="ds-val"
            style={{ color: totalPnl >= 0 ? 'var(--pos)' : 'var(--danger)' }}
          >
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </div>
          <div className="ds-sub">
            +{(totalCapital ? (totalPnl / totalCapital) * 100 : 0).toFixed(2)}% 总回报
          </div>
        </div>
        <div className="ds-card">
          <div className="ds-lbl">📅 今日收益</div>
          <div
            className="ds-val"
            style={{
              color: totalDailyPnl >= 0 ? 'var(--pos)' : 'var(--danger)',
            }}
          >
            {totalDailyPnl >= 0 ? '+' : ''}${totalDailyPnl.toFixed(2)}
          </div>
          <div className="ds-sub">最后更新 刚刚</div>
        </div>
        <div className="ds-card">
          <div className="ds-lbl">🛡️ 综合风险</div>
          <div className="ds-val" style={{ color: 'var(--pos)' }}>
            低
          </div>
          <div className="ds-sub">风险分 28/100</div>
        </div>
        <div className="ds-card">
          <div className="ds-lbl">⚡ 执行成功率</div>
          <div className="ds-val" style={{ color: 'var(--pos)' }}>
            99.4%
          </div>
          <div className="ds-sub">过去30天 114/115笔</div>
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
              策略列表
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
              + 新建策略
            </button>
          </div>
          <div className="strat-list">
            {strategies.map((s) => (
              <StratCard
                key={s.id}
                s={s}
                onPause={() => pauseStrat(s.id)}
                onResume={() => resumeStrat(s.id)}
                onConfig={() => openEdit(s)}
                onDetail={() => setDetailId(s.id)}
                onClone={() => cloneStrat(s)}
                onStop={() => onToast('已发送平仓信号...')}
              />
            ))}
          </div>
        </div>

        <div className="right-panel">
          <div className="risk-panel">
            <div className="rp-title">
              风控仪表盘
              <span className="tag tag-pos" style={{ fontSize: 9 }}>
                健康
              </span>
            </div>
            <div className="gauges-row">
              <Gauge pct={0.28} color="#10B981" label="资金使用" />
              <Gauge pct={0.62} color="#F59E0B" label="最高风险策略" />
              <Gauge pct={0.15} color="#10B981" label="整体风险" />
            </div>
            <div className="risk-settings">
              <div className="rs-row">
                <div className="rs-label">日亏损限额</div>
                <div className="rs-val">$500</div>
              </div>
              <div className="rs-row">
                <div className="rs-label">最高保证金使用</div>
                <div className="rs-val">30%</div>
              </div>
              <div className="rs-row">
                <div className="rs-label">单笔最大滑点</div>
                <div className="rs-val">0.15%</div>
              </div>
              <ToggleRow label="自动紧急停止" checked={autoStop} onChange={setAutoStop} />
              <ToggleRow
                label="负 Funding 暂停"
                checked={negFundingPause}
                onChange={setNegFundingPause}
              />
              <ToggleRow
                label="超时告警通知"
                checked={timeoutAlert}
                onChange={setTimeoutAlert}
              />
            </div>
          </div>

          <div className="radar-panel">
            <div className="rp-title" style={{ marginBottom: 10 }}>
              信号雷达
            </div>
            {radarItems.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>暂无运行中的策略</div>
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
                            已暂停
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
                            ? '✓ 达标'
                            : `· 阈值 ${l.threshold}%`}
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
                        ? '策略已暂停，即使信号达标也不会开新仓'
                        : l.armed
                          ? '当前信号已满足开仓条件，等待执行引擎下一次轮询'
                          : `距离触发阈值还差 ${Math.max(0, l.threshold - l.curRate).toFixed(2)}%`}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="capital-panel">
            <div className="rp-title" style={{ marginBottom: 12 }}>
              资金分配
            </div>
            <div className="donut-wrap">
              <Donut segments={DONUT_SEGMENTS} />
              <div className="donut-legend">
                {DONUT_SEGMENTS.map((l) => (
                  <div className="dl-item" key={l.n}>
                    <div className="dl-dot" style={{ background: l.c }} />
                    <div className="dl-name">{l.n}</div>
                    <div className="dl-val">{l.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="activity-panel">
            <div className="ap-title">
              <div className="ap-live" />
              实时操作日志
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
                {detailStrat?.type} · {detailStrat?.exchange} · 运行{' '}
                {detailStrat ? daysSince(detailStrat.startDate) : 0} 天
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
              ⚙ 调整参数
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={() => setDetailId(null)}
            >
              关闭
            </button>
          </>
        }
      >
        {detailStrat ? (
          <>
            <div className="detail-metrics">
              {[
                ['累计收益', `${detailStrat.pnl >= 0 ? '+' : ''}$${detailStrat.pnl.toFixed(2)}`, detailStrat.pnl >= 0 ? 'var(--pos)' : 'var(--danger)'],
                ['收益率', `${detailStrat.pnlPct >= 0 ? '+' : ''}${detailStrat.pnlPct.toFixed(2)}%`, detailStrat.pnl >= 0 ? 'var(--pos)' : 'var(--danger)'],
                ['保证金率', `${detailStrat.marginRatio}%`, detailStrat.marginRatio >= 50 ? 'var(--pos)' : 'var(--warn)'],
                ['杠杆', `${detailStrat.leverage}x ${detailStrat.marginMode === 'isolated' ? '逐仓' : '全仓'}`, 'var(--t1)'],
              ].map(([lbl, val, color]) => (
                <div className="dm-item" key={lbl}>
                  <div className="dm-lbl">{lbl}</div>
                  <div className="dm-val" style={{ color }}>
                    {val}
                  </div>
                </div>
              ))}
            </div>
            <div className="detail-section-title">收益走势（近14日）</div>
            <Sparkline data={detailStrat.pnlHistory} w={640} h={72} color="#059669" />
            <div className="detail-section-title">持仓明细（双腿对冲）</div>
            <table className="leg-table">
              <thead>
                <tr>
                  <th>角色</th>
                  <th>标的</th>
                  <th>开仓价</th>
                  <th>现价</th>
                  <th>数量</th>
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
            <div className="detail-section-title">执行历史</div>
            <div className="exec-timeline">
              {(detailStrat.execHistory || []).map((row) => (
                <div className="exec-tl-item" key={row.time + row.text}>
                  <div className="exec-tl-time">{row.time}</div>
                  <div>{row.text}</div>
                </div>
              ))}
            </div>
            <div className="detail-section-title">极端情况会怎样（压力场景说明）</div>
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
              <div className="modal-title">调整策略参数</div>
              <div className="modal-sub">
                {editStrat?.name} · 仅部分字段允许在运行中修改
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
              取消
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={saveEdit}
            >
              保存修改
            </button>
          </>
        }
      >
        {editStrat ? (
          <>
            <div className="field-locked" style={{ marginBottom: 14 }}>
              <div className="rs-row">
                <div className="rs-label">
                  杠杆倍数 <span className="locked-badge">运行中锁定</span>
                </div>
                <div className="rs-val">{editStrat.leverage}x</div>
              </div>
              <div className="rs-row">
                <div className="rs-label">
                  保证金模式 <span className="locked-badge">运行中锁定</span>
                </div>
                <div className="rs-val">
                  {editStrat.marginMode === 'isolated' ? '逐仓' : '全仓'}
                </div>
              </div>
            </div>
            <div className="range-row">
              <div className="range-header">
                <div className="range-lbl">
                  最低净利润阈值 <Tip tipKey="slippage" />
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
                <div className="range-lbl">日最大亏损限额</div>
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
            <div className="param-ok">✓ 修改将在下一执行周期生效，不会打断当前持仓</div>
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

function StratCard({ s, onPause, onResume, onConfig, onDetail, onClone, onStop }) {
  const isUp = s.pnl >= 0;
  const profitColor = isUp ? 'var(--pos)' : 'var(--danger)';
  const riskColor =
    s.riskScore < 40
      ? 'var(--pos)'
      : s.riskScore < 70
        ? 'var(--warn)'
        : 'var(--danger)';

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
            {s.type} · {s.exchange}
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
          {s.status === 'running'
            ? '● 运行中'
            : s.status === 'paused'
              ? '⏸ 已暂停'
              : '■ 已停止'}
        </div>
      </div>
      <div className="sc-metrics">
        <div className="scm">
          <div className="scm-l">仓位资金</div>
          <div className="scm-v">${s.capital.toLocaleString()}</div>
        </div>
        <div className="scm">
          <div className="scm-l">累计收益</div>
          <div className="scm-v" style={{ color: profitColor }}>
            {isUp ? '+' : ''}${s.pnl.toFixed(2)}
          </div>
        </div>
        <div className="scm">
          <div className="scm-l">收益率</div>
          <div className="scm-v" style={{ color: profitColor }}>
            {isUp ? '+' : ''}
            {s.pnlPct.toFixed(2)}%
          </div>
        </div>
        <div className="scm">
          <div className="scm-l">风险评分</div>
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
            ⏸ 暂停
          </button>
        ) : (
          <button type="button" className="sc-btn primary" onClick={onResume}>
            ▶ 恢复
          </button>
        )}
        <button type="button" className="sc-btn" onClick={onConfig}>
          ⚙ 配置
        </button>
        <button type="button" className="sc-btn" onClick={onDetail}>
          📊 详情
        </button>
        <button type="button" className="sc-btn" onClick={onClone}>
          ⧉ 克隆
        </button>
        <button type="button" className="sc-btn danger" onClick={onStop}>
          ■ 停止
        </button>
      </div>
    </div>
  );
}
