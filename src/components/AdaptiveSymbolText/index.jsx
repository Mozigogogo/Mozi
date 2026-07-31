'use client';

import { useSimpleAdaptiveFontSize } from '../../hooks/useAdaptiveFontSize';
import CoinSymbolIcon from '@/components/CoinSymbolIcon';
import styles from './index.module.less';

/**
 * 自适应字号的币种名称组件
 * @param {string} symbol - 币种名称
 * @param {string} iconUrl - 币种图标URL
 * @param {string} className - 自定义类名
 */
const AdaptiveSymbolText = ({ symbol, iconUrl, className = '' }) => {
  const fontSize = useSimpleAdaptiveFontSize(symbol);

  return (
    <div className={`${styles.symbolContainer} ${className}`} style={{ fontSize }}>
      <span className={styles.symbolIconWrap} aria-hidden>
        <CoinSymbolIcon symbol={symbol} url={iconUrl} size={18} />
      </span>
      <span className={styles.symbolText}>
        {symbol}
      </span>
    </div>
  );
};

export default AdaptiveSymbolText;
