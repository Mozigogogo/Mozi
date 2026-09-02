'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  buildVaultCredentialJson,
  fetchVaultCredentials,
  fetchVaultExchanges,
  saveVaultCredentials,
} from '@/api/vault';
import { getFallbackVaultExchanges } from '@/utils/vaultExchanges';
import { VAULT_SERVER_IPS } from './data';
import './styles/vault.css';

/**
 * @param {{
 *   onNavigate: (view: string) => void;
 *   onToast: (msg: string) => void;
 * }} props
 */
export default function Vault({ onNavigate, onToast }) {
  const { t, i18n } = useTranslation();
  const V = (key, opts) => t(`autoArb.vault.${key}`, opts);

  const [viewMode, setViewMode] = useState('list');
  const [credentials, setCredentials] = useState([]);
  const [credentialsLoading, setCredentialsLoading] = useState(true);
  const [credentialsError, setCredentialsError] = useState(null);
  const [step, setStep] = useState(1);
  const [exchanges, setExchanges] = useState([]);
  const [selectedExchange, setSelectedExchange] = useState(null);
  const [exchangesLoading, setExchangesLoading] = useState(true);
  const [exchangesError, setExchangesError] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [note, setNote] = useState('');
  const [validationDone, setValidationDone] = useState(false);
  const [validating, setValidating] = useState(false);
  const submitRef = useRef(null);

  const exchangeName = selectedExchange?.name || '';

  const steps = useMemo(
    () => V('steps', { returnObjects: true }) || [],
    [t, i18n.language],
  );

  const loadCredentials = useCallback(async () => {
    setCredentialsLoading(true);
    setCredentialsError(null);
    try {
      const list = await fetchVaultCredentials();
      setCredentials(list);
    } catch (err) {
      setCredentials([]);
      setCredentialsError(err?.message || String(err));
    } finally {
      setCredentialsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode !== 'list') return undefined;
    loadCredentials();
  }, [viewMode, loadCredentials]);

  useEffect(() => {
    if (viewMode !== 'wizard') return undefined;

    let cancelled = false;

    (async () => {
      setExchangesLoading(true);
      setExchangesError(null);
      try {
        const list = await fetchVaultExchanges();
        if (cancelled) return;
        setExchanges(list);
        const current = list.find((e) => e.exchangeId === selectedExchange?.exchangeId);
        const next =
          (current?.available ? current : null) ||
          list.find((e) => e.available) ||
          list[0] ||
          null;
        setSelectedExchange(next);
      } catch (err) {
        if (cancelled) return;
        const fallback = getFallbackVaultExchanges();
        setExchanges(fallback);
        setExchangesError(err?.message || String(err));
        setSelectedExchange(fallback.find((e) => e.available) || fallback[0] || null);
      } finally {
        if (!cancelled) setExchangesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when wizard opens
  }, [viewMode]);

  useEffect(() => {
    if (step !== 3 || !validating || validationDone || !submitRef.current) {
      return undefined;
    }

    const payload = submitRef.current;
    let cancelled = false;

    (async () => {
      const started = Date.now();
      try {
        await saveVaultCredentials(payload);
        const elapsed = Date.now() - started;
        const wait = Math.max(0, 2400 - elapsed);
        if (wait) {
          await new Promise((resolve) => setTimeout(resolve, wait));
        }
        if (!cancelled) {
          setApiSecret('');
          setValidationDone(true);
          setValidating(false);
          submitRef.current = null;
          loadCredentials();
        }
      } catch (err) {
        if (!cancelled) {
          onToast(err?.message || V('step2.saveFailed'));
          setValidating(false);
          setStep(2);
          submitRef.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per validation attempt
  }, [step, validating, validationDone]);

  const startValidation = () => {
    if (!selectedExchange?.available || !selectedExchange?.exchangeId) {
      onToast(V('step2.noExchange'));
      return;
    }

    const trimmedKey = apiKey.trim();
    const trimmedSecret = apiSecret.trim();
    if (!trimmedKey || !trimmedSecret) {
      onToast(V('step2.missingFields'));
      return;
    }

    submitRef.current = {
      exchangeId: selectedExchange.exchangeId,
      label: note.trim() || undefined,
      credentialJson: buildVaultCredentialJson({
        apiKey: trimmedKey,
        apiSecret: trimmedSecret,
      }),
    };

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
    () => V('step4.howToItems', { returnObjects: true, exchange: exchangeName }) || [],
    [t, i18n.language, exchangeName],
  );

  const selectExchange = (item) => {
    if (!item?.available) {
      onToast(V('step1.unavailable'));
      return;
    }
    setSelectedExchange(item);
  };

  const resetWizardForm = () => {
    setStep(1);
    setApiKey('');
    setApiSecret('');
    setNote('');
    setValidationDone(false);
    setValidating(false);
    submitRef.current = null;
  };

  const startAddFlow = () => {
    resetWizardForm();
    setViewMode('wizard');
  };

  const backToList = () => {
    if (validating) return;
    resetWizardForm();
    setViewMode('list');
  };

  const formatCredentialDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="view">
      <div className="vault-wrap">
        <div className="vault-title">🔐 {V('title')}</div>
        <div className="vault-sub">
          {V('subBefore')}
          <strong>{V('subStrong')}</strong>
          {V('subAfter')}
        </div>

        {viewMode === 'list' ? (
          <div className="vault-card">
            <div className="vault-list-head">
              <div>
                <div className="vault-list-title">{V('list.title')}</div>
                <div className="vault-list-sub">{V('list.sub')}</div>
              </div>
              <button type="button" className="vault-add-btn" onClick={startAddFlow}>
                {V('list.add')}
              </button>
            </div>

            {credentialsLoading ? (
              <div className="ex-load-hint">{V('list.loading')}</div>
            ) : (
              <>
                {credentialsError ? (
                  <div className="vault-list-error">
                    {V('list.loadError')}
                    <button
                      type="button"
                      className="vault-retry-btn"
                      onClick={loadCredentials}
                    >
                      {V('list.retry')}
                    </button>
                  </div>
                ) : null}

                {credentials.length === 0 ? (
                  <div className="vault-empty">
                    <div className="vault-empty-ico">🔑</div>
                    <div className="vault-empty-title">{V('list.emptyTitle')}</div>
                    <div className="vault-empty-sub">{V('list.emptySub')}</div>
                    <button type="button" className="vault-add-btn" onClick={startAddFlow}>
                      {V('list.emptyCta')}
                    </button>
                  </div>
                ) : (
                  <div className="cred-list">
                    {credentials.map((cred) => (
                      <div className="cred-item" key={cred.id}>
                        <div className="cred-ico">{cred.ico}</div>
                        <div className="cred-main">
                          <div className="cred-name">{cred.exchangeName}</div>
                          <div className="cred-meta">
                            <span>
                              {V('list.colLabel')}:{' '}
                              {cred.label || V('list.noLabel')}
                            </span>
                            <span className="cred-key">
                              {V('list.colKey')}: {cred.apiKeyPreview}
                            </span>
                            <span>
                              {V('list.colUpdated')}: {formatCredentialDate(cred.updatedAt)}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`cred-status ${
                            cred.status === 'active' ? 'active' : 'pending'
                          }`}
                        >
                          {cred.status === 'active'
                            ? V('list.statusActive')
                            : V('list.statusPending')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <>
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
              {exchangesLoading ? (
                <div className="ex-load-hint">{V('step1.loadingExchanges')}</div>
              ) : (
                <>
                  {exchangesError ? (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--warn)',
                        marginBottom: 12,
                        textAlign: 'center',
                      }}
                    >
                      {V('step1.loadError')}
                    </div>
                  ) : null}
                  <div className="ex-select-grid">
                    {exchanges.map((e) => {
                      const noteKey = e.noteKey;
                      const hasNote =
                        noteKey && V(`exchanges.${noteKey}`, { defaultValue: '' });
                      return (
                        <div
                          key={e.exchangeId || e.code}
                          className={[
                            'ex-sel-item',
                            selectedExchange?.exchangeId === e.exchangeId ? 'selected' : '',
                            !e.available ? 'unavailable' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => selectExchange(e)}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') selectExchange(e);
                          }}
                          role="button"
                          tabIndex={e.available ? 0 : -1}
                          aria-disabled={!e.available}
                        >
                          <div style={{ fontSize: 24 }}>{e.ico}</div>
                          <div className="ex-sel-name">{e.name}</div>
                          <div className="ex-sel-type">
                            {V(`exchangeTypes.${e.typeKey}`)}
                          </div>
                          {hasNote ? (
                            <div
                              style={{
                                fontSize: 9,
                                color: 'var(--gold)',
                                marginTop: 3,
                              }}
                            >
                              {hasNote}
                            </div>
                          ) : null}
                          {!e.available ? (
                            <div className="ex-unavail-tag">{V('step1.maintenance')}</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
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
                📋 {V('step1.apiGuideBefore', { exchange: exchangeName })}{' '}
                {V('step1.apiGuideSteps')}
                <strong style={{ color: 'var(--danger)' }}>
                  {V('step1.apiGuideWithdrawOff')}
                </strong>
                {V('step1.apiGuideAfter')}
              </div>
              <div className="vault-footer">
                <button
                  type="button"
                  className="btn-full btn-ghost"
                  onClick={backToList}
                >
                  {V('wizard.cancel')}
                </button>
                <button
                  type="button"
                  className="btn-full btn-gold"
                  disabled={!selectedExchange?.available || exchangesLoading}
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
                {V('step2.title', { exchange: exchangeName })}
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
                  {V('step2.warningIp', { exchange: exchangeName })}
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
                  disabled={validating}
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
              validating={validating}
              exchange={exchangeName}
              onBack={() => {
                if (validating) return;
                setStep(2);
              }}
              onNext={() => setStep(4)}
            />
          )}

          {step === 4 && (
            <>
              <div className="wz-title">🌐 {V('step4.title')}</div>
              <div className="wz-sub">{V('step4.sub', { exchange: exchangeName })}</div>
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
                  {V('step4.howToTitle', { exchange: exchangeName })}
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
                    onToast(
                      `🎉 ${V('toast.connected', { exchange: exchangeName })}`,
                    );
                    backToList();
                  }}
                >
                  {V('step4.finish')}
                </button>
              </div>
            </>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}

function VaultStep3({ done, validating, exchange, onBack, onNext }) {
  const { t, i18n } = useTranslation();
  const V = (key, opts) => t(`autoArb.vault.${key}`, opts);

  const checks = useMemo(
    () => V('step3.checks', { returnObjects: true }) || [],
    [t, i18n.language],
  );

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (done) {
      setActiveIdx(checks.length);
      return undefined;
    }
    if (!validating) {
      setActiveIdx(0);
      return undefined;
    }
    setActiveIdx(0);
    const timer = setInterval(() => {
      setActiveIdx((prev) => {
        if (prev >= checks.length - 1) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 480);
    return () => clearInterval(timer);
  }, [validating, done, checks.length]);

  const items = checks.map((text, i) => {
    if (done || i < activeIdx) {
      return { ico: '✅', text, spinning: false };
    }
    if (i === activeIdx && validating) {
      return { ico: i === 4 ? '🔍' : '⏳', text, spinning: true };
    }
    return { ico: '⏳', text, spinning: false };
  });

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
        {items.map((it) => (
          <div className="va-item" key={it.text}>
            <div className={`va-ico${it.spinning ? ' is-spinning' : ''}`}>{it.ico}</div>
            <div style={{ fontSize: 12, color: done || it.ico === '✅' ? 'var(--pos)' : 'var(--t2)' }}>
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
          <button
            type="button"
            className="btn-full btn-ghost"
            disabled={validating}
            onClick={onBack}
          >
            {V('step3.back')}
          </button>
        )}
      </div>
    </>
  );
}
