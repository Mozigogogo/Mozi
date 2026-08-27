'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Landing from './Landing';
import Dashboard from './Dashboard';
import Vault from './Vault';
import Wizard from './Wizard';
import { INITIAL_STRATEGIES, NAV_ITEMS } from './data';
import './autoarb.css';

/**
 * @param {{ onSwitchToRadar?: () => void; className?: string }} props
 */
export default function AutoArb({ onSwitchToRadar, className }) {
  const [view, setView] = useState('landing');
  const [strategies, setStrategies] = useState(() =>
    INITIAL_STRATEGIES.map((s) => ({ ...s })),
  );
  const [toast, setToast] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);
  const [cloneSource, setCloneSource] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const startNewWizard = (source = null) => {
    setCloneSource(source);
    setWizardKey((k) => k + 1);
    setView('wizard');
  };

  const emergencyStop = () => {
    setStrategies((prev) => prev.map((s) => ({ ...s, status: 'stopped' })));
    setConfirmOpen(false);
    showToast('🛑 所有策略已紧急停止，请检查仓位');
  };

  const rootClass = ['mozi-autoarb', className].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      <header className="hdr">
        <div className="hdr-inner">
          <div className="hdr-switch" role="tablist" aria-label="arbitrage header switch">
            <button
              type="button"
              className="hdr-switch-tab"
              role="tab"
              aria-selected="false"
              onClick={() => onSwitchToRadar?.()}
            >
              套利专区
            </button>
            <button
              type="button"
              className="hdr-switch-tab is-active"
              role="tab"
              aria-selected="true"
            >
              自动套利
            </button>
          </div>

          <nav className="nav" aria-label="AutoArb views">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nbtn${view === item.id ? ' on' : ''}`}
                onClick={() => {
                  if (item.id === 'wizard') startNewWizard(null);
                  else setView(item.id);
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="main">
        {view === 'landing' && (
          <Landing
            onNavigate={(v) => {
              if (v === 'wizard') startNewWizard(null);
              else setView(v);
            }}
            onToast={showToast}
          />
        )}
        {view === 'dashboard' && (
          <Dashboard
            strategies={strategies}
            onStrategiesChange={setStrategies}
            onNavigate={(v) => {
              if (v === 'wizard') startNewWizard(null);
              else setView(v);
            }}
            onToast={showToast}
            onEmergencyConfirm={() => setConfirmOpen(true)}
            onStartWizard={startNewWizard}
          />
        )}
        {view === 'vault' && (
          <Vault
            onNavigate={(v) => {
              if (v === 'wizard') startNewWizard(null);
              else setView(v);
            }}
            onToast={showToast}
          />
        )}
        {view === 'wizard' && (
          <Wizard
            key={wizardKey}
            cloneSource={cloneSource}
            onNavigate={(v) => {
              setCloneSource(null);
              setView(v);
            }}
            onToast={showToast}
          />
        )}
      </main>

      {toast ? (
        <div className="toast" role="status">
          <span>{toast}</span>
        </div>
      ) : null}

      <div
        className={`confirm-overlay${confirmOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!confirmOpen}
      >
        <div className="confirm-box">
          <div className="cb-title">🛑 紧急停止所有策略</div>
          <div className="cb-desc">
            这将立即暂停所有正在运行的套利策略，并发出平仓信号。
            <strong style={{ color: 'var(--t1)' }}>
              当前已建立的对冲仓位不会自动平仓
            </strong>
            ，需要手动处理。确定继续？
          </div>
          <div className="cb-actions">
            <button
              type="button"
              className="btn-full btn-ghost"
              onClick={() => setConfirmOpen(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="btn-full"
              style={{
                background: 'var(--danger)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--rs)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                padding: 11,
              }}
              onClick={emergencyStop}
            >
              确认停止全部
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
