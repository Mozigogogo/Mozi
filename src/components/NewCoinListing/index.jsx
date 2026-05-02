'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

/**
 * 新币上线组件
 * @param {boolean} showMore - 是否显示"查看更多"
 * @param {Array} data - 新币上线数据列表
 * @param {Function} onMoreClick - 点击"查看更多"的回调
 * @param {boolean} loading - 是否正在加载
 */
const NewCoinListing = ({ showMore = false, data = [], onMoreClick, loading = false, isPC = false }) => {
  const { t } = useTranslation();
  
  const coinListings = data || [];
  const displayList = showMore ? coinListings : coinListings.slice(0, 3);

  return (
    <div className={`${styles.wrapper} ${isPC ? styles.pcWrapper : ''}`}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>{t('user.newCoinListing')}</span>
        {showMore && (
          <span className={styles.viewMore} onClick={onMoreClick}>
            {t('user.viewMore')} {'>'}
          </span>
        )}
      </div>
      
      <div className={styles.container}>
        {loading ? (
          isPC ? (
            <div className={styles.grid}>
              {Array.from({ length: 3 }).map((_, index) => (
                <div className={`${styles.coinItem} ${styles.loadingCoinItem}`} key={`loading-${index}`}>
                  {index === 1 ? <div className={styles.loadingSpinner}></div> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner}></div>
            </div>
          )
        ) : coinListings.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>{t('user.noNewListings') || '暂无新币上线'}</p>
          </div>
        ) : isPC ? (
          <div className={styles.grid}>
            {displayList.map((coin, index) => {
              const listingTime = coin.ctime || coin.listingTime || coin.time;
              const details = coin.deteil || coin.details || coin.description;
              const title = coin.title;
              const coinName = coin.symbol || coin.coin || coin.currency || coin.name || '';
              const iconUrl = coin.logoUrl || coin.exchangeIcon || coin.icon || 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/calendar.svg';
              
              return (
                <div className={styles.coinItem} key={coin.id || index}>
                  <div className={styles.itemTop}>
                    <img className={styles.itemIcon} src={iconUrl} alt={title || 'listing icon'} />
                    <div className={styles.itemMain}>
                      <p className={styles.coinTitle} title={title}>{title || '--'}</p>
                      <p className={styles.listingTime}>{`详情 ${listingTime || '--'}`}</p>
                      <p className={styles.coinName}>{`上线 ${coinName || 'ADA'}`}</p>
                    </div>
                  </div>
                  {details ? (
                    <div className={styles.coinDesc} title={details}>
                      {details}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.scroll}>
            {coinListings.map((coin, index) => {
              const isLast = index === coinListings.length - 1;
              const exchangeName = coin.exchanges || coin.exchange || coin.name;
              const exchangeIcon = coin.logoUrl || coin.exchangeIcon || coin.icon;
              const listingTime = coin.ctime || coin.listingTime || coin.time;
              const details = coin.deteil || coin.details || coin.description;
              const title = coin.title;
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

