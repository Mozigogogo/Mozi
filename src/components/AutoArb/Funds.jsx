'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchAccountFunds } from '@/api/strategy';
import './styles/funds.css';

function money(n, currency = 'USD') {
  const v = Number(n);
  if (!Number.isFinite(v)) return '--';
  const abs = Math.abs(v);
  const formatted =
    abs >= 1000
      ? abs.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : abs.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  const sign = v < 0 ? '-' : '';
  return currency === 'USD' ? `${sign}$${formatted}` : `${sign}${formatted} ${currency}`;
}

function pnlClass(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return '';
  return v > 0 ? 'is-pos' : 'is-neg';
}

function Metric({ label, value, sub, valueClass }) {
  return (
    <div className="funds-metric">
      <div className="funds-metric-lbl">{label}</div>
      <div className={`funds-metric-val${valueClass ? ` ${valueClass}` : ''}`}>{value}</div>
      {sub ? <div className="funds-metric-sub">{sub}</div> : null}
    </div>
  );
}

/**
 * 账户资金：模拟仓 vs 真实账户（导航独立 Tab，在「新建策略」旁）
 * 数据：GET /autoarb/api/v1/account/funds
 * @param {{
 *   onNavigate: (view: string) => void;
 *   onToast: (msg: string) => void;
 * }} props
 */
export default function Funds({ onNavigate, onToast }) {
  const { t } = useTranslation();
  const F = (key, opts) => t(`autoArb.funds.${key}`, opts);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [funds, setFunds] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAccountFunds();
      setFunds(data);
    } catch (err) {
      setFunds(null);
      const msg = err?.message || t('autoArb.funds.loadFailed');
      setError(msg);
      onToast?.(msg);
    } finally {
      setLoading(false);
    }
  }, [onToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const paper = funds?.paper;
  const live = funds?.live;
  const currency = paper?.currency || live?.currency || 'USD';

  return (
    <div className="view funds-view">
      <div className="funds-hero">
        <div>
          <div className="funds-eyebrow">{F('eyebrow')}</div>
          <h1 className="funds-title">{F('title')}</h1>
          <p className="funds-sub">{F('sub')}</p>
        </div>
        <div className="funds-hero-actions">
          <button type="button" className="btn-ghost funds-btn" onClick={load} disabled={loading}>
            {loading ? F('refreshing') : F('refresh')}
          </button>
          <button
            type="button"
            className="btn-full funds-btn funds-btn-primary"
            onClick={() => onNavigate('vault')}
          >
            {F('goVault')}
          </button>
        </div>
      </div>

      {error && !loading ? (
        <div className="funds-banner funds-banner-warn" role="alert">
          <span>{error}</span>
          <button type="button" className="funds-link-btn" onClick={load}>
            {F('retry')}
          </button>
        </div>
      ) : null}

      <div className="funds-grid">
        <section className="funds-card funds-card-paper">
          <div className="funds-card-head">
            <div>
              <div className="funds-card-badge">{F('paper.badge')}</div>
              <h2 className="funds-card-title">{F('paper.title')}</h2>
            </div>
            <div className="funds-card-hint">{F('paper.hint')}</div>
          </div>

          {loading && !paper ? (
            <div className="funds-empty">{F('loading')}</div>
          ) : error && !paper ? (
            <div className="funds-empty">{F('loadFailed')}</div>
          ) : (
            <>
              <div className="funds-metrics">
                <Metric
                  label={F('fields.equity')}
                  value={money(paper?.equity, currency)}
                />
                <Metric
                  label={F('fields.available')}
                  value={money(paper?.available, currency)}
                />
                <Metric
                  label={F('fields.occupied')}
                  value={money(paper?.occupied, currency)}
                  sub={F('fields.occupiedHint')}
                />
                <Metric
                  label={F('fields.usagePct')}
                  value={`${Number(paper?.usagePct ?? 0).toFixed(2)}%`}
                />
              </div>
              <div className="funds-pnl-row">
                <div>
                  <span className="funds-pnl-lbl">{F('fields.unrealizedPnl')}</span>
                  <span className={`funds-pnl-val ${pnlClass(paper?.unrealizedPnl)}`}>
                    {paper?.unrealizedPnl == null
                      ? '--'
                      : money(paper.unrealizedPnl, currency)}
                  </span>
                </div>
                <button
                  type="button"
                  className="funds-link-btn"
                  onClick={() => onNavigate('dashboard')}
                >
                  {F('goDashboard')}
                </button>
              </div>
            </>
          )}
        </section>

        <section className="funds-card funds-card-live">
          <div className="funds-card-head">
            <div>
              <div className="funds-card-badge is-live">{F('live.badge')}</div>
              <h2 className="funds-card-title">{F('live.title')}</h2>
            </div>
            <div className="funds-card-hint">{F('live.hint')}</div>
          </div>

          {loading && !live ? (
            <div className="funds-empty">{F('loading')}</div>
          ) : error && !live ? (
            <div className="funds-empty">{F('loadFailed')}</div>
          ) : !live?.connected ? (
            <div className="funds-empty-state">
              <div className="funds-empty-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="7"
                    width="18"
                    height="12"
                    rx="2.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M7 7V6a5 5 0 0 1 10 0v1"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="13" r="1.4" fill="currentColor" />
                </svg>
              </div>
              <p className="funds-empty-title">{F('live.disconnectedTitle')}</p>
              <p className="funds-empty-sub">{F('live.disconnectedSub')}</p>
              <button
                type="button"
                className="funds-connect-btn"
                onClick={() => onNavigate('vault')}
              >
                {F('live.connectCta')}
              </button>
            </div>
          ) : (
            <>
              <div className="funds-metrics">
                <Metric
                  label={F('fields.equity')}
                  value={money(live?.equity, live?.currency || currency)}
                />
                <Metric
                  label={F('fields.available')}
                  value={money(live?.available, live?.currency || currency)}
                />
                <Metric
                  label={F('fields.occupied')}
                  value={money(live?.occupied, live?.currency || currency)}
                />
                <Metric
                  label={F('fields.usagePct')}
                  value={`${Number(live?.usagePct ?? 0).toFixed(2)}%`}
                />
              </div>

              {Array.isArray(live?.exchanges) && live.exchanges.length > 0 ? (
                <div className="funds-ex-list">
                  <div className="funds-ex-title">{F('live.exchanges')}</div>
                  {live.exchanges.map((ex) => (
                    <div key={ex.exchangeId} className="funds-ex-row">
                      <div className="funds-ex-name">
                        <span>{ex.exchangeName}</span>
                        <span
                          className={`funds-ex-status${ex.connected ? ' is-on' : ''}`}
                        >
                          {ex.connected ? F('live.connected') : F('live.offline')}
                        </span>
                      </div>
                      <div className="funds-ex-vals">
                        <span>
                          {F('fields.equity')} {money(ex.equity, ex.currency || currency)}
                        </span>
                        <span>
                          {F('fields.available')}{' '}
                          {money(ex.available, ex.currency || currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>

      <p className="funds-footnote">{F('footnote')}</p>
    </div>
  );
}
