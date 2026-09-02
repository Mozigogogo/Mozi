'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EXCHANGES, VAULT_SERVER_IPS } from './data';

/**
 * @param {{
 *   onNavigate: (view: string) => void;
 *   onToast: (msg: string) => void;
 * }} props
 */
export default function Vault({ onNavigate, onToast }) {
  const { t, i18n } = useTranslation();
  const V = (key, opts) => t(`autoArb.vault.${key}`, opts);

  const [step, setStep] = useState(1);
  const [exchange, setExchange] = useState('Hyperliquid');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [note, setNote] = useState('');
  const [validationDone, setValidationDone] = useState(false);
  const [validating, setValidating] = useState(false);

  const steps = useMemo(
    () => V('steps', { returnObjects: true }) || [],
    [t, i18n.language],
  );

  useEffect(() => {
    if (!validating || validationDone) return undefined;
    const timer = setTimeout(() => {
      setValidationDone(true);
      setValidating(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [validating, validationDone]);

  const startValidation = () => {
    setValidationDone(false);
    setValidating(true);
    setStep(3);
  };

  const copyIp = async (ip) => {
    try {
      await navigator.clipboard.writeText(ip);
      onToast(`✅ ${V('toast.ipCopied', { ip })}`);
    } catch {
      onToast(V('toast.ip', { ip }));
    }
  };

  const howToItems = useMemo(
    () => V('step4.howToItems', { returnObjects: true, exchange }) || [],
    [t, i18n.language, exchange],
  );

  return (
    <div className="view">
      <div className="vault-wrap">
        <div className="vault-title">🔐 {V('title')}</div>
        <div className="vault-sub">
          {V('subBefore')}
          <strong>{V('subStrong')}</strong>
          {V('subAfter')}
        </div>
        <div className="vault-steps">
          {steps.map((label, i) => (
            <div
              key={label}
              className={`vs-item${step === i + 1 ? ' on' : ''}`}
              onClick={() => setStep(i + 1)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setStep(i + 1);
              }}
              role="button"
              tabIndex={0}
            >
              {i + 1}. {label}
            </div>
          ))}
        </div>
        <div className="vault-card">
          {step === 1 && (
            <>
              <div className="wz-title">{V('step1.title')}</div>
              <div className="wz-sub">{V('step1.sub')}</div>
              <div className="ex-select-grid">
                {EXCHANGES.map((e) => (
                  <div
                    key={e.id}
                    className={`ex-sel-item${exchange === e.name ? ' selected' : ''}`}
                    onClick={() => setExchange(e.name)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') setExchange(e.name);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div style={{ fontSize: 24 }}>{e.ico}</div>
                    <div className="ex-sel-name">{e.name}</div>
                    <div className="ex-sel-type">
                      {V(`exchangeTypes.${e.typeKey}`)}
                    </div>
                    {e.noteKey ? (
                      <div
                        style={{
                          fontSize: 9,
                          color: 'var(--gold)',
                          marginTop: 3,
                        }}
                      >
                        {V(`exchanges.${e.noteKey}`)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div
                style={{
                  padding: '12px 14px',
                  background: 'var(--surface)',
                  borderRadius: 'var(--rs)',
                  border: '1px solid var(--border)',
                  fontSize: 11,
                  color: 'var(--t2)',
                  lineHeight: 1.65,
                  marginBottom: 16,
                }}
              >
                📋 {V('step1.apiGuideBefore', { exchange })}{' '}
                {V('step1.apiGuideSteps')}
                <strong style={{ color: 'var(--danger)' }}>
                  {V('step1.apiGuideWithdrawOff')}
                </strong>
                {V('step1.apiGuideAfter')}
              </div>
              <div className="vault-footer">
                <button
                  type="button"
                  className="btn-full btn-gold"
                  onClick={() => setStep(2)}
                >
                  {V('step1.next')}
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="wz-title">
                {V('step2.title', { exchange })}
              </div>
              <div className="warning-box">
                <div className="wb-t">⚠ {V('step2.warningTitle')}</div>
                <div className="wb-li">
                  {V('step2.warningWithdrawBefore')}
                  <strong>{V('step2.warningWithdrawStrong')}</strong>
                  {V('step2.warningWithdrawAfter')}
                </div>
                <div className="wb-li">{V('step2.warningEncrypt')}</div>
                <div className="wb-li">
                  {V('step2.warningIp', { exchange })}
                </div>
              </div>
              <div className="form-group">
                <div className="form-label">
                  {V('step2.apiKey')}{' '}
                  <span className="tag tag-pos" style={{ fontSize: 9 }}>
                    {V('step2.required')}
                  </span>
                </div>
                <input
                  className="form-input"
                  type="text"
                  placeholder={V('step2.apiKeyPlaceholder')}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div className="form-group">
                <div className="form-label">
                  {V('step2.apiSecret')}{' '}
                  <span className="tag tag-pos" style={{ fontSize: 9 }}>
                    {V('step2.required')}
                  </span>
                </div>
                <input
                  className="form-input"
                  type="password"
                  placeholder={V('step2.apiSecretPlaceholder')}
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                />
              </div>
              <div className="form-group">
                <div className="form-label">
                  {V('step2.note')}{' '}
                  <span
                    className="tag"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--t3)',
                      fontSize: 9,
                    }}
                  >
                    {V('step2.optional')}
                  </span>
                </div>
                <input
                  className="form-input"
                  type="text"
                  placeholder={V('step2.notePlaceholder')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="perm-grid">
                <div className="perm-item perm-need">
                  <div className="perm-ico">✅</div>
                  <div>
                    <div className="perm-t">{V('step2.perms.futuresTitle')}</div>
                    <div className="perm-d">{V('step2.perms.futuresDesc')}</div>
                  </div>
                </div>
                <div className="perm-item perm-need">
                  <div className="perm-ico">✅</div>
                  <div>
                    <div className="perm-t">{V('step2.perms.spotTitle')}</div>
                    <div className="perm-d">{V('step2.perms.spotDesc')}</div>
                  </div>
                </div>
                <div className="perm-item perm-forbid">
                  <div className="perm-ico">🚫</div>
                  <div>
                    <div className="perm-t">{V('step2.perms.withdrawTitle')}</div>
                    <div className="perm-d">{V('step2.perms.withdrawDesc')}</div>
                  </div>
                </div>
                <div className="perm-item perm-forbid">
                  <div className="perm-ico">🚫</div>
                  <div>
                    <div className="perm-t">{V('step2.perms.subAccountTitle')}</div>
                    <div className="perm-d">{V('step2.perms.subAccountDesc')}</div>
                  </div>
                </div>
              </div>
              <div className="vault-footer">
                <button
                  type="button"
                  className="btn-full btn-ghost"
                  onClick={() => setStep(1)}
                >
                  {V('step2.back')}
                </button>
                <button
                  type="button"
                  className="btn-full btn-gold"
                  onClick={startValidation}
                >
                  {V('step2.validate')}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <VaultStep3
              done={validationDone}
              exchange={exchange}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              onForceDone={() => {
                setValidationDone(true);
                setValidating(false);
              }}
            />
          )}

          {step === 4 && (
            <>
              <div className="wz-title">🌐 {V('step4.title')}</div>
              <div className="wz-sub">{V('step4.sub', { exchange })}</div>
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--rs)',
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--t3)',
                    textTransform: 'uppercase',
                    letterSpacing: '.07em',
                    marginBottom: 8,
                  }}
                >
                  {V('step4.serverIps')}
                </div>
                {VAULT_SERVER_IPS.map((ip) => (
                  <div
                    key={ip}
                    onClick={() => copyIp(ip)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') copyIp(ip);
                    }}
                    role="button"
                    tabIndex={0}
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 13,
                      padding: '6px 10px',
                      background: 'var(--card)',
                      borderRadius: 'var(--rs)',
                      marginBottom: 6,
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{ip}</span>
                    <span style={{ fontSize: 10, color: 'var(--t3)' }}>
                      {V('step4.clickCopy')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="info-box">
                <div className="info-t">
                  {V('step4.howToTitle', { exchange })}
                </div>
                {howToItems.map((line) => (
                  <div className="info-li" key={line}>
                    {line}
                  </div>
                ))}
              </div>
              <div className="vault-footer">
                <button
                  type="button"
                  className="btn-full btn-ghost"
                  onClick={() => setStep(3)}
                >
                  {V('step4.back')}
                </button>
                <button
                  type="button"
                  className="btn-full btn-gold"
                  onClick={() => {
                    onToast(`🎉 ${V('toast.connected', { exchange })}`);
                    onNavigate('wizard');
                  }}
                >
                  {V('step4.finish')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function VaultStep3({ done, exchange, onBack, onNext, onForceDone }) {
  const { t, i18n } = useTranslation();
  const V = (key, opts) => t(`autoArb.vault.${key}`, opts);

  const checks = useMemo(
    () => V('step3.checks', { returnObjects: true }) || [],
    [t, i18n.language],
  );

  const items = checks.map((text, i) => ({
    ico: done ? '✅' : i === 4 && !done ? '🔍' : '⏳',
    text,
  }));

  return (
    <>
      <div className="wz-title">
        {done ? `✅ ${V('step3.titleDone')}` : `🔍 ${V('step3.titlePending')}`}
      </div>
      <div className="wz-sub">
        {done
          ? V('step3.subDone')
          : V('step3.subPending', { exchange })}
      </div>
      <div className="validation-anim">
        {items.map((it, i) => (
          <div className="va-item" key={it.text}>
            <div className={`va-ico${!done && i >= 3 ? ' loading' : ''}`}>{it.ico}</div>
            <div style={{ fontSize: 12, color: done ? 'var(--pos)' : 'var(--t2)' }}>
              {' '}
              {it.text}
            </div>
          </div>
        ))}
      </div>
      {done ? (
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--pos-dim)',
            border: '1px solid rgba(16,185,129,.25)',
            borderRadius: 'var(--rs)',
            fontSize: 11,
            color: 'var(--t2)',
            marginBottom: 16,
          }}
        >
          ✅{' '}
          <strong style={{ color: 'var(--pos)' }}>{V('step3.passSummary')}</strong>
          {V('step3.passDetail', { exchange })}
        </div>
      ) : null}
      <div className="vault-footer">
        {done ? (
          <>
            <button type="button" className="btn-full btn-ghost" onClick={onBack}>
              {V('step3.reenter')}
            </button>
            <button type="button" className="btn-full btn-gold" onClick={onNext}>
              {V('step3.next')}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-full btn-ghost" onClick={onBack}>
              {V('step3.back')}
            </button>
            <button type="button" className="btn-full btn-gold" onClick={onForceDone}>
              {V('step3.simulate')}
            </button>
          </>
        )}
      </div>
    </>
  );
}
