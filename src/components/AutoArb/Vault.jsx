'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchVaultCredentials,
  fetchVaultExchanges,
  parseVaultCredentialId,
  saveVaultCredentials,
  verifyVaultCredential,
} from '@/api/vault';
import { getFallbackVaultExchanges } from '@/utils/vaultExchanges';
import {
  buildCredentialPayload,
  clearSensitiveCredentialValues,
  emptyCredentialValues,
  getVaultCredentialSchema,
  getVerifyChecksKey,
  validateCredentialValues,
} from '@/utils/vaultCredentialSchema';
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
  const [credentialValues, setCredentialValues] = useState(() => emptyCredentialValues('hyperliquid'));
  const [note, setNote] = useState('');
  const [credentialId, setCredentialId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [validationDone, setValidationDone] = useState(false);
  const [validating, setValidating] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [verifyDetail, setVerifyDetail] = useState('');
  const verifyRequestId = useRef(0);

  const exchangeName = selectedExchange?.name || '';
  const exchangeCode = selectedExchange?.code || 'hyperliquid';
  const credentialSchema = useMemo(
    () => getVaultCredentialSchema(exchangeCode),
    [exchangeCode],
  );

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

  const runVerify = useCallback(
    async (id) => {
      const credId = Number(id);
      if (!Number.isFinite(credId) || credId <= 0) return;

      const reqId = ++verifyRequestId.current;
      setValidating(true);
      setVerifyError(null);
      setValidationDone(false);
      setVerifyDetail('');

      const started = Date.now();
      try {
        const result = await verifyVaultCredential(credId);
        const elapsed = Date.now() - started;
        const wait = Math.max(0, 1800 - elapsed);
        if (wait) {
          await new Promise((resolve) => setTimeout(resolve, wait));
        }
        if (reqId !== verifyRequestId.current) return;

        if (result.verified) {
          setValidationDone(true);
          setVerifyDetail(result.verifyDetail || '');
          loadCredentials();
        } else {
          setVerifyError(result.verifyDetail || t('autoArb.vault.step3.verifyFailed'));
        }
      } catch (err) {
        if (reqId !== verifyRequestId.current) return;
        setVerifyError(err?.message || t('autoArb.vault.step3.verifyError'));
      } finally {
        if (reqId === verifyRequestId.current) setValidating(false);
      }
    },
    [t, loadCredentials],
  );

  useEffect(() => {
    if (step !== 3 || !credentialId || validationDone) return undefined;
    if (verifyError) return undefined;
    runVerify(credentialId);
    return () => {
      verifyRequestId.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- verify once per credentialId on step 3
  }, [step, credentialId]);

  const handleCreateCredential = async () => {
    if (!selectedExchange?.available || !selectedExchange?.exchangeId) {
      onToast(V('step2.noExchange'));
      return;
    }

    const { valid, missingFieldId, invalidFieldId } = validateCredentialValues(
      exchangeCode,
      credentialValues,
    );
    if (!valid) {
      if (invalidFieldId === 'privateKey' && exchangeCode === 'hyperliquid') {
        onToast(V('step2.invalidPrivateKey'));
        return;
      }
      const fieldLabel = missingFieldId
        ? V(`fields.${missingFieldId}.label`, { defaultValue: missingFieldId })
        : '';
      onToast(
        fieldLabel ? V('step2.missingField', { field: fieldLabel }) : V('step2.missingFields'),
      );
      return;
    }

    setCreating(true);
    setVerifyError(null);
    setValidationDone(false);
    setVerifyDetail('');
    verifyRequestId.current += 1;

    try {
      const saved = await saveVaultCredentials({
        exchangeId: selectedExchange.exchangeId,
        label: note.trim() || undefined,
        payload: buildCredentialPayload(exchangeCode, credentialValues),
      });
      const id = parseVaultCredentialId(saved);
      if (!id) {
        throw new Error(V('step2.saveFailed'));
      }
      setCredentialId(id);
      setCredentialValues(clearSensitiveCredentialValues(exchangeCode, credentialValues));
      setStep(3);
    } catch (err) {
      onToast(err?.message || V('step2.saveFailed'));
    } finally {
      setCreating(false);
    }
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
    if (item.code !== selectedExchange?.code) {
      setCredentialValues(emptyCredentialValues(item.code));
    }
    setSelectedExchange(item);
  };

  const resetWizardForm = () => {
    setStep(1);
    setCredentialValues(emptyCredentialValues('hyperliquid'));
    setNote('');
    setCredentialId(null);
    setCreating(false);
    setValidationDone(false);
    setValidating(false);
    setVerifyError(null);
    setVerifyDetail('');
    verifyRequestId.current += 1;
  };

  const goToStep = (nextStep) => {
    if (nextStep === 3 && !credentialId) return;
    if (nextStep === 4 && !validationDone) return;
    if (validating || creating) return;
    setStep(nextStep);
  };

  const startAddFlow = () => {
    resetWizardForm();
    setViewMode('wizard');
  };

  const backToList = () => {
    if (validating || creating) return;
    resetWizardForm();
    setViewMode('list');
  };

  const reenterKeys = () => {
    if (validating) return;
    verifyRequestId.current += 1;
    setCredentialId(null);
    setValidationDone(false);
    setValidating(false);
    setVerifyError(null);
    setVerifyDetail('');
    setCredentialValues(emptyCredentialValues(exchangeCode));
    setStep(2);
  };

  const credentialGuide = V(`credentialGuides.${exchangeCode}`, {
    defaultValue: V('credentialGuides.binance'),
  });

  const step2Title =
    credentialSchema.authType === 'agent_wallet'
      ? V('step2.titleAgent', { exchange: exchangeName })
      : V('step2.titleCex', { exchange: exchangeName });

  const setCredentialField = (fieldId, value) => {
    setCredentialValues((prev) => ({ ...prev, [fieldId]: value }));
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
      <div className={`vault-wrap vault-wrap--${viewMode}`}>
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
              onClick={() => goToStep(i + 1)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') goToStep(i + 1);
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
                📋 {credentialGuide}
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
              <div className="wz-title">{step2Title}</div>
              <div className="warning-box">
                <div className="wb-t">⚠ {V('step2.warningTitle')}</div>
                {credentialSchema.permissionMode === 'cex' ? (
                  <>
                    <div className="wb-li">
                      {V('step2.warningWithdrawBefore')}
                      <strong>{V('step2.warningWithdrawStrong')}</strong>
                      {V('step2.warningWithdrawAfter')}
                    </div>
                    <div className="wb-li">{V('step2.warningEncrypt')}</div>
                    <div className="wb-li">
                      {V('step2.warningIp', { exchange: exchangeName })}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="wb-li">{V('step2.agentPermDesc')}</div>
                    <div className="wb-li">{V('step2.warningEncrypt')}</div>
                  </>
                )}
              </div>
              {credentialSchema.fields.map((field) => (
                <div className="form-group" key={field.fieldId}>
                  <div className="form-label">
                    {V(`fields.${field.fieldId}.label`)}{' '}
                    {field.required ? (
                      <span className="tag tag-pos" style={{ fontSize: 9 }}>
                        {V('step2.required')}
                      </span>
                    ) : (
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
                    )}
                  </div>
                  <input
                    className={`form-input${field.mono ? ' np' : ''}`}
                    type={field.inputType}
                    placeholder={V(`fields.${field.fieldId}.placeholder`)}
                    value={credentialValues[field.fieldId] || ''}
                    onChange={(e) => setCredentialField(field.fieldId, e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              ))}
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
              {credentialSchema.permissionMode === 'agent' ? (
                <div className="perm-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="perm-item perm-need">
                    <div className="perm-ico">✅</div>
                    <div>
                      <div className="perm-t">{V('step2.agentPermTitle')}</div>
                      <div className="perm-d">{V('step2.agentPermDesc')}</div>
                    </div>
                  </div>
                </div>
              ) : (
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
              )}
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
                  disabled={creating || validating}
                  onClick={handleCreateCredential}
                >
                  {creating ? V('step2.creating') : V('step2.create')}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <VaultStep3
              done={validationDone}
              validating={validating}
              verifyError={verifyError}
              verifyDetail={verifyDetail}
              exchange={exchangeName}
              checksKey={getVerifyChecksKey(exchangeCode)}
              credentialId={credentialId}
              onBack={reenterKeys}
              onRetry={runVerify}
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

function VaultStep3({
  done,
  validating,
  verifyError,
  verifyDetail,
  exchange,
  checksKey,
  credentialId,
  onBack,
  onRetry,
  onNext,
}) {
  const { t, i18n } = useTranslation();
  const V = (key, opts) => t(`autoArb.vault.${key}`, opts);

  const checks = useMemo(() => {
    const key = checksKey === 'hyperliquid' ? 'step3.checksHyperliquid' : 'step3.checksCex';
    return t(`autoArb.vault.${key}`, { returnObjects: true }) || [];
  }, [t, i18n.language, checksKey]);

  const [activeIdx, setActiveIdx] = useState(0);
  const failed = !!verifyError && !validating && !done;

  useEffect(() => {
    if (done) {
      setActiveIdx(checks.length);
      return undefined;
    }
    if (failed) {
      setActiveIdx(0);
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
  }, [validating, done, failed, checks.length]);

  const items = checks.map((text, i) => {
    if (done || i < activeIdx) {
      return { ico: '✅', text, spinning: false };
    }
    if (failed) {
      return { ico: '⏳', text, spinning: false };
    }
    if (i === activeIdx && validating) {
      return { ico: '🔍', text, spinning: true };
    }
    return { ico: '⏳', text, spinning: false };
  });

  const title = done
    ? `✅ ${V('step3.titleDone')}`
    : failed
      ? `⚠️ ${V('step3.verifyFailed')}`
      : `🔍 ${V('step3.titlePending')}`;

  return (
    <>
      <div className="wz-title">{title}</div>
      <div className="wz-sub">
        {done
          ? V('step3.subDone')
          : failed
            ? verifyError
            : V('step3.subPending', { exchange })}
      </div>
      <div className="validation-anim">
        {items.map((it) => (
          <div className="va-item" key={it.text}>
            <div className={`va-ico${it.spinning ? ' is-spinning' : ''}`}>{it.ico}</div>
            <div
              style={{
                fontSize: 12,
                color: done || it.ico === '✅' ? 'var(--pos)' : failed ? 'var(--t2)' : 'var(--t2)',
              }}
            >
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
            lineHeight: 1.6,
          }}
        >
          ✅{' '}
          <strong style={{ color: 'var(--pos)' }}>{V('step3.passSummary')}</strong>
          {verifyDetail || V('step3.passDetail', { exchange })}
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
        ) : failed ? (
          <>
            <button type="button" className="btn-full btn-ghost" onClick={onBack}>
              {V('step3.reenter')}
            </button>
            <button
              type="button"
              className="btn-full btn-gold"
              disabled={validating}
              onClick={() => onRetry(credentialId)}
            >
              {V('step3.retryVerify')}
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
