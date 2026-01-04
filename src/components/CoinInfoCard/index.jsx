'use client';

import styles from './index.module.less';

/**
 * 币种信息卡片组件
 * @param {string} symbol - 币种符号，如 'BTC'
 * @param {string} icon - 币种图标URL
 * @param {string|number} price - 当前价格
 * @param {string|number} change24h - 24小时价格变化
 * @param {string|number} changePercent - 涨跌幅百分比
 * @param {string|number} marketCap - 市值
 * @param {boolean} isPC - 是否为PC端，默认false
 * @param {Function} onClick - 点击回调
 */
export default function CoinInfoCard({
  symbol = 'BTC',
  icon,
  price,
  change24h,
  changePercent,
  marketCap,
  isPC = false,
  onClick
}) {
  // 判断涨跌
  const isPositive = changePercent >= 0;
  
  // 格式化市值
  const formatMarketCap = (value) => {
    if (!value) return '-';
    const num = Number(value);
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}万亿`;
    if (num >= 1e8) return `$${(num / 1e8).toFixed(2)}亿`;
    if (num >= 1e4) return `$${(num / 1e4).toFixed(2)}万`;
    return `$${num.toFixed(2)}`;
  };

  // 格式化价格
  const formatPrice = (value) => {
    if (!value) return '-';
    const num = Number(value);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // 格式化百分比
  const formatPercent = (value) => {
    if (value === undefined || value === null) return '-';
    const num = Number(value);
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  return (
    <div 
      className={`${styles.coinInfoCard} ${isPC ? styles.pcMode : ''}`}
      onClick={onClick}
    >
      {/* 顶部：币种名称和市值 */}
      <div className={styles.header}>
        <div className={styles.coinName}>
          {icon && <img src={icon} alt={symbol} className={styles.coinIcon} />}
          <span className={styles.symbol}>{symbol}</span>
        </div>
        <div className={styles.marketCap}>{formatMarketCap(marketCap)}</div>
      </div>

      {/* 底部：价格和涨跌幅 */}
      <div className={styles.footer}>
        <div className={styles.priceInfo}>
          <div className={styles.price}>{formatPrice(price)}</div>
          <div className={styles.change24h}>{formatPrice(change24h)}</div>
        </div>
        <div className={`${styles.changePercent} ${isPositive ? styles.positive : styles.negative}`}>
          {formatPercent(changePercent)}
        </div>
      </div>
    </div>
  );
}
