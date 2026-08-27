'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FEE_ASSUMPTIONS,
  OPPORTUNITIES,
  RISK_PRESETS,
} from './data';
import { Sparkline, Tip } from './charts';

const WIZARD_STEPS = ['选择类型', '配置参数', '风控设置', '模拟确认'];

const TYPE_LABEL = {
  funding: 'Funding 套利',
  spread: '跨所价差',
  basis: '基差套利',
};

function inferStratType(source) {
  if (!source) return 'funding';
  if (source.type?.includes('Funding') || source.type?.includes('funding')) return 'funding';
  if (source.type?.includes('价差') || source.type?.includes('spread')) return 'spread';
  if (source.type?.includes('基差') || source.type?.includes('basis')) return 'basis';
  return 'funding';
}

function computeEstimate(stratType, opp, leverage, capital) {
  const fee = FEE_ASSUMPTIONS[stratType];
  const oppAnn =
    opp?.annualized ??
    { funding: 15, spread: 10, basis: 15 }[stratType];
  const slip = +((leverage - 1) * 0.15).toFixed(2);
  const net = +(oppAnn - fee.fee - slip).toFixed(2);
  const dailyUsd = (capital * net) / 100 / 365;
  return { oppAnn, fee, slip, net, dailyUsd };
}

function capacityNote(opp, capital) {
  if (!opp) return '';
  const pctOfDepth = (capital / opp.depth) * 100;
  if (pctOfDepth > 10) {
    return `⚠️ 投入资金已达该机会可承载深度的 ${pctOfDepth.toFixed(0)}%，实际滑点可能高于预估`;
  }
  return `该机会当前可承载深度约 $${(opp.depth / 1000).toFixed(0)}K，你的投入仅占 ${pctOfDepth.toFixed(1)}%，滑点影响很小`;
}

function marginWarning(lossLimit, leverage) {
  const impliedMaxSafeLoss = ((100 - 35) / leverage) * 0.4;
  if (lossLimit > impliedMaxSafeLoss) {
    return {
      danger: true,
      text: `当前杠杆 ${leverage}x 下，日亏损限额 ${lossLimit}% 可能高于保证金强平线能承受的波动空间（约 ${impliedMaxSafeLoss.toFixed(1)}%）——行情剧烈波动时可能先触发强平，日亏损限额来不及生效。建议调低杠杆或调低亏损限额。`,
    };
  }
  return {
    danger: false,
    text: '当前参数组合下，日亏损限额会在触及强平线之前生效，风控顺序正常',
  };
}

/**
 * @param {{
 *   onNavigate: (view: string) => void;
 *   onToast: (msg: string) => void;
 *   cloneSource?: object | null;
 * }} props
 */
export default function Wizard({ onNavigate, onToast, cloneSource = null }) {
  const [step, setStep] = useState(1);
  const [stratType, setStratType] = useState(() => inferStratType(cloneSource));
  const [selectedOppId, setSelectedOppId] = useState(null);
  const [leverage, setLeverage] = useState(cloneSource?.leverage ?? 2);
  const [marginMode, setMarginMode] = useState(cloneSource?.marginMode ?? 'isolated');
  const [capital, setCapital] = useState(cloneSource?.capital ?? 10000);
  const [minProfit, setMinProfit] = useState(cloneSource?.minProfitThreshold ?? 0.1);
  const [lossLimit, setLossLimit] = useState(5);
  const [activePreset, setActivePreset] = useState('balanced');
  const [riskAck, setRiskAck] = useState(false);
  const [toggles, setToggles] = useState({
    negFunding: true,
    basisReduce: true,
    dayStop: true,
    marginAlert: true,
  });

  const oppList = OPPORTUNITIES[stratType] || [];
  const selectedOpp = useMemo(() => {
    const id = selectedOppId || oppList[0]?.id;
    return oppList.find((o) => o.id === id) || oppList[0] || null;
  }, [oppList, selectedOppId]);

  useEffect(() => {
    if (cloneSource) {
      setStratType(inferStratType(cloneSource));
      setLeverage(cloneSource.leverage ?? 2);
      setMarginMode(cloneSource.marginMode ?? 'isolated');
      setCapital(cloneSource.capital ?? 10000);
      setMinProfit(cloneSource.minProfitThreshold ?? 0.1);
    }
  }, [cloneSource]);

  useEffect(() => {
    if (oppList.length && !oppList.find((o) => o.id === selectedOppId)) {
      setSelectedOppId(oppList[0].id);
    }
  }, [stratType, oppList, selectedOppId]);

  const estimate = computeEstimate(stratType, selectedOpp, leverage, capital);
  const warn = marginWarning(lossLimit, leverage);
  const typeLabel = TYPE_LABEL[stratType];

  const applyPreset = (key) => {
    setActivePreset(key);
    if (key === 'custom') return;
    const p = RISK_PRESETS[key];
    setLossLimit(p.loss);
    setMinProfit(p.minProfit);
    setLeverage(p.leverage);
    setMarginMode(p.marginMode);
  };

  const netMid = estimate.net;
  const netOpt = +(netMid * 1.7).toFixed(1);
  const netPess = +(netMid * 0.5).toFixed(1);
  const annual = (capital * netMid) / 100;
  const daily = annual / 365;

  return (
    <div className="view">
      <div className="wizard-layout">
        <div className="wz-title" style={{ textAlign: 'center', marginBottom: 6 }}>
          新建套利策略
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--t2)',
            marginBottom: 24,
          }}
        >
          所有新策略先经过 72h 模拟验证，确认信号有效后才启动实盘
        </div>

        <div className="wizard-progress">
          {WIZARD_STEPS.map((s, i) => {
            const st = i + 1;
            return (
              <div key={s} style={{ display: 'contents' }}>
                {i > 0 ? (
                  <div className={`wp-line${step > i ? ' done' : ''}`} />
                ) : null}
                <div className="wp-step">
                  <div
                    className={`wp-circle${
                      step > st ? ' done' : step === st ? ' current' : ''
                    }`}
                  >
                    {step > st ? '✓' : st}
                  </div>
                  <div className={`wp-label${step === st ? ' current' : ''}`}>{s}</div>
                </div>
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <>
            <div className="wizard-card">
              <div className="wz-title">选择套利策略类型</div>
              <div className="wz-sub">
                不同策略对应不同的市场环境和风险偏好，建议从 Funding 套利入门
              </div>
              <div className="type-grid">
                {[
                  [
                    'funding',
                    '⚡',
                    'Funding 套利',
                    '8-30%/年',
                    '买现货 + 空永续，收取资金费率。方向中性，风险最低，新手首选。',
                  ],
                  [
                    'spread',
                    '🔀',
                    '跨所价差',
                    '5-20%/年',
                    '同资产在不同交易所买低卖高。执行快，但需要多所 API 同时接入。',
                  ],
                  [
                    'basis',
                    '📐',
                    '基差套利',
                    '10-25%/年',
                    '利用 perp/现货价差收敛获利。需要熟悉基差风险，建议有经验后使用。',
                  ],
                ].map(([id, ico, name, ann, desc]) => (
                  <button
                    key={id}
                    type="button"
                    className={`type-opt${stratType === id ? ' selected' : ''}`}
                    onClick={() => {
                      setStratType(id);
                      setSelectedOppId(null);
                    }}
                  >
                    <div className="type-opt-ico">{ico}</div>
                    <div className="type-opt-name">{name}</div>
                    <div className="type-opt-ann">{ann}</div>
                    <div className="type-opt-desc">{desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-primary" onClick={() => setStep(2)}>
                下一步：配置参数 →
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="wizard-card">
              <div className="wz-title">配置 {typeLabel} 参数</div>
              <div className="wz-sub">
                从当前正在监控的实时机会中选择目标资产——而不是盲选一个资产再祈祷有机会
              </div>

              <div className="form-label" style={{ marginBottom: 8 }}>
                选择目标机会（按年化收益排序，实时更新）
              </div>
              <div className="opp-picker">
                {[...oppList]
                  .sort((a, b) => b.annualized - a.annualized)
                  .map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className={`opp-item${selectedOpp?.id === o.id ? ' selected' : ''}`}
                      onClick={() => setSelectedOppId(o.id)}
                    >
                      <div>
                        <div className="opp-sym">
                          {o.symbol}
                          {o.cls === 'crypto-stock' ? ' 🎫' : ''}
                        </div>
                        <div className="opp-ex">{o.exchange}</div>
                      </div>
                      <div className="opp-spark">
                        <Sparkline data={o.history} w={70} h={24} />
                      </div>
                      <div
                        className="opp-ann"
                        style={{
                          color: o.annualized >= 12 ? 'var(--pos)' : 'var(--t1)',
                        }}
                      >
                        {o.annualized.toFixed(1)}%
                      </div>
                      <div className="opp-depth">
                        可承载 ${(o.depth / 1000).toFixed(0)}K
                      </div>
                    </button>
                  ))}
              </div>

              {selectedOpp ? (
                <div className="opp-detail">
                  <div className="opp-detail-spark">
                    <Sparkline
                      data={selectedOpp.history}
                      color={selectedOpp.annualized >= 12 ? '#059669' : '#0F172A'}
                      w={120}
                      h={48}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}
                    >
                      <strong>{selectedOpp.pair}</strong>（{selectedOpp.exchange}）近7日年化在{' '}
                      <strong className="mono">
                        {Math.min(...selectedOpp.history).toFixed(1)}%–
                        {Math.max(...selectedOpp.history).toFixed(1)}%
                      </strong>{' '}
                      之间波动，当前{' '}
                      <strong className="mono" style={{ color: 'var(--accent)' }}>
                        {selectedOpp.annualized.toFixed(1)}%
                      </strong>
                      。
                      {selectedOpp.cls === 'crypto-stock'
                        ? '该标的为美股代币，注意美股休市时段可能出现额外溢价。'
                        : ''}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="config-grid">
                <div className="form-group">
                  <div className="form-label">
                    杠杆倍数 <Tip tipKey="leverage" />
                  </div>
                  <input
                    className="range-input"
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={leverage}
                    onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 10,
                      color: 'var(--t3)',
                      marginTop: 4,
                    }}
                  >
                    <span>1x（不加杠杆）</span>
                    <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                      {leverage}x
                    </span>
                    <span>5x</span>
                  </div>
                </div>
                <div className="form-group">
                  <div className="form-label">保证金模式</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      className={`preset-btn${marginMode === 'isolated' ? ' on' : ''}`}
                      style={{ padding: 9 }}
                      onClick={() => setMarginMode('isolated')}
                    >
                      <div className="preset-name" style={{ fontSize: 12 }}>
                        逐仓 Isolated
                      </div>
                      <div className="preset-desc">风险隔离，单策略爆仓不影响其他仓位</div>
                    </button>
                    <button
                      type="button"
                      className={`preset-btn${marginMode === 'cross' ? ' on' : ''}`}
                      style={{ padding: 9 }}
                      onClick={() => setMarginMode('cross')}
                    >
                      <div className="preset-name" style={{ fontSize: 12 }}>
                        全仓 Cross
                      </div>
                      <div className="preset-desc">资金利用率更高，但风险互相牵连</div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="range-row">
                <div className="range-header">
                  <div className="range-lbl">投入资金（USD）</div>
                  <div className="range-val">${capital.toLocaleString()}</div>
                </div>
                <input
                  className="range-input"
                  type="range"
                  min="1000"
                  max="50000"
                  step="500"
                  value={capital}
                  onChange={(e) => setCapital(parseInt(e.target.value, 10))}
                />
                <div className="capacity-note">{capacityNote(selectedOpp, capital)}</div>
              </div>

              <div className="range-row">
                <div className="range-header">
                  <div className="range-lbl">最低净利润阈值（不足则放弃）</div>
                  <div className="range-val">{minProfit}%</div>
                </div>
                <input
                  className="range-input"
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.05"
                  value={minProfit}
                  onChange={(e) =>
                    setMinProfit(parseFloat(parseFloat(e.target.value).toFixed(2)))
                  }
                />
              </div>

              <div className="live-estimate">
                <div className="le-row">
                  <div>
                    <div className="le-lbl">扣除手续费/滑点后的预估净年化</div>
                  </div>
                  <div
                    className="le-val"
                    style={{
                      color: estimate.net >= 0 ? 'var(--accent)' : 'var(--danger)',
                    }}
                  >
                    {estimate.net >= 0 ? '+' : ''}
                    {estimate.net.toFixed(2)}%
                  </div>
                </div>
                <div className="le-breakdown">
                  <span>
                    机会年化 <b>{estimate.oppAnn.toFixed(2)}%</b>
                  </span>
                  <span>
                    − 手续费假设 <b>{estimate.fee.fee}%</b>
                  </span>
                  <span>
                    − 杠杆滑点假设 <b>{estimate.slip}%</b>
                  </span>
                  <span>
                    ≈ 预估日均 <b>${estimate.dailyUsd.toFixed(2)}</b>
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                ← 上一步
              </button>
              <button type="button" className="btn-primary" onClick={() => setStep(3)}>
                下一步：风控设置 →
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="wizard-card">
              <div className="wz-title">风控参数设置</div>
              <div className="wz-sub">
                这些参数决定策略在什么情况下自动保护你的资金——不确定怎么选就用预设
              </div>

              <div className="preset-bar">
                {Object.entries(RISK_PRESETS).map(([k, p]) => (
                  <button
                    key={k}
                    type="button"
                    className={`preset-btn${activePreset === k ? ' on' : ''}`}
                    onClick={() => applyPreset(k)}
                  >
                    <div className="preset-name">{p.name}</div>
                    <div className="preset-desc">{p.desc}</div>
                  </button>
                ))}
              </div>

              <div className="range-row">
                <div className="range-header">
                  <div className="range-lbl">日最大亏损限额</div>
                  <div className="range-val">{lossLimit}%</div>
                </div>
                <input
                  className="range-input"
                  type="range"
                  min="1"
                  max="15"
                  step="0.5"
                  value={lossLimit}
                  onChange={(e) => {
                    setLossLimit(parseFloat(parseFloat(e.target.value).toFixed(1)));
                    setActivePreset('custom');
                  }}
                />
              </div>

              <div className={warn.danger ? 'param-warn danger' : 'param-ok'}>
                {warn.danger ? '⚠️ ' : '✓ '}
                {warn.text}
              </div>

              <div className="rs-row">
                <div className="rs-label">
                  最低保证金率警戒线 <Tip tipKey="marginRatio" />
                </div>
                <div className="rs-val">50%（低于此值减仓）</div>
              </div>
              <div className="rs-row">
                <div className="rs-label">最低保证金率强平线</div>
                <div className="rs-val">35%（低于此值强制平仓）</div>
              </div>
              <div className="rs-row">
                <div className="rs-label">
                  最大滑点容忍度 <Tip tipKey="slippage" />
                </div>
                <div className="rs-val">0.15%（超出则放弃本次套利）</div>
              </div>
              <div className="rs-row">
                <div className="rs-label">
                  Funding 连续负次数阈值 <Tip tipKey="funding" />
                </div>
                <div className="rs-val">3次（暂停入场）</div>
              </div>
              <div className="rs-row">
                <div className="rs-label">单日最大执行笔数</div>
                <div className="rs-val">50笔</div>
              </div>
              <div style={{ height: 10 }} />
              {[
                ['negFunding', '负 Funding 自动暂停', 'Funding翻负时暂停入场'],
                ['basisReduce', '基差扩大自动减仓', '基差>1.5%时减至50%仓位'],
                ['dayStop', '日亏损触发全停', '达到日亏损限额停止新开仓'],
                ['marginAlert', '保证金不足告警', '提前推送告警'],
              ].map(([key, l, d]) => (
                <div className="rs-row" key={key}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--t1)' }}>{l}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{d}</div>
                  </div>
                  <label className="tgl">
                    <input
                      type="checkbox"
                      checked={toggles[key]}
                      onChange={(e) =>
                        setToggles((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                    />
                    <div className="tgl-track" />
                    <div className="tgl-thumb" />
                  </label>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
                ← 上一步
              </button>
              <button type="button" className="btn-primary" onClick={() => setStep(4)}>
                下一步：模拟确认 →
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="paper-note">
              ⚠️{' '}
              <div>
                <strong style={{ color: 'var(--gold)' }}>模拟交易期（72小时）</strong>
                ：新策略将先以模拟账户运行72小时，期间不产生真实交易。系统会验证策略逻辑、风控触发和收益预估的准确性。只有模拟期通过后，才能切换到实盘模式。
              </div>
            </div>
            <div className="wizard-card">
              <div className="wz-title">📋 策略配置确认</div>
              <div className="wz-sub">请仔细确认以下配置，策略启动后部分参数不可修改</div>
              <div className="sim-card">
                <div className="sim-title">策略配置摘要</div>
                {[
                  ['策略类型', typeLabel],
                  ['目标资产', selectedOpp?.pair ?? '--'],
                  ['主要交易所', selectedOpp?.exchange ?? '--'],
                  [
                    '杠杆 / 保证金模式',
                    `${leverage}x / ${marginMode === 'isolated' ? '逐仓' : '全仓'}`,
                  ],
                  ['投入资金', `$${capital.toLocaleString()}`],
                  ['最低利润阈值', `${minProfit}%`],
                  ['日亏损限额', `${lossLimit}%`],
                  ['运行模式', '先模拟72h，再实盘'],
                ].map(([l, v]) => (
                  <div className="sim-row" key={l}>
                    <div className="sim-l">{l}</div>
                    <div className="sim-v">{v}</div>
                  </div>
                ))}
              </div>
              <div className="sim-card">
                <div className="sim-title">
                  预期收益区间（基于所选机会实时数据估算，非历史回测保证）
                </div>
                {[
                  [
                    '年化净收益（中性预估）',
                    `${netMid.toFixed(1)}%`,
                    '机会年化 − 手续费假设 − 杠杆滑点假设',
                  ],
                  ['年化净收益（乐观预估）', `${netOpt}%`, '机会费率维持高位环境'],
                  ['年化净收益（悲观预估）', `${netPess}%`, '机会费率回落/滑点高于假设'],
                  [
                    '预估年化绝对收益',
                    `$${annual.toFixed(0)}`,
                    `按中性预估 ${netMid.toFixed(1)}% 计算`,
                  ],
                  ['预估日均收益', `$${daily.toFixed(2)}`, '不代表保证收益'],
                ].map(([l, v, d]) => (
                  <div className="sim-row" key={l}>
                    <div>
                      <div className="sim-l">{l}</div>
                      <div style={{ fontSize: 10, color: 'var(--t3)' }}>{d}</div>
                    </div>
                    <div className="sim-v" style={{ color: 'var(--accent)' }}>
                      {v}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  padding: '12px 14px',
                  background: 'var(--danger-dim)',
                  border: '1px solid rgba(239,68,68,.2)',
                  borderRadius: 'var(--rs)',
                  fontSize: 11,
                  color: 'var(--t2)',
                  lineHeight: 1.65,
                  marginBottom: 16,
                }}
              >
                ⚠️{' '}
                <strong style={{ color: 'var(--danger)' }}>风险提示：</strong>
                套利策略并非无风险。极端行情可能导致亏损。请仅投入你可以承受亏损的资金。
              </div>
              <label className="risk-ack">
                <input
                  type="checkbox"
                  checked={riskAck}
                  onChange={(e) => setRiskAck(e.target.checked)}
                />
                <div className="risk-ack-text">
                  我已阅读并理解以上风险提示和策略配置，明白模拟期表现不代表实盘一定能达到同样收益，愿意承担相应风险。
                </div>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="btn-secondary" onClick={() => setStep(3)}>
                ← 上一步
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!riskAck}
                onClick={() => {
                  onToast('🎉 策略已创建！72小时模拟期开始...');
                  onNavigate('dashboard');
                }}
              >
                🚀 启动模拟交易
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
