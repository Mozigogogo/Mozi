'use client';

import { useTranslation } from 'react-i18next';

const SECURITY_META = [
  ['var(--pos-dim)', '🔐'],
  ['var(--blue-dim)', '🔒'],
  ['var(--gold-dim)', '🌐'],
  ['var(--purple-dim)', '🛡️'],
];

const EDGE_CATS = ['exec', 'risk', 'ops'];

/**
 * @param {{ onNavigate: (view: string) => void; onToast: (msg: string) => void }} props
 */
export default function Landing({ onNavigate, onToast }) {
  const { t } = useTranslation();
  const L = (key, opts) => t(`autoArb.landing.${key}`, opts);

  const steps = L('howItWorks.steps', { returnObjects: true }) || [];
  const securityItems = L('security.items', { returnObjects: true }) || [];
  const threatModel = L('security.threatModel', { returnObjects: true }) || [];
  const plans = L('pricing.plans', { returnObjects: true }) || [];
  const bizItems = L('pricing.bizNote.items', { returnObjects: true }) || [];
  const edgeItems = L('edgeCases.items', { returnObjects: true }) || {};
  const edgeCategories = L('edgeCases.categories', { returnObjects: true }) || {};
  const statLabels = L('strategies.statLabels', { returnObjects: true }) || {};

  const planActions = [
    () => onToast(t('autoArb.toast.freeSignup')),
    () => onNavigate('wizard'),
    () => onToast(t('autoArb.toast.contactPro')),
    () => onToast(t('autoArb.toast.contactBiz')),
  ];

  return (
    <div className="view">
      <div className="hero">
        <div className="hero-bg" />
        <div className="hero-eyebrow">⚡ {L('hero.eyebrow')}</div>
        <h1 className="hero-h1">
          {L('hero.titleLine1')}
          <br />
          <span>{L('hero.titleLine2')}</span>
          {L('hero.titleLine3')}
        </h1>
        <p className="hero-sub">{L('hero.sub')}</p>
        <div className="hero-actions">
          <button type="button" className="btn-primary" onClick={() => onNavigate('wizard')}>
            🚀 {L('hero.ctaPrimary')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigate('dashboard')}
          >
            {L('hero.ctaSecondary')}
          </button>
        </div>
        <div className="hero-stats">
          <div className="hs-item">
            <div className="hs-val">$2.4M+</div>
            <div className="hs-lbl">{L('stats.volume')}</div>
          </div>
          <div className="hs-sep" />
          <div className="hs-item">
            <div className="hs-val">12.8%</div>
            <div className="hs-lbl">{L('stats.apr')}</div>
          </div>
          <div className="hs-sep" />
          <div className="hs-item">
            <div className="hs-val">99.7%</div>
            <div className="hs-lbl">{L('stats.success')}</div>
          </div>
          <div className="hs-sep" />
          <div className="hs-item">
            <div className="hs-val">0</div>
            <div className="hs-lbl">{L('stats.lossEvents')}</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="sec-eyebrow">{L('howItWorks.eyebrow')}</div>
        <div className="sec-title">{L('howItWorks.title')}</div>
        <div className="sec-sub">{L('howItWorks.sub')}</div>
        <div className="steps-grid">
          {steps.map((step, i) => (
            <div className="step-card" key={step.title}>
              <div className="step-num">{i + 1}</div>
              <div className="step-title">{step.title}</div>
              <div className="step-desc">{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="sec-eyebrow">{L('strategies.eyebrow')}</div>
        <div className="sec-title">{L('strategies.title')}</div>
        <div className="sec-sub">{L('strategies.sub')}</div>
        <div className="strat-grid">
          <div className="strat-card funding">
            <div className="strat-icon">⚡</div>
            <div className="strat-name">{L('strategies.funding.name')}</div>
            <div className="strat-desc">{L('strategies.funding.desc')}</div>
            <div className="strat-stats">
              <div className="ss-item">
                <div className="ss-lbl">{statLabels.histApr}</div>
                <div className="ss-val" style={{ color: 'var(--accent)' }}>
                  8-30%
                </div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">{statLabels.maxDd}</div>
                <div className="ss-val" style={{ color: 'var(--warn)' }}>
                  ≤3%
                </div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">{statLabels.dirRisk}</div>
                <div className="ss-val" style={{ color: 'var(--pos)' }}>
                  {L('strategies.funding.dirRisk')}
                </div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">{statLabels.minCapital}</div>
                <div className="ss-val">$1,000</div>
              </div>
            </div>
            <div className="strat-assets">
              {['BTC', 'ETH', 'SOL', 'NVDA', 'TSLA', '+40'].map((a) => (
                <span className="asset-chip" key={a}>
                  {a}
                </span>
              ))}
            </div>
          </div>
          <div className="strat-card spread">
            <div className="strat-icon">🔀</div>
            <div className="strat-name">{L('strategies.spread.name')}</div>
            <div className="strat-desc">{L('strategies.spread.desc')}</div>
            <div className="strat-stats">
              <div className="ss-item">
                <div className="ss-lbl">{statLabels.singleReturn}</div>
                <div className="ss-val" style={{ color: 'var(--blue)' }}>
                  0.3-1.5%
                </div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">{statLabels.frequency}</div>
                <div className="ss-val">{L('strategies.funding.frequency')}</div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">{statLabels.capitalUse}</div>
                <div className="ss-val" style={{ color: 'var(--pos)' }}>
                  {L('strategies.spread.capitalUse')}
                </div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">{statLabels.minCapital}</div>
                <div className="ss-val">$3,000</div>
              </div>
            </div>
            <div className="strat-assets">
              {['BTC', 'ETH', 'NVDA', 'COIN', '+20'].map((a) => (
                <span className="asset-chip" key={a}>
                  {a}
                </span>
              ))}
            </div>
          </div>
          <div className="strat-card basis">
            <div className="strat-icon">📐</div>
            <div className="strat-name">{L('strategies.basis.name')}</div>
            <div className="strat-desc">{L('strategies.basis.desc')}</div>
            <div className="strat-stats">
              <div className="ss-item">
                <div className="ss-lbl">{statLabels.histApr}</div>
                <div className="ss-val" style={{ color: 'var(--purple)' }}>
                  10-25%
                </div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">{statLabels.basisRisk}</div>
                <div className="ss-val" style={{ color: 'var(--warn)' }}>
                  {L('strategies.basis.basisRisk')}
                </div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">{statLabels.holdPeriod}</div>
                <div className="ss-val">{L('strategies.basis.holdPeriod')}</div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">{statLabels.minCapital}</div>
                <div className="ss-val">$2,000</div>
              </div>
            </div>
            <div className="strat-assets">
              {['ETH', 'SOL', 'AVAX', '+15'].map((a) => (
                <span className="asset-chip" key={a}>
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="sec-eyebrow">{L('security.eyebrow')}</div>
        <div className="sec-title">{L('security.title')}</div>
        <div className="sec-sub">{L('security.sub')}</div>
        <div className="security-layout">
          <div className="security-list">
            {securityItems.map((item, i) => {
              const [bg, ico] = SECURITY_META[i] || ['var(--pos-dim)', '🔐'];
              return (
                <div className="sec-item" key={item.title}>
                  <div className="sec-item-ico" style={{ background: bg }}>
                    {ico}
                  </div>
                  <div>
                    <div className="sec-item-t">{item.title}</div>
                    <div className="sec-item-d">{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div>
            <div className="threat-model">
              <div className="tm-title">{L('security.threatTitle')}</div>
              {threatModel.map((row) => (
                <div className="tm-row" key={row.threat}>
                  <div className="tm-threat">
                    <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 2 }}>
                      {row.threat}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{row.desc}</div>
                  </div>
                  <span
                    className={`tm-status ${row.status === 'solved' ? 'tm-solved' : 'tm-partial'}`}
                  >
                    {L(`security.threatStatus.${row.status}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="sec-eyebrow">{L('pricing.eyebrow')}</div>
        <div className="sec-title">{L('pricing.title')}</div>
        <div className="sec-sub">{L('pricing.sub')}</div>
        <div className="pricing-grid">
          {plans.map((plan, i) => (
            <PlanCard
              key={plan.name}
              name={plan.name}
              price={plan.price}
              perMonth={L('pricing.perMonth')}
              sub={plan.sub}
              btn={plan.btn}
              featured={i === 1}
              features={plan.features}
              onBtn={planActions[i]}
            />
          ))}
        </div>
        <div className="biz-note">
          <div className="biz-t">💡 {L('pricing.bizNote.title')}</div>
          {bizItems.map((line) => (
            <div className="biz-li" key={line}>
              {line}
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="sec-eyebrow">{L('edgeCases.eyebrow')}</div>
        <div className="sec-title">{L('edgeCases.title')}</div>
        <div className="edge-grid">
          {EDGE_CATS.map((cat) => (
            <EdgeCard
              key={cat}
              cat={cat}
              label={edgeCategories[cat]}
              items={edgeItems[cat] || []}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanCard({ name, price, perMonth, sub, btn, features, featured, onBtn }) {
  return (
    <div className={`plan-card${featured ? ' featured' : ''}`}>
      <div className="plan-name">{name}</div>
      <div className="plan-price">
        {price}
        <span>{perMonth}</span>
      </div>
      <div className="plan-sub">{sub}</div>
      <button type="button" className="plan-btn" onClick={onBtn}>
        {btn}
      </button>
      {features.map((f) =>
        f.included ? (
          <div className="plan-feature" key={f.text}>
            <span className="pf-ico">✓</span>
            {f.text}
          </div>
        ) : (
          <div className="plan-feature" key={f.text}>
            <span className="pf-ico x">×</span>
            {f.text}
          </div>
        ),
      )}
    </div>
  );
}

function EdgeCard({ cat, label, items }) {
  return (
    <div className="edge-card">
      <div className={`edge-cat ${cat}`}>{label}</div>
      {items.map(([q, a]) => (
        <div className="edge-item" key={q}>
          <div>
            <div className="edge-q">{q}</div>
            <div className="edge-a">{a}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
