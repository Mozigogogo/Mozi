'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchStrategyConfig } from '@/api/strategy';
import { ActivityText, Donut, Gauge, Modal, Sparkline, Tip } from './charts';
import './styles/dashboard.css';

const STRAT_LIST_PAGE_SIZE = 5;

function normalizeWheelDelta(e, fallbackLineHeight = 16) {
  let delta = e.deltaY;
  if (!delta) return 0;
  if (e.deltaMode === 1) delta *= fallbackLineHeight;
  else if (e.deltaMode === 2) delta *= window.innerHeight;
  return delta;
}

function scrollPageBy(delta) {
  const root = document.scrollingElement || document.documentElement;
  if (root && root.scrollHeight > root.clientHeight + 1) {
    root.scrollTop += delta;
    return;
  }
  window.scrollBy(0, delta);
}

/**
 * 内层滚到顶/底后，继续滚轮带动页面外层滚动。
 * 用 capture + preventDefault，避免浏览器把滚轮吞在 overflow 容器里。
 */
function attachScrollChain(el) {
  if (!el) return () => {};

  const onWheel = (e) => {
    // 横向为主时不拦截
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    const delta = normalizeWheelDelta(e);
    if (!delta) return;

    const maxScroll = el.scrollHeight - el.clientHeight;
    // 内层本身无需滚动：直接交给页面
    if (maxScroll <= 1) {
      e.preventDefault();
      scrollPageBy(delta);
      return;
    }

    const eps = 2;
    const atTop = el.scrollTop <= eps;
    const atBottom = el.scrollTop >= maxScroll - eps;

    if ((delta > 0 && atBottom) || (delta < 0 && atTop)) {
      e.preventDefault();
      scrollPageBy(delta);
    }
  };

  el.addEventListener('wheel', onWheel, { passive: false, capture: true });
  return () => el.removeEventListener('wheel', onWheel, { capture: true });
}

function useScrollChainRef() {
  const nodeRef = useRef(null);
  const cleanupRef = useRef(null);

  const setRef = useCallback((node) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    nodeRef.current = node;
    if (node) cleanupRef.current = attachScrollChain(node);
  }, []);

  useEffect(
    () => () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    },
    [],
  );

  return [nodeRef, setRef];
}

const LEG_ROLE_KEYS = {
  spot_long: 'spotLong',
  perp_short: 'perpShort',
  long: 'long',
  short: 'short',
};

function formatMsTime(ms, language) {
  if (ms == null || !Number.isFinite(Number(ms))) return '--';
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return '--';
  const isZh = String(language || '').toLowerCase().startsWith('zh');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return isZh ? `${mm}-${dd} ${hh}:${mi}` : `${mm}/${dd} ${hh}:${mi}`;
}

function formatRelativeMs(ms, t) {
  if (ms == null || !Number.isFinite(Number(ms))) return '';
  const diff = Date.now() - Number(ms);
  if (diff < 60_000) return t('autoArb.dashboard.activity.justNow', { defaultValue: '刚刚' });
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function daysSinceMs(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return 1;
  return Math.max(1, Math.round((Date.now() - Number(ms)) / 86400000));
}

function riskLevelLabel(level, D) {
  const key = String(level || 'low').toLowerCase();
  if (key === 'high') return D('stats.riskHigh', { defaultValue: '高' });
  if (key === 'medium') return D('stats.riskMedium', { defaultValue: '中' });
  return D('stats.riskLow');
}

function riskStatusTag(status, D) {
  const key = String(status || 'healthy').toLowerCase();
  if (key === 'danger') return D('riskPanel.danger', { defaultValue: '危险' });
  if (key === 'warning') return D('riskPanel.warning', { defaultValue: '警告' });
  return D('riskPanel.healthy');
}

/**
 * @param {{
 *   center: object;
 *   onNavigate: (view: string) => void;
 *   onToast: (msg: string) => void;
 *   onEmergencyConfirm: () => void;
 *   onStartWizard?: (source: object) => void;
 * }} props
 */
export default function Dashboard({
  center,
  onNavigate,
  onToast,
  onEmergencyConfirm,
  onStartWizard,
}) {
  const { t, i18n } = useTranslation();
  const D = (key, opts) => t(`autoArb.dashboard.${key}`, opts);

  const {
    loading,
    bootError,
    overview,
    strategies,
    riskSettings,
    radar,
    capital,
    activities,
    detail,
    openDetail,
    closeDetail,
    pause,
    resume,
    stop,
    patchParams,
    saveRisk,
  } = center || {};

  const [editId, setEditId] = useState(null);
  const [editConfig, setEditConfig] = useState(null);
  const [editMinProfit, setEditMinProfit] = useState(0.1);
  const [editLoss, setEditLoss] = useState(5);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingRisk, setSavingRisk] = useState(false);
  const editFetchRef = useRef(0);
  const stratColRef = useRef(null);
  const rightPanelRef = useRef(null);
  const [stratListRef, setStratListRef] = useScrollChainRef();
  const [, setRadarFeedRef] = useScrollChainRef();
  const [, setActivityFeedRef] = useScrollChainRef();
  const [stratVisibleCount, setStratVisibleCount] = useState(STRAT_LIST_PAGE_SIZE);

  const strategyIdsKey = useMemo(
    () => (strategies || []).map((s) => s.id).join('|'),
    [strategies],
  );

  // 左侧策略列高度与右侧面板（含实时操作日志）底对齐
  useEffect(() => {
    const left = stratColRef.current;
    const right = rightPanelRef.current;
    if (!left || !right || typeof ResizeObserver === 'undefined') return undefined;

    const syncHeight = () => {
      const h = Math.ceil(right.getBoundingClientRect().height);
      if (h > 0) {
        left.style.height = `${h}px`;
        left.style.maxHeight = `${h}px`;
      }
    };

    syncHeight();
    const ro = new ResizeObserver(() => {
      syncHeight();
    });
    ro.observe(right);
    window.addEventListener('resize', syncHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, [loading, strategies, radar, capital, activities, riskSettings]);

  useEffect(() => {
    setStratVisibleCount(STRAT_LIST_PAGE_SIZE);
    if (stratListRef.current) stratListRef.current.scrollTop = 0;
  }, [strategyIdsKey, stratListRef]);

  const visibleStrategies = useMemo(
    () => (strategies || []).slice(0, stratVisibleCount),
    [strategies, stratVisibleCount],
  );
  const stratHasMore = stratVisibleCount < (strategies || []).length;

  const loadMoreStrategies = useCallback(() => {
    if (!stratHasMore) return;
    setStratVisibleCount((n) =>
      Math.min(n + STRAT_LIST_PAGE_SIZE, (strategies || []).length),
    );
  }, [stratHasMore, strategies]);

  const onStratListScroll = useCallback(() => {
    const el = stratListRef.current;
    if (!el || !stratHasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 56) {
      loadMoreStrategies();
    }
  }, [stratHasMore, loadMoreStrategies]);

  // 右侧很高、首屏装不满时继续灌入，直到出现滚动条或没有更多
  useEffect(() => {
    const el = stratListRef.current;
    if (!el || !stratHasMore) return undefined;
    const id = window.requestAnimationFrame(() => {
      if (el.scrollHeight <= el.clientHeight + 8) {
        loadMoreStrategies();
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [stratVisibleCount, stratHasMore, loadMoreStrategies, strategyIdsKey]);

  useEffect(() => {
    if (bootError) onToast?.(bootError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootError]);

  const editStratFromList = strategies?.find((s) => s.id === editId);
  const editStrat = editConfig
    ? {
        ...(editStratFromList || {}),
        ...editConfig,
        minProfitThreshold: editConfig.minProfit,
      }
    : editStratFromList;
  const editEditable = editConfig?.editable || {
    leverage: editStrat?.status !== 'running',
    marginMode: editStrat?.status !== 'running',
    minProfit: true,
    dailyLossLimit: true,
  };
  const detailStrat = detail;

  const closeEdit = () => {
    editFetchRef.current += 1;
    setEditId(null);
    setEditConfig(null);
    setLoadingEdit(false);
  };

  const running = overview?.runningCount ?? strategies?.filter((s) => s.status === 'running').length ?? 0;
  const totalCapital = overview?.totalCapital ?? 0;
  const totalPnl = overview?.totalPnl ?? 0;
  const totalDailyPnl = overview?.todayPnl ?? 0;
  const totalReturnPct = overview?.totalReturnPct ?? 0;
  const riskScore = overview?.riskScore ?? 0;
  const execSuccessRate = overview?.execSuccessRate ?? 0;

  const radarItems = useMemo(() => {
    if (Array.isArray(radar) && radar.length) return radar;
    // 无雷达接口数据时用列表阈值兜底
    return (strategies || [])
      .filter((s) => s.status !== 'stopped')
      .map((s) => ({
        id: s.id,
        strategyId: s.id,
        name: String(s.name || '').split(' ')[0] || s.id,
        curRate: 0,
        threshold: s.minProfitThreshold || 0.1,
        pctToThreshold: 0,
        armed: false,
        status: s.status,
      }));
  }, [radar, strategies]);

  const donutSegments = useMemo(() => {
    const segs = capital?.segments || [];
    if (!segs.length) {
      return [{ v: 1, c: '#CBD5E1', key: 'idle', label: '$0' }];
    }
    return segs.map((s) => ({
      v: s.v || s.value || 0,
      c: s.c,
      key: s.key,
      label: s.displayLabel || s.label,
    }));
  }, [capital]);

  const centerValue = useMemo(() => {
    const total = capital?.totalPosition || 0;
    if (total >= 1000) return `$${(total / 1000).toFixed(total % 1000 === 0 ? 0 : 1)}K`;
    return `$${Number(total).toLocaleString()}`;
  }, [capital]);

  const stresses = useMemo(() => {
    const key = detailStrat?.typeKey || 'funding';
    return t(`autoArb.dashboard.stress.${key}`, { returnObjects: true }) || [];
  }, [detailStrat?.typeKey, t, i18n.language]);

  const strategyTypeLabel = (typeKey) => D(`strategyTypes.${typeKey || 'funding'}`);

  const legRoleLabel = (role) => {
    const k = LEG_ROLE_KEYS[role];
    if (k) return D(`detail.legRoles.${k}`, { defaultValue: role });
    return role || '--';
  };

  const pauseStrat = async (id) => {
    try {
      await pause(id);
      onToast(`⏸ ${D('toast.paused')}`);
    } catch (err) {
      onToast(err?.message || D('toast.paused'));
    }
  };

  const resumeStrat = async (id) => {
    try {
      await resume(id);
      onToast(`▶ ${D('toast.resumed')}`);
    } catch (err) {
      onToast(err?.message || D('toast.resumed'));
    }
  };

  const stopStrat = async (id) => {
    try {
      await stop(id);
      onToast(D('toast.closeSent'));
    } catch (err) {
      onToast(err?.message || D('toast.closeSent'));
    }
  };

  const openEdit = async (s) => {
    const id = String(s?.id || '').trim();
    if (!id) return;
    const reqId = ++editFetchRef.current;
    setEditId(id);
    setEditConfig(null);
    setEditMinProfit(s.minProfitThreshold ?? 0.1);
    setEditLoss(s.dailyLossLimit ?? 5);
    setLoadingEdit(true);
    try {
      const config = await fetchStrategyConfig(id);
      if (editFetchRef.current !== reqId) return;
      setEditConfig(config);
      setEditMinProfit(config.minProfit);
      setEditLoss(config.dailyLossLimit);
    } catch (err) {
      if (editFetchRef.current !== reqId) return;
      onToast(err?.message || D('toast.loadConfigFailed', { defaultValue: '加载策略配置失败' }));
    } finally {
      if (editFetchRef.current === reqId) setLoadingEdit(false);
    }
  };

  const saveEdit = async () => {
    if (!editId || savingEdit || loadingEdit) return;
    const payload = {};
    if (editEditable.minProfit) payload.minProfit = editMinProfit;
    if (editEditable.dailyLossLimit) payload.dailyLossLimit = editLoss;
    if (!Object.keys(payload).length) {
      closeEdit();
      return;
    }
    setSavingEdit(true);
    try {
      await patchParams(editId, payload);
      closeEdit();
      onToast(`✅ ${D('toast.paramsUpdated')}`);
    } catch (err) {
      onToast(err?.message || D('toast.paramsUpdated'));
    } finally {
      setSavingEdit(false);
    }
  };

  const cloneStrat = (s) => {
    onStartWizard?.(s);
    onToast(D('toast.cloneConfig', { name: s.name }));
  };

  const handleOpenDetail = async (id) => {
    try {
      await openDetail(id);
    } catch (err) {
      onToast(err?.message || 'Failed to load detail');
    }
  };

  const handleCloseDetail = () => {
    closeDetail?.();
  };

  const patchRiskToggle = async (key, value) => {
    if (savingRisk) return;
    setSavingRisk(true);
    const prev = riskSettings?.[key];
    try {
      await saveRisk({ [key]: value });
    } catch (err) {
      onToast(err?.message || 'Failed to save risk settings');
      // saveRisk 失败时 hook 未改成功则无需回滚；若乐观更新可在此处理
      void prev;
    } finally {
      setSavingRisk(false);
    }
  };

  const fundUsage = (riskSettings?.fundUsagePct || 0) / 100;
  const maxRiskPct = (riskSettings?.maxRiskStrategyPct || 0) / 100;
  const overallRiskPct = (riskSettings?.overallRiskPct || 0) / 100;

  return (
    <div className="view">
      <div className="emergency-bar">
        <div className="eb-text">
          ⚡{' '}
          <strong>{D('emergencyBar.runningCount', { count: running })}</strong> ·{' '}
          {D('emergencyBar.totalPosition')} ${Number(totalCapital).toLocaleString()} ·{' '}
          {D('emergencyBar.todayPnl')}{' '}
          <strong
            style={{
              color: totalDailyPnl >= 0 ? 'var(--pos)' : 'var(--danger)',
            }}
          >
            {totalDailyPnl >= 0 ? '+' : ''}${Number(totalDailyPnl).toFixed(2)}
          </strong>
          {loading ? (
            <span style={{ marginLeft: 8, color: 'var(--t3)', fontSize: 11 }}>…</span>
          ) : null}
        </div>
        <button type="button" className="stop-btn" onClick={onEmergencyConfirm}>
          🛑 {D('emergencyBar.stopAll')}
        </button>
      </div>

      <div className="dash-stats">
        <div className="ds-card">
          <div className="ds-lbl">💼 {D('stats.totalCapital')}</div>
          <div className="ds-val" style={{ color: 'var(--t1)' }}>
            ${Number(totalCapital).toLocaleString()}
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
            {totalPnl >= 0 ? '+' : ''}${Number(totalPnl).toFixed(2)}
          </div>
          <div className="ds-sub">
            {D('stats.totalReturn', {
              pct: Number(totalReturnPct).toFixed(2),
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
            {totalDailyPnl >= 0 ? '+' : ''}${Number(totalDailyPnl).toFixed(2)}
          </div>
          <div className="ds-sub">{D('stats.lastUpdated')}</div>
        </div>
        <div className="ds-card">
          <div className="ds-lbl">🛡️ {D('stats.overallRisk')}</div>
          <div className="ds-val" style={{ color: 'var(--pos)' }}>
            {riskLevelLabel(overview?.riskLevel, D)}
          </div>
          <div className="ds-sub">{D('stats.riskScore', { score: riskScore })}</div>
        </div>
        <div className="ds-card">
          <div className="ds-lbl">⚡ {D('stats.execSuccess')}</div>
          <div className="ds-val" style={{ color: 'var(--pos)' }}>
            {Number(execSuccessRate).toFixed(1)}%
          </div>
          <div className="ds-sub">
            {D('stats.execSuccessSub', {
              ok: overview?.execOk ?? 0,
              total: overview?.execTotal ?? 0,
            })}
          </div>
        </div>
      </div>

      <div className="dash-layout">
        <div className="strat-col" ref={stratColRef}>
          <div className="strat-col-hdr">
            <div className="strat-col-title">{D('strategyList.title')}</div>
            <button
              type="button"
              className="strat-col-new"
              onClick={() => onNavigate('wizard')}
            >
              {D('strategyList.newStrategy')}
            </button>
          </div>
          <div
            className="strat-list"
            ref={setStratListRef}
            onScroll={onStratListScroll}
          >
            {!loading && (!strategies || strategies.length === 0) ? (
              <div style={{ fontSize: 13, color: 'var(--t3)', padding: '24px 8px' }}>
                {D('strategyList.empty')}
              </div>
            ) : null}
            {visibleStrategies.map((s) => (
              <StratCard
                key={s.id}
                s={s}
                typeLabel={strategyTypeLabel(s.typeKey)}
                t={t}
                onPause={() => pauseStrat(s.id)}
                onResume={() => resumeStrat(s.id)}
                onConfig={() => openEdit(s)}
                onDetail={() => handleOpenDetail(s.id)}
                onClone={() => cloneStrat(s)}
                onStop={() => stopStrat(s.id)}
              />
            ))}
            {(strategies || []).length > 0 ? (
              <div className="strat-list-footer">
                {stratHasMore
                  ? D('strategyList.loadingMore')
                  : D('strategyList.noMore')}
              </div>
            ) : null}
          </div>
        </div>

        <div className="right-panel" ref={rightPanelRef}>
          <div className="risk-panel">
            <div className="rp-title">
              {D('riskPanel.title')}
              <span className="tag tag-pos" style={{ fontSize: 9 }}>
                {riskStatusTag(riskSettings?.status, D)}
              </span>
            </div>
            <div className="gauges-row">
              <Gauge pct={fundUsage} color="#10B981" label={D('riskPanel.fundUsage')} />
              <Gauge pct={maxRiskPct} color="#F59E0B" label={D('riskPanel.maxRiskStrategy')} />
              <Gauge pct={overallRiskPct} color="#10B981" label={D('riskPanel.overallRisk')} />
            </div>
            <div className="risk-settings">
              <div className="rs-row">
                <div className="rs-label">{D('riskPanel.dailyLossLimit')}</div>
                <div className="rs-val">
                  ${Number(riskSettings?.dailyLossLimitUsd ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="rs-row">
                <div className="rs-label">{D('riskPanel.maxMarginUse')}</div>
                <div className="rs-val">{Number(riskSettings?.maxMarginUsePct ?? 0)}%</div>
              </div>
              <div className="rs-row">
                <div className="rs-label">{D('riskPanel.maxSlippage')}</div>
                <div className="rs-val">{Number(riskSettings?.maxSlippagePct ?? 0)}%</div>
              </div>
              <ToggleRow
                label={D('riskPanel.autoEmergencyStop')}
                checked={!!riskSettings?.autoEmergencyStop}
                onChange={(v) => patchRiskToggle('autoEmergencyStop', v)}
              />
              <ToggleRow
                label={D('riskPanel.negFundingPause')}
                checked={!!riskSettings?.negFundingPause}
                onChange={(v) => patchRiskToggle('negFundingPause', v)}
              />
              <ToggleRow
                label={D('riskPanel.timeoutAlert')}
                checked={!!riskSettings?.timeoutAlert}
                onChange={(v) => patchRiskToggle('timeoutAlert', v)}
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
              <div className="radar-feed" ref={setRadarFeedRef}>
                {radarItems.map((l) => {
                const paused = l.status === 'paused';
                const barColor = paused
                  ? 'var(--t4)'
                  : l.armed
                    ? 'var(--pos)'
                    : 'var(--gold)';
                return (
                  <div className="radar-item" key={l.id || l.strategyId}>
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
                        {Number(l.curRate).toFixed(2)}%{' '}
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
                          width: `${l.pctToThreshold || 0}%`,
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
              })}
              </div>
            )}
          </div>

          <div className="capital-panel">
            <div className="rp-title" style={{ marginBottom: 12 }}>
              {D('capital.title')}
            </div>
            <div className="donut-wrap">
              <Donut
                segments={donutSegments}
                centerLabel={D('capital.totalPosition')}
                centerValue={centerValue}
              />
              <div className="donut-legend">
                {donutSegments.map((l) => (
                  <div className="dl-item" key={l.key}>
                    <div className="dl-dot" style={{ background: l.c }} />
                    <div className="dl-name">
                      {D(`donut.${l.key}`, { defaultValue: l.key })}
                    </div>
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
            <div className="activity-feed" ref={setActivityFeedRef}>
              {(activities || []).length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--t3)', padding: 8 }}>
                  {D('activity.empty', { defaultValue: '暂无活动' })}
                </div>
              ) : null}
              {(activities || []).map((a) => (
                <div className="af-item" key={a.id}>
                  <div className="af-ico">{a.ico}</div>
                  <ActivityText
                    parts={
                      a.parts?.length
                        ? a.parts
                        : [{ t: 'text', v: a.text || '' }]
                    }
                  />
                  <div className="af-time">
                    {formatRelativeMs(a.createdAt, t) ||
                      formatMsTime(a.createdAt, i18n.language)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={!!detailStrat}
        wide
        onClose={handleCloseDetail}
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
                  days: detailStrat ? daysSinceMs(detailStrat.startDate) : 0,
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
                handleCloseDetail();
              }}
            >
              ⚙ {D('detail.adjustParams')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={handleCloseDetail}
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
                  `${detailStrat.pnl >= 0 ? '+' : ''}$${Number(detailStrat.pnl).toFixed(2)}`,
                  detailStrat.pnl >= 0 ? 'var(--pos)' : 'var(--danger)',
                ],
                [
                  D('detail.returnPct'),
                  `${detailStrat.pnlPct >= 0 ? '+' : ''}${Number(detailStrat.pnlPct).toFixed(2)}%`,
                  detailStrat.pnl >= 0 ? 'var(--pos)' : 'var(--danger)',
                ],
                [
                  D('detail.marginRatio'),
                  `${Number(detailStrat.marginRatio ?? 0)}%`,
                  (detailStrat.marginRatio ?? 0) >= 50 ? 'var(--pos)' : 'var(--warn)',
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
            <Sparkline
              data={detailStrat.pnlHistory?.length ? detailStrat.pnlHistory : [0]}
              w={640}
              h={72}
              color="#059669"
            />
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
                        {legRoleLabel(leg.role)}
                      </span>
                    </td>
                    <td>{leg.symbol}</td>
                    <td className="mono">${Number(leg.entry).toFixed(2)}</td>
                    <td className="mono">${Number(leg.current).toFixed(2)}</td>
                    <td className="mono">{leg.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="detail-section-title">{D('detail.execHistory')}</div>
            <div className="exec-timeline">
              {(detailStrat.execHistory || []).map((row, idx) => (
                <div className="exec-tl-item" key={`${row.time}-${idx}`}>
                  <div className="exec-tl-time">
                    {formatMsTime(row.time, i18n.language)}
                  </div>
                  <div>{row.text}</div>
                </div>
              ))}
            </div>
            <div className="detail-section-title">{D('detail.stressTitle')}</div>
            <div className="stress-grid">
              {(Array.isArray(stresses) ? stresses : []).map((st) => (
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
        open={!!editId}
        onClose={closeEdit}
        header={
          <>
            <div className="modal-hdr-ico" style={{ background: 'var(--gold-dim)' }}>
              ⚙
            </div>
            <div>
              <div className="modal-title">{D('edit.title')}</div>
              <div className="modal-sub">
                {D('edit.sub', {
                  name: editStrat?.name || editStratFromList?.name || editId,
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
              onClick={closeEdit}
            >
              {D('edit.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{
                flex: 1,
                opacity: savingEdit || loadingEdit ? 0.7 : 1,
              }}
              onClick={saveEdit}
              disabled={
                savingEdit ||
                loadingEdit ||
                (!editEditable.minProfit && !editEditable.dailyLossLimit)
              }
            >
              {D('edit.save')}
            </button>
          </>
        }
      >
        {editId ? (
          <>
            <div className="field-locked" style={{ marginBottom: 14 }}>
              <div className="rs-row">
                <div className="rs-label">
                  {D('edit.leverage')}{' '}
                  {!editEditable.leverage ? (
                    <span className="locked-badge">
                      {D('edit.lockedWhileRunning')}
                    </span>
                  ) : null}
                </div>
                <div className="rs-val">
                  {editStrat?.leverage != null ? `${editStrat.leverage}x` : '--'}
                </div>
              </div>
              <div className="rs-row">
                <div className="rs-label">
                  {D('edit.marginMode')}{' '}
                  {!editEditable.marginMode ? (
                    <span className="locked-badge">
                      {D('edit.lockedWhileRunning')}
                    </span>
                  ) : null}
                </div>
                <div className="rs-val">
                  {editStrat?.marginMode === 'isolated'
                    ? D('detail.isolated')
                    : editStrat?.marginMode === 'cross'
                      ? D('detail.cross')
                      : '--'}
                </div>
              </div>
            </div>
            <div className="range-row">
              <div className="range-header">
                <div className="range-lbl">
                  {D('edit.minProfitThreshold')} <Tip tipKey="slippage" />
                  {!editEditable.minProfit ? (
                    <span className="locked-badge" style={{ marginLeft: 6 }}>
                      {D('edit.lockedWhileRunning')}
                    </span>
                  ) : null}
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
                disabled={!editEditable.minProfit || loadingEdit}
                onChange={(e) =>
                  setEditMinProfit(parseFloat(parseFloat(e.target.value).toFixed(2)))
                }
              />
            </div>
            <div className="range-row">
              <div className="range-header">
                <div className="range-lbl">
                  {D('edit.dailyLossLimit')}
                  {!editEditable.dailyLossLimit ? (
                    <span className="locked-badge" style={{ marginLeft: 6 }}>
                      {D('edit.lockedWhileRunning')}
                    </span>
                  ) : null}
                </div>
                <div className="range-val">{editLoss}%</div>
              </div>
              <input
                className="range-input"
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={editLoss}
                disabled={!editEditable.dailyLossLimit || loadingEdit}
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

  const maxCap = s.maxCapital || s.capital || 1;
  const barPct = Math.min(100, ((s.posSize || 0) / maxCap) * 100);

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
          <div className="scm-v">${Number(s.capital || 0).toLocaleString()}</div>
        </div>
        <div className="scm">
          <div className="scm-l">{D('metrics.cumulativePnl')}</div>
          <div className="scm-v" style={{ color: profitColor }}>
            {isUp ? '+' : ''}${Number(s.pnl || 0).toFixed(2)}
          </div>
        </div>
        <div className="scm">
          <div className="scm-l">{D('metrics.returnPct')}</div>
          <div className="scm-v" style={{ color: profitColor }}>
            {isUp ? '+' : ''}
            {Number(s.pnlPct || 0).toFixed(2)}%
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
            width: `${barPct.toFixed(0)}%`,
            background: s.status === 'running' ? 'var(--pos)' : 'var(--warn)',
          }}
        />
      </div>
      <div className="sc-actions">
        {s.status === 'running' ? (
          <button type="button" className="sc-btn" onClick={onPause}>
            ⏸ {D('actions.pause')}
          </button>
        ) : s.status !== 'stopped' ? (
          <button type="button" className="sc-btn primary" onClick={onResume}>
            ▶ {D('actions.resume')}
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
