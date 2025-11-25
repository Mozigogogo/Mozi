'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

/**
 * 新币上线组件
 * @param {boolean} showMore - 是否显示"查看更多"
 * @param {Array} data - 新币上线数据列表
 * @param {Function} onMoreClick - 点击"查看更多"的回调
 */
const NewCoinListing = ({ showMore = false, data = [], onMoreClick }) => {
  const { t } = useTranslation();
  
  const coinListings = data || [];

  return (
    <div className={styles.wrapper}>
      {/* 标题头部 */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>{t('user.newCoinListing')}</span>
        {showMore && (
          <span className={styles.viewMore} onClick={onMoreClick}>
            {t('user.viewMore')} {'>'}
          </span>
        )}
      </div>
      
      {/* 新币上线内容容器：横向滑动列表 */}
      <div className={styles.container}>
        {coinListings.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>{t('user.noNewListings') || '暂无新币上线'}</p>
          </div>
        ) : (
          <div className={styles.scroll}>
            {coinListings.map((coin, index) => {
              const isLast = index === coinListings.length - 1;
              // 适配多种字段格式
              const exchangeName = coin.exchanges || coin.exchange || coin.name;
              const exchangeIcon = coin.logoUrl || coin.exchangeIcon || coin.icon;
              const listingTime = coin.ctime || coin.listingTime || coin.time;
              const details = coin.deteil || coin.details || coin.description;
              const title = coin.title;
              const link = coin.link;
              
              return (
                <div className={`${styles.coinItem} ${isLast ? styles.last : ''}`} key={coin.id || index}>
                  <div className={styles.coinInfo}>
                    <img className={styles.exchangeIcon} src={exchangeIcon} alt={exchangeName} />
                    <span className={styles.exchangeName}>{exchangeName}</span>
                    <span className={styles.listingTime}>{listingTime}</span>
                  </div>
                  {title && <p className={styles.coinTitle}>{title}</p>}
                  {details && (
                    <div className={styles.coinLinkContainer}>
                      <span className={styles.coinLink}>{t('user.details')} {details}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewCoinListing;

