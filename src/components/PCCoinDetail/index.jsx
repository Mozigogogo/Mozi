'use client';

import { useState, useCallback, Children } from 'react';
import { LeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/Skeleton';
import styles from './index.module.less';

const ICON_FAVORITE_ACTIVE = '/icons/new_detail/like_actived.svg';
const ICON_FAVORITE_INACTIVE = '/icons/new_detail/like_no_actived.svg';

/**
 * PC 端币种详情页布局壳：顶栏（返回 + 标题行情 + 操作）、主卡片（左 K 线 / 右大单侦测）、可选弹幕条。
 * children[0] = 图表，children[1+] = 右侧订单簿等。
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
  showBarrage = true,
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

  const setBarrage = useCallback(
    (v) => {
      if (onBarrageChange) onBarrageChange(v);
      if (barrageValueControlled === undefined) setBarrageInner(v);
    },
    [onBarrageChange, barrageValueControlled]
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

  const changeCls = isUp ? styles.changeUp : styles.changeDown;

  const childrenArr = Children.toArray(children);
  const topChild = childrenArr[0];
  const restChildren = childrenArr.slice(1);

  const flatStats = (statColumns || [])
    .flatMap((col) => (Array.isArray(col) ? col : [col]))
    .filter((cell) => cell && (cell.label || cell.value != null));

  const barrageBarEl =
    showBarrage ? (
      <div className={styles.barrageBar}>
        <img
          src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_home/comment.svg"
          alt=""
          className={styles.barrageIcon}
        />
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
    ) : null;

  return (
    <div className={`${styles.root} ${className || ''}`}>
      <header className={styles.topBar}>
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

        <div className={styles.tickerMid}>
          {loading && !currentPrice ? (
            <>
              <div className={styles.overviewSkeletonPrice}>
                <Skeleton config={{ type: 'element', width: 96, height: 24, borderRadius: 4 }} />
                <Skeleton config={{ type: 'element', width: 88, height: 12, borderRadius: 4, style: { marginTop: 4 } }} />
              </div>
              <div className={styles.overviewSkeletonStats}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className={styles.overviewSkeletonStatCol}>
                    <Skeleton config={{ type: 'element', width: 48, height: 10, borderRadius: 4 }} />
                    <Skeleton config={{ type: 'element', width: 64, height: 12, borderRadius: 4, style: { marginTop: 4 } }} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
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
              {flatStats.length > 0 ? (
                <div className={styles.statRow}>
                  {flatStats.map((cell, i) => (
                    <div key={i} className={styles.statItem}>
                      <span className={styles.statLabel}>{cell.label}</span>
                      <span className={styles.statValue}>{cell.value ?? '—'}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className={styles.actions}>
          {onToggleFavorite ? (
            <button type="button" className={styles.actionBtn} onClick={onToggleFavorite}>
              <img src={isFavorite ? ICON_FAVORITE_ACTIVE : ICON_FAVORITE_INACTIVE} alt="" />
              <span>{t('detail.actions.favorite')}</span>
            </button>
          ) : null}
          {onShare ? (
            <button type="button" className={styles.actionBtn} onClick={onShare}>
              <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_home/share.svg" alt="" />
              <span>{t('detail.actions.share')}</span>
            </button>
          ) : null}
          {onTradingRadar ? (
            <button type="button" className={styles.actionBtn} onClick={onTradingRadar}>
              <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_home/trading_radar.svg" alt="" />
              <span>{t('pcCoinDetail.tradingRadar')}</span>
            </button>
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
      </header>

      <div className={styles.mainCard}>
        <div className={styles.mainCardBody}>
          <div className={styles.chartOrderRow}>
            <div className={styles.chartPane}>{topChild}</div>
            {restChildren.length > 0 ? (
              <aside className={styles.orderPane}>{restChildren}</aside>
            ) : null}
          </div>
          {barrageBarEl}
        </div>
      </div>
    </div>
  );
}
