'use client';

import { useState, useCallback } from 'react';
import { LeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Loading } from '@/components/Loading';
import styles from './index.module.less';

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

  const handleSend = useCallback(() => {
    const text = (barrageValue || '').trim();
    if (!text) return;
    onBarrageSend?.(text);
    if (barrageValueControlled === undefined && onBarrageSend) setBarrageInner('');
  }, [barrageValue, onBarrageSend, barrageValueControlled]);

  const changeCls = isUp ? styles.changeUp : styles.changeDown;

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
              <img
                src={
                  isFavorite
                    ? '/icons/new_home/collect_actived.svg'
                    : '/icons/pc/Collection@2x.png'
                }
                alt=""
              />
              <span className={isFavorite ? styles.actionLabelInFavorites : undefined}>
                {t('detail.actions.favorite')}
              </span>
            </button>
          ) : null}
          {onAlert ? (
            <button type="button" className={styles.actionBtn} onClick={onAlert}>
              <img src="/icons/pc/alert@2x.png" alt="" />
              <span>{t('detail.actions.alert')}</span>
            </button>
          ) : null}
          {onShare ? (
            <button type="button" className={styles.actionBtn} onClick={onShare}>
              <img src="/icons/new_detail/share.svg" alt="" />
              <span>{t('detail.actions.share')}</span>
            </button>
          ) : null}
          {onTradingRadar ? (
            <button type="button" className={styles.actionBtn} onClick={onTradingRadar}>
              <img src="/icons/new_home/monitor-bell.svg" alt="" />
              <span>{t('pcCoinDetail.tradingRadar')}</span>
            </button>
          ) : null}
        </div>
      </header>

      <section className={styles.overview}>
        {loading && !coinIcon ? (
          <div className={styles.overviewLoading}>
            <Loading tip={t('common.loading')} size={28} />
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
              <div className={styles.priceBlock}>
                <div className={styles.priceMain}>{currentPrice ?? '—'}</div>
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
        )}
      </section>

      <div className={styles.mainCard}>
        <div className={styles.mainCardBody}>{children}</div>
        {showBarrage ? (
          <div className={styles.barrageBar}>
            <img
              src="/icons/new_home/ai_chat.svg"
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
        ) : null}
      </div>
    </div>
  );
}
