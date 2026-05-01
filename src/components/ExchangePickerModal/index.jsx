'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

const EXCHANGES = [
  { id: 'binance', label: 'Binance', icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/binance.svg' },
  { id: 'okx', label: 'OKX', icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/okx.svg' },
  { id: 'bitget', label: 'Bitget', icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/bitget.svg' },
  { id: 'gate', label: 'Gate.io', icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/gate.svg' },
];

export default function ExchangePickerModal({
  open = false,
  symbol = 'BTC',
  onClose,
  onSelect,
}) {
  const { t } = useTranslation();
  const [activeExchangeId, setActiveExchangeId] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // 每次打开弹窗默认不选中任何项
    setActiveExchangeId(null);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="presentation"
    >
      <div className={styles.panel} role="dialog" aria-modal="true">
        <div className={styles.handle} aria-hidden />
        <div className={styles.title}>
          {t('detail.tradePicker.title', { symbol: String(symbol || 'BTC').toUpperCase() })}
        </div>
        <div className={styles.grid}>
          {EXCHANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.exchangeCard} ${activeExchangeId === item.id ? styles.exchangeCardActive : ''}`}
              onClick={() => {
                setActiveExchangeId(item.id);
                onSelect?.(item.id);
              }}
            >
              <span className={styles.logo}>
                <img src={item.icon} alt={item.label} className={styles.logoImg} />
              </span>
              <span className={styles.exchangeName}>{item.label}</span>
              <span className={styles.exchangeDesc}>
                {t(`detail.tradePicker.exchanges.${item.id}`)}
              </span>
            </button>
          ))}
        </div>
        <div className={styles.hint}>{t('detail.tradePicker.hint')}</div>
        <button type="button" className={styles.cancelBtn} onClick={onClose}>
          {t('detail.tradePicker.cancel')}
        </button>
      </div>
    </div>,
    document.body
  );
}
