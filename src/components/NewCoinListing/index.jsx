'use client';

import React from 'react';
import styles from './index.module.less';

/**
 * 新币上线组件
 * @param {boolean} showMore - 是否显示"查看更多"
 * @param {Array} data - 新币上线数据列表
 * @param {Function} onMoreClick - 点击"查看更多"的回调
 */
const NewCoinListing = ({ showMore = false, data = [], onMoreClick }) => {
  // 默认数据（如果没有传入data）
  const defaultData = [
    {
      id: 1,
      exchange: 'Binance',
      exchangeIcon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/biannce.png',
      listingTime: '2025-05-07 10:00:10',
      details: 'Ravala (AVA)将上线 Bitget 创新区及WEB3区!',
      link: 'https://www.bitget.com/zh-CN/support/articles/1256060381977'
    },
    {
      id: 2,
      exchange: 'OKX',
      exchangeIcon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/biannce.png',
      listingTime: '2025-05-08 14:30:00',
      details: 'LayerZero (ZRO) 将上线 OKX 现货交易!',
      link: 'https://www.okx.com/support/hc/zh-cn/articles/18649384847757'
    },
    {
      id: 3,
      exchange: 'Bybit',
      exchangeIcon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/biannce.png',
      listingTime: '2025-05-09 16:00:00',
      details: 'Polygon (POL) 将上线 Bybit 现货交易区!',
      link: 'https://announcements.bybit.com/article/pol-listing'
    }
  ];

  const coinListings = data.length > 0 ? data : defaultData;

  return (
    <div className={styles.wrapper}>
      {/* 标题头部 */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>新币上线</span>
        {showMore && (
          <span className={styles.viewMore} onClick={onMoreClick}>
            查看更多 {'>'}
          </span>
        )}
      </div>
      
      {/* 新币上线内容容器：横向滑动列表 */}
      <div className={styles.container}>
        <div className={styles.scroll}>
          {coinListings.map((coin, index) => {
            const isLast = index === coinListings.length - 1;
            return (
              <div className={`${styles.coinItem} ${isLast ? styles.last : ''}`} key={coin.id}>
                <div className={styles.coinInfo}>
                  <img className={styles.exchangeIcon} src={coin.exchangeIcon} alt={coin.exchange} />
                  <span className={styles.exchangeName}>{coin.exchange}</span>
                  <span className={styles.listingTime}>{coin.listingTime}</span>
                </div>
                <p className={styles.coinDetails}>{coin.details}</p>
                <div className={styles.coinLinkContainer}>
                  <span className={styles.coinLink}>详情: {coin.link}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NewCoinListing;

