'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FEE_ASSUMPTIONS, OPPORTUNITIES, RISK_PRESETS } from './data';
import { Sparkline, Tip } from './charts';

const STRAT_TYPES = ['funding', 'spread', 'basis'];
const TOGGLE_KEYS = ['negFunding', 'basisReduce', 'dayStop', 'marginAlert'];

function inferStratType(source) {
  if (!source) return 'funding';
  if (source.typeKey) return source.typeKey;
  if (source.type?.includes('Funding') || source.type?.includes('funding')) return 'funding';
  if (source.type?.includes('价差') || source.type?.includes('spread')) return 'spread';
  if (source.type?.includes('基差') || source.type?.includes('basis')) return 'basis';
  return 'funding';
}

function computeEstimate(stratType, opp, leverage, capital) {
  const fee = FEE_ASSUMPTIONS[stratType];
  const oppAnn =
    opp?.annualized ?? { funding: 15, spread: 10, basis: 15 }[stratType];
  const slip = +((leverage - 1) * 0.15).toFixed(2);
  const net = +(oppAnn - fee.fee - slip).toFixed(2);
  const dailyUsd = (capital * net) / 100 / 365;
  return { oppAnn, fee, slip, net, dailyUsd };
}

/**
 * @param {{
 *   onNavigate: (view: string) => void;
 *   onToast: (msg: string) => void;
 *   cloneSource?: object | null;
 * }} props
 */
export default function Wizard({ onNavigate, onToast, cloneSource = null }) {
  const { t, i18n } = useTranslation();
  const W = (key, opts) => t(`autoArb.wizard.${key}`, opts);

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

  const wizardSteps = useMemo(
    () => W('steps', { returnObjects: true }) || [],
    [t, i18n.language],
  );

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

  const marginWarn = useMemo(() => {
    const impliedMaxSafeLoss = ((100 - 35) / leverage) * 0.4;
    if (lossLimit > impliedMaxSafeLoss) {
      return {
        danger: true,
        text: W('step3.marginWarnDanger', {
          leverage,
          loss: lossLimit,
          safe: impliedMaxSafeLoss.toFixed(1),
        }),
      };
    }
    return { danger: false, text: W('step3.marginWarnOk') };
  }, [lossLimit, leverage, t, i18n.language]);

  const capacityNoteText = useMemo(() => {
    if (!selectedOpp) return '';
    const pctOfDepth = (capital / selectedOpp.depth) * 100;
    if (pctOfDepth > 10) {
      return W('step2.capacityHigh', { pct: pctOfDepth.toFixed(0) });
    }
    return W('step2.capacityOk', {
      depth: (selectedOpp.depth / 1000).toFixed(0),
      pct: pctOfDepth.toFixed(1),
    });
  }, [selectedOpp, capital, t, i18n.language]);

  const typeLabel = W(`step1.types.${stratType}.name`);

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

  const marginModeLabel =
    marginMode === 'isolated' ? W('step2.isolated') : W('step2.cross');

  return (
    <div className="view">
      <div className="wizard-layout">
        <div className="wz-title" style={{ textAlign: 'center', marginBottom: 6 }}>
          {W('title')}
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--t2)',
            marginBottom: 24,
          }}
        >
          {W('subtitle')}
        </div>

        <div className="wizard-progress">
          {wizardSteps.map((label, i) => {
            const st = i + 1;
            return (
              <div key={label} style={{ display: 'contents' }}>
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
                  <div className={`wp-label${step === st ? ' current' : ''}`}>{label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <>
            <div className="wizard-card">
              <div className="wz-title">{W('step1.title')}</div>
              <div className="wz-sub">{W('step1.sub')}</div>
              <div className="type-grid">
                {STRAT_TYPES.map((id) => {
                  const type = W(`step1.types.${id}`, { returnObjects: true }) || {};
                  const icons = { funding: '⚡', spread: '🔀', basis: '📐' };
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`type-opt${stratType === id ? ' selected' : ''}`}
                      onClick={() => {
                        setStratType(id);
                        setSelectedOppId(null);
                      }}
                    >
                      <div className="type-opt-ico">{icons[id]}</div>
                      <div className="type-opt-name">{type.name}</div>
                      <div className="type-opt-ann">{type.ann}</div>
                      <div className="type-opt-desc">{type.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-primary" onClick={() => setStep(2)}>
                {W('nav.nextConfigure')}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="wizard-card">
              <div className="wz-title">{W('step2.title', { type: typeLabel })}</div>
              <div className="wz-sub">{W('step2.sub')}</div>

              <div className="form-label" style={{ marginBottom: 8 }}>
                {W('step2.pickLabel')}
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
                        {W('step2.depth', { amount: (o.depth / 1000).toFixed(0) })}
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
                      dangerouslySetInnerHTML={{
                        __html: W('step2.oppDetail', {
                          pair: selectedOpp.pair,
                          exchange: selectedOpp.exchange,
                          min: Math.min(...selectedOpp.history).toFixed(1),
                          max: Math.max(...selectedOpp.history).toFixed(1),
                          current: selectedOpp.annualized.toFixed(1),
                        }),
                      }}
                    />
                    {selectedOpp.cls === 'crypto-stock' ? (
                      <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4 }}>
                        {W('step2.cryptoStockNote')}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="config-grid">
                <div className="form-group">
                  <div className="form-label">
                    {W('step2.leverage')} <Tip tipKey="leverage" />
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
                    <span>{W('step2.leverageMin')}</span>
                    <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                      {leverage}x
                    </span>
                    <span>5x</span>
                  </div>
                </div>
                <div className="form-group">
                  <div className="form-label">{W('step2.marginMode')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      className={`preset-btn${marginMode === 'isolated' ? ' on' : ''}`}
                      style={{ padding: 9 }}
                      onClick={() => setMarginMode('isolated')}
                    >
                      <div className="preset-name" style={{ fontSize: 12 }}>
                        {W('step2.isolated')}
                      </div>
                      <div className="preset-desc">{W('step2.isolatedDesc')}</div>
                    </button>
                    <button
                      type="button"
                      className={`preset-btn${marginMode === 'cross' ? ' on' : ''}`}
                      style={{ padding: 9 }}
                      onClick={() => setMarginMode('cross')}
                    >
                      <div className="preset-name" style={{ fontSize: 12 }}>
                        {W('step2.cross')}
                      </div>
                      <div className="preset-desc">{W('step2.crossDesc')}</div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="range-row">
                <div className="range-header">
                  <div className="range-lbl">{W('step2.capital')}</div>
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
                <div className="capacity-note">{capacityNoteText}</div>
              </div>

              <div className="range-row">
                <div className="range-header">
                  <div className="range-lbl">{W('step2.minProfit')}</div>
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
                    <div className="le-lbl">{W('step2.estimateLabel')}</div>
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
                    {W('step2.oppAnn')} <b>{estimate.oppAnn.toFixed(2)}%</b>
                  </span>
                  <span>
                    − {W('step2.feeAssumption')} <b>{estimate.fee.fee}%</b>
                  </span>
                  <span>
                    − {W('step2.slipAssumption')} <b>{estimate.slip}%</b>
                  </span>
                  <span>
                    ≈ {W('step2.dailyEst')} <b>${estimate.dailyUsd.toFixed(2)}</b>
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                {W('nav.prev')}
              </button>
              <button type="button" className="btn-primary" onClick={() => setStep(3)}>
                {W('nav.nextRisk')}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="wizard-card">
              <div className="wz-title">{W('step3.title')}</div>
              <div className="wz-sub">{W('step3.sub')}</div>

              <div className="preset-bar">
                {Object.keys(RISK_PRESETS).map((k) => {
                  const preset = W(`presets.${k}`, { returnObjects: true }) || {};
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`preset-btn${activePreset === k ? ' on' : ''}`}
                      onClick={() => applyPreset(k)}
                    >
                      <div className="preset-name">{preset.name}</div>
                      <div className="preset-desc">{preset.desc}</div>
                    </button>
                  );
                })}
              </div>

              <div className="range-row">
                <div className="range-header">
                  <div className="range-lbl">{W('step3.dailyLoss')}</div>
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

              <div className={marginWarn.danger ? 'param-warn danger' : 'param-ok'}>
                {marginWarn.danger ? '⚠️ ' : '✓ '}
                {marginWarn.text}
              </div>

              <div className="rs-row">
                <div className="rs-label">
                  {W('step3.marginWarn')} <Tip tipKey="marginRatio" />
                </div>
                <div className="rs-val">{W('step3.marginWarnVal')}</div>
              </div>
              <div className="rs-row">
                <div className="rs-label">{W('step3.marginLiq')}</div>
                <div className="rs-val">{W('step3.marginLiqVal')}</div>
              </div>
              <div className="rs-row">
                <div className="rs-label">
                  {W('step3.maxSlippage')} <Tip tipKey="slippage" />
                </div>
                <div className="rs-val">{W('step3.maxSlippageVal')}</div>
              </div>
              <div className="rs-row">
                <div className="rs-label">
                  {W('step3.negFunding')} <Tip tipKey="funding" />
                </div>
                <div className="rs-val">{W('step3.negFundingVal')}</div>
              </div>
              <div className="rs-row">
                <div className="rs-label">{W('step3.maxTrades')}</div>
                <div className="rs-val">{W('step3.maxTradesVal')}</div>
              </div>
              <div style={{ height: 10 }} />
              {TOGGLE_KEYS.map((key) => {
                const toggle = W(`step3.toggles.${key}`, { returnObjects: true }) || {};
                return (
                  <div className="rs-row" key={key}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--t1)' }}>{toggle.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--t3)' }}>{toggle.desc}</div>
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
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
                {W('nav.prev')}
              </button>
              <button type="button" className="btn-primary" onClick={() => setStep(4)}>
                {W('nav.nextConfirm')}
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="paper-note">
              ⚠️{' '}
              <div>
                <strong style={{ color: 'var(--gold)' }}>{W('step4.paperTitle')}</strong>{' '}
                {W('step4.paperDesc')}
              </div>
            </div>
            <div className="wizard-card">
              <div className="wz-title">{W('step4.confirmTitle')}</div>
              <div className="wz-sub">{W('step4.confirmSub')}</div>
              <div className="sim-card">
                <div className="sim-title">{W('step4.summaryTitle')}</div>
                {[
                  [W('step4.fields.type'), typeLabel],
                  [W('step4.fields.asset'), selectedOpp?.pair ?? '--'],
                  [W('step4.fields.exchange'), selectedOpp?.exchange ?? '--'],
                  [
                    W('step4.fields.leverageMode'),
                    `${leverage}x / ${marginModeLabel}`,
                  ],
                  [W('step4.fields.capital'), `$${capital.toLocaleString()}`],
                  [W('step4.fields.minProfit'), `${minProfit}%`],
                  [W('step4.fields.dailyLoss'), `${lossLimit}%`],
                  [W('step4.fields.mode'), W('step4.fields.modeValue')],
                ].map(([lbl, v]) => (
                  <div className="sim-row" key={lbl}>
                    <div className="sim-l">{lbl}</div>
                    <div className="sim-v">{v}</div>
                  </div>
                ))}
              </div>
              <div className="sim-card">
                <div className="sim-title">{W('step4.returnsTitle')}</div>
                {[
                  [
                    W('step4.returns.neutral'),
                    `${netMid.toFixed(1)}%`,
                    W('step4.returns.neutralNote'),
                  ],
                  [
                    W('step4.returns.optimistic'),
                    `${netOpt}%`,
                    W('step4.returns.optimisticNote'),
                  ],
                  [
                    W('step4.returns.pessimistic'),
                    `${netPess}%`,
                    W('step4.returns.pessimisticNote'),
                  ],
                  [
                    W('step4.returns.annualUsd'),
                    `$${annual.toFixed(0)}`,
                    W('step4.returns.annualUsdNote', { pct: netMid.toFixed(1) }),
                  ],
                  [
                    W('step4.returns.dailyUsd'),
                    `$${daily.toFixed(2)}`,
                    W('step4.returns.dailyUsdNote'),
                  ],
                ].map(([lbl, v, d]) => (
                  <div className="sim-row" key={lbl}>
                    <div>
                      <div className="sim-l">{lbl}</div>
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
                ⚠️ <strong style={{ color: 'var(--danger)' }}>{W('step4.riskTitle')}</strong>
                {W('step4.riskBody')}
              </div>
              <label className="risk-ack">
                <input
                  type="checkbox"
                  checked={riskAck}
                  onChange={(e) => setRiskAck(e.target.checked)}
                />
                <div className="risk-ack-text">{W('step4.riskAck')}</div>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="btn-secondary" onClick={() => setStep(3)}>
                {W('nav.prev')}
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!riskAck}
                onClick={() => {
                  onToast(`🎉 ${W('toast.created')}`);
                  onNavigate('dashboard');
                }}
              >
                {W('nav.launch')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
