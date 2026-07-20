'use client';

import { useState, useCallback, Children } from 'react';
import { LeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/Skeleton';
import styles from './index.module.less';

const ICON_FAVORITE_ACTIVE = '/icons/new_detail/like_actived.svg';
const ICON_FAVORITE_INACTIVE = '/icons/new_detail/like_no_actived.svg';

/**
 * PC 端币种详情页布局壳：顶栏（返回 + 操作）、行情概要、主卡片内容区、可选弹幕条。
 * 图表/大单侦测等通过 children 传入。
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
  /** 三列统计数据：statColumns[0] 为左列、以此类推，每列内为自上而下多条 { label, value } */
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
          <span className={styles.headerTitle}>{headerTitle || symbol || '—'}</span>
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

      <section className={styles.overview}>
        {loading && !coinIcon ? (
          <div className={styles.overviewSkeleton}>
            <div className={styles.overviewSkeletonLeft}>
              <Skeleton config={{ type: 'circle', size: 40 }} />
              <Skeleton config={{ type: 'element', width: 72, height: 24, borderRadius: 4 }} />
            </div>
            <div className={styles.overviewSkeletonRight}>
              <Skeleton config={{ type: 'element', width: 160, height: 36, borderRadius: 6 }} />
              <Skeleton config={{ type: 'element', width: 120, height: 18, borderRadius: 4, style: { marginTop: 8 } }} />
              <div className={styles.overviewSkeletonStats}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className={styles.overviewSkeletonStatCol}>
                    <Skeleton config={{ type: 'element', width: '100%', height: 14, borderRadius: 4 }} />
                    <Skeleton config={{ type: 'element', width: '80%', height: 14, borderRadius: 4, style: { marginTop: 8 } }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.overviewInner}>
            <div className={styles.overviewLeft}>
              <div className={styles.coinBlock}>
                {coinIcon ? (
                  <img src={coinIcon} alt={symbol || ''} className={styles.coinIcon} />
                ) : (
                  <div className={styles.coinIcon} />
                )}
                <span className={styles.coinSymbol}>{symbol || '—'}</span>
              </div>
            </div>
            <div className={styles.overviewRight}>
              <div className={styles.priceBlock}>
                <div className={`${styles.priceMain} ${changeCls}`}>{currentPrice ?? '—'}</div>
                <div className={`${styles.changeRow} ${changeCls}`}>
                  <span>{isUp ? '▲' : '▼'}</span>
                  {priceChangeAbs != null && priceChangeAbs !== '' ? (
                    <span>{priceChangeAbs}</span>
                  ) : null}
                  {priceChangePercent != null && priceChangePercent !== '' ? (
                    <span>{priceChangePercent}</span>
                  ) : null}
                </div>
              </div>
              {statColumns.length > 0 ? (
                <div className={styles.statGrid}>
                  {statColumns.slice(0, 3).map((col, ci) => (
                    <div key={ci} className={styles.statCol}>
                      {(col || []).map((cell, i) => (
                        <div key={i} className={styles.statItem}>
                          <span className={styles.statLabel}>{cell.label}</span>
                          <span className={styles.statValue}>{cell.value ?? '—'}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <div className={styles.mainCard}>
        <div className={styles.mainCardBody}>
          {topChild}
          {barrageBarEl}
          {restChildren}
        </div>
      </div>
    </div>
  );
}
