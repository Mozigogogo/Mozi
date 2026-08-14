'use client';

import { useState, useCallback, useEffect, useRef, Children } from 'react';
import { HolderOutlined, LeftOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/Skeleton';
import styles from './index.module.less';

const ICON_FAVORITE_ACTIVE = '/icons/new_detail/like_actived.svg';
const ICON_FAVORITE_INACTIVE = '/icons/new_detail/like_no_actived.svg';

const LEFT_PANE_DEFAULT = 260;
const RIGHT_PANE_DEFAULT = 300;
const LEFT_PANE_MIN = 260;
const LEFT_PANE_MAX = 340;
const RIGHT_PANE_MIN = 240;
const RIGHT_PANE_MAX = 460;
const CENTER_PANE_MIN = 360;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * PC 端币种详情页布局壳：顶栏（返回 + 标题行情 + 操作）、主卡片（左 ROI+市场 / 中 K 线 / 右大单侦测）、可选弹幕条。
 * children[0] = 图表，children[1+] = 右侧订单簿等；sideLeft = 图表左侧栏（投资回报率、市场等）。
 */
export default function PCCoinDetail({
  headerTitle,
  onBack,
  showBack = true,
  coinIcon,
  symbol,
  currentPrice,
  priceChangeAbs,
  priceChangePercent,
  isUp = true,
  isFavorite = false,
  onToggleFavorite,
  onAlert,
  onGoTrade,
  onShare,
  onTradingRadar,
  /** 行情统计项；可传二维列 [[...],[...]] 或扁平 [{ label, value }]，组件会展平为 OKX 式横向指标 */
  statColumns = [],
  loading = false,
  children,
  /** 图表左侧栏内容（如投资回报率） */
  sideLeft = null,
  showBarrage = true,
  /** 是否显示 K 线弹幕（可受控） */
  barrageVisible: barrageVisibleControlled,
  defaultBarrageVisible = true,
  onBarrageVisibleChange,
  barrageValue: barrageValueControlled,
  defaultBarrageValue = '',
  onBarrageChange,
  onBarrageSend,
  className,
}) {
  const { t } = useTranslation();
  const [barrageInner, setBarrageInner] = useState(defaultBarrageValue);
  const barrageValue =
    barrageValueControlled !== undefined ? barrageValueControlled : barrageInner;
  const [barrageVisibleInner, setBarrageVisibleInner] = useState(defaultBarrageVisible);
  const barrageVisible =
    barrageVisibleControlled !== undefined
      ? barrageVisibleControlled
      : barrageVisibleInner;

  const chartOrderRowRef = useRef(null);
  const [paneWidths, setPaneWidths] = useState({
    left: LEFT_PANE_DEFAULT,
    right: RIGHT_PANE_DEFAULT,
  });
  const [draggingPane, setDraggingPane] = useState(null); // 'left' | 'right' | null
  const dragRef = useRef(null);

  // 清理历史持久化宽度，拖动仅会话内生效
  useEffect(() => {
    try {
      localStorage.removeItem('mozi_pc_coin_detail_pane_widths_v1');
    } catch (_) {}
  }, []);

  // 防止会话内已拖到过窄宽度，低于新的最小值时自动回弹
  useEffect(() => {
    setPaneWidths((prev) => {
      const left = clamp(prev.left, LEFT_PANE_MIN, LEFT_PANE_MAX);
      const right = clamp(prev.right, RIGHT_PANE_MIN, RIGHT_PANE_MAX);
      if (left === prev.left && right === prev.right) return prev;
      return { ...prev, left, right };
    });
  }, []);

  const setBarrage = useCallback(
    (v) => {
      if (onBarrageChange) onBarrageChange(v);
      if (barrageValueControlled === undefined) setBarrageInner(v);
    },
    [onBarrageChange, barrageValueControlled]
  );

  const setBarrageVisible = useCallback(
    (next) => {
      if (onBarrageVisibleChange) onBarrageVisibleChange(next);
      if (barrageVisibleControlled === undefined) setBarrageVisibleInner(next);
    },
    [onBarrageVisibleChange, barrageVisibleControlled]
  );

  const handleSend = useCallback(async () => {
    const text = (barrageValue || '').trim();
    if (!text || !onBarrageSend) return;
    try {
      await Promise.resolve(onBarrageSend(text));
      if (barrageValueControlled === undefined) setBarrageInner('');
    } catch {
      /* 失败时保留输入，由调用方提示 */
    }
  }, [barrageValue, onBarrageSend, barrageValueControlled]);

  const startPaneDrag = useCallback(
    (which, event) => {
      if (event.button != null && event.button !== 0) return;
      event.preventDefault();
      const row = chartOrderRowRef.current;
      const rowWidth = row?.getBoundingClientRect?.()?.width || 0;
      dragRef.current = {
        which,
        startX: event.clientX,
        startLeft: paneWidths.left,
        startRight: paneWidths.right,
        rowWidth,
      };
      setDraggingPane(which);
    },
    [paneWidths.left, paneWidths.right]
  );

  useEffect(() => {
    if (!draggingPane) return undefined;

    const onMove = (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const rowWidth = drag.rowWidth || chartOrderRowRef.current?.getBoundingClientRect?.()?.width || 0;
      const maxLeft = Math.min(
        LEFT_PANE_MAX,
        Math.max(LEFT_PANE_MIN, rowWidth - drag.startRight - CENTER_PANE_MIN)
      );
      const maxRight = Math.min(
        RIGHT_PANE_MAX,
        Math.max(RIGHT_PANE_MIN, rowWidth - drag.startLeft - CENTER_PANE_MIN)
      );

      setPaneWidths((prev) => {
        if (drag.which === 'left') {
          const left = clamp(drag.startLeft + dx, LEFT_PANE_MIN, maxLeft);
          return { ...prev, left };
        }
        // 右分隔条：向右拖缩小右侧栏，向左拖放大右侧栏
        const right = clamp(drag.startRight - dx, RIGHT_PANE_MIN, maxRight);
        return { ...prev, right };
      });
    };

    const onUp = () => {
      dragRef.current = null;
      setDraggingPane(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [draggingPane]);

  const changeCls = isUp ? styles.changeUp : styles.changeDown;

  const childrenArr = Children.toArray(children);
  const topChild = childrenArr[0];
  const restChildren = childrenArr.slice(1);
  const showRightPane = restChildren.length > 0;
  const showLeftPane = Boolean(sideLeft);

  const flatStats = (statColumns || [])
    .flatMap((col) => (Array.isArray(col) ? col : [col]))
    .filter((cell) => cell && (cell.label || cell.value != null));

  const leftPaneStyle = showLeftPane
    ? {
        flex: `0 0 ${paneWidths.left}px`,
        width: `${paneWidths.left}px`,
        maxWidth: `${LEFT_PANE_MAX}px`,
        minWidth: `${LEFT_PANE_MIN}px`,
      }
    : undefined;
  const rightPaneStyle = showRightPane
    ? {
        flex: `0 0 ${paneWidths.right}px`,
        width: `${paneWidths.right}px`,
        maxWidth: `${RIGHT_PANE_MAX}px`,
        minWidth: `${RIGHT_PANE_MIN}px`,
      }
    : undefined;

  const barrageBarEl =
    showBarrage ? (
      <div className={styles.barrageRow}>
        <button
          type="button"
          className={`${styles.barrageToggle} ${
            barrageVisible ? styles.barrageToggleOn : styles.barrageToggleOff
          }`}
          onClick={() => setBarrageVisible(!barrageVisible)}
          aria-pressed={barrageVisible}
          title={
            barrageVisible
              ? t('pcCoinDetail.barrageOn')
              : t('pcCoinDetail.barrageOff')
          }
        >
          <svg
            className={styles.barrageToggleIcon}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <rect
              x="2.5"
              y="5"
              width="15"
              height="11.5"
              rx="1.6"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <text
              x="10"
              y="13.6"
              textAnchor="middle"
              fill="currentColor"
              fontSize="8"
              fontWeight="700"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              弹
            </text>
            {!barrageVisible ? (
              <g>
                <circle
                  cx="17.5"
                  cy="16.5"
                  r="5.2"
                  fill="#fff"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M14.2 19.8L20.8 13.2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>
            ) : null}
          </svg>
        </button>
        <div className={styles.barrageBar}>
          <input
            type="text"
            className={styles.barrageInput}
            placeholder={t('pcCoinDetail.barragePlaceholder')}
            value={barrageValue}
            onChange={(e) => setBarrage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
          />
          <button
            type="button"
            className={styles.barrageSend}
            onClick={handleSend}
            disabled={!onBarrageSend || !(barrageValue || '').trim()}
          >
            {t('pcCoinDetail.send')}
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div
      className={`${styles.root} ${sideLeft ? styles.rootWithSideLeft : ''} ${draggingPane ? styles.rootDragging : ''} ${className || ''}`}
      style={
        showLeftPane
          ? { ['--pc-side-left-width']: `${paneWidths.left}px` }
          : undefined
      }
    >
      <header className={styles.topBar}>
        <div className={sideLeft ? styles.topBarLead : styles.topBarLeadFlat}>
          <div className={styles.topBarLeft}>
            {showBack ? (
              <button
                type="button"
                className={styles.backBtn}
                onClick={onBack}
                aria-label={t('countryPicker.back')}
              >
                <LeftOutlined />
              </button>
            ) : null}
            {coinIcon ? (
              <img src={coinIcon} alt={symbol || ''} className={styles.coinIcon} />
            ) : loading ? (
              <Skeleton config={{ type: 'circle', size: 28 }} />
            ) : (
              <div className={styles.coinIcon} />
            )}
            <div className={styles.titleBlock}>
              <span className={styles.headerTitle}>{headerTitle || symbol || '—'}</span>
              {symbol && headerTitle && symbol !== headerTitle ? (
                <span className={styles.coinSymbol}>{symbol}</span>
              ) : null}
            </div>
          </div>

          {loading && !currentPrice ? (
            <div className={styles.overviewSkeletonPrice}>
              <Skeleton config={{ type: 'element', width: 96, height: 24, borderRadius: 4 }} />
              <Skeleton config={{ type: 'element', width: 88, height: 12, borderRadius: 4 }} />
            </div>
          ) : (
            <div className={styles.priceBlock}>
              <div className={`${styles.priceMain} ${changeCls}`}>{currentPrice ?? '—'}</div>
              <div className={`${styles.changeRow} ${changeCls}`}>
                <span className={styles.changeArrow}>{isUp ? '▲' : '▼'}</span>
                {priceChangeAbs != null && priceChangeAbs !== '' ? (
                  <span>{priceChangeAbs}</span>
                ) : null}
                {priceChangePercent != null && priceChangePercent !== '' ? (
                  <span>{priceChangePercent}</span>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className={styles.topBarMain}>
          {loading && !currentPrice ? (
            <div className={styles.overviewSkeletonStats}>
              {Array.from({ length: 5 }).map((_, colIndex) => (
                <div key={colIndex} className={styles.overviewSkeletonStatGroup}>
                  <div className={styles.overviewSkeletonStatCol}>
                    <Skeleton config={{ type: 'element', width: 48, height: 10, borderRadius: 4 }} />
                    <Skeleton config={{ type: 'element', width: 64, height: 12, borderRadius: 4, style: { marginTop: 4 } }} />
                  </div>
                </div>
              ))}
            </div>
          ) : flatStats.length > 0 ? (
            <div className={styles.statRow}>
              {flatStats.map((cell, i) => (
                <div key={i} className={styles.statItem}>
                  <span className={styles.statLabel}>{cell.label}</span>
                  <span className={styles.statValue}>{cell.value ?? '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.statRow} />
          )}

          <div className={styles.actions}>
            {onToggleFavorite ? (
              <Tooltip title={t('detail.actions.favorite')} placement="bottom">
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnIconOnly}`}
                  onClick={onToggleFavorite}
                  aria-label={t('detail.actions.favorite')}
                >
                  <img src={isFavorite ? ICON_FAVORITE_ACTIVE : ICON_FAVORITE_INACTIVE} alt="" />
                </button>
              </Tooltip>
            ) : null}
            {onShare ? (
              <Tooltip title={t('detail.actions.share')} placement="bottom">
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnIconOnly}`}
                  onClick={onShare}
                  aria-label={t('detail.actions.share')}
                >
                  <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_home/share.svg" alt="" />
                </button>
              </Tooltip>
            ) : null}
            {onTradingRadar ? (
              <Tooltip title={t('pcCoinDetail.tradingRadar')} placement="bottom">
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnIconOnly}`}
                  onClick={onTradingRadar}
                  aria-label={t('pcCoinDetail.tradingRadar')}
                >
                  <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_home/trading_radar.svg" alt="" />
                </button>
              </Tooltip>
            ) : null}
            {onAlert ? (
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.alertCta}`}
                onClick={onAlert}
              >
                <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_home/belling.svg" alt="" />
                <span>{t('detail.actions.addAlert')}</span>
              </button>
            ) : null}
            {onGoTrade ? (
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.tradeCta}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onGoTrade?.();
                }}
              >
                <span>{t('detail.actions.goTrade')}</span>
                <span className={styles.tradeArrow} aria-hidden>›</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className={styles.mainCard}>
        <div className={styles.mainCardBody}>
          <div
            ref={chartOrderRowRef}
            className={`${styles.chartOrderRow}${draggingPane ? ` ${styles.chartOrderRowDragging}` : ''}`}
          >
            {showLeftPane ? (
              <aside className={styles.roiPane} style={leftPaneStyle}>
                {sideLeft}
              </aside>
            ) : null}
            {showLeftPane ? (
              <div
                className={`${styles.paneResizer} ${draggingPane === 'left' ? styles.paneResizerActive : ''}`}
                role="separator"
                aria-orientation="vertical"
                aria-label={t('pcCoinDetail.resizeLeftPane', { defaultValue: '调整左侧栏宽度' })}
                onPointerDown={(e) => startPaneDrag('left', e)}
              >
                <span className={styles.paneResizerHandle} aria-hidden>
                  <HolderOutlined />
                </span>
              </div>
            ) : null}
            <div className={styles.chartPane}>
              <div className={styles.chartPaneMain}>{topChild}</div>
              {barrageBarEl}
            </div>
            {showRightPane ? (
              <div
                className={`${styles.paneResizer} ${draggingPane === 'right' ? styles.paneResizerActive : ''}`}
                role="separator"
                aria-orientation="vertical"
                aria-label={t('pcCoinDetail.resizeRightPane', { defaultValue: '调整右侧栏宽度' })}
                onPointerDown={(e) => startPaneDrag('right', e)}
              >
                <span className={styles.paneResizerHandle} aria-hidden>
                  <HolderOutlined />
                </span>
              </div>
            ) : null}
            {showRightPane ? (
              <aside className={styles.orderPane} style={rightPaneStyle}>
                {restChildren}
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
