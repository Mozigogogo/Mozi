'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LeftOutline, MoreOutline } from 'antd-mobile-icons';
import styles from './page.module.less';

// Mock Data
const MOCK_USER = {
  nickname: '无为而治',
  avatar: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png',
  isVip: true,
  tags: ['合规从业者'],
  bio: '资金流动大师，金融NO.1',
  stats: {
    following: 123,
    followers: 123,
    likes: 123,
    points: '123W'
  }
};

const MOCK_COINS = [
  { id: 1, symbol: 'BTC', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', price: '102.658.7', change: '+3.58%' },
  { id: 2, symbol: 'ETH', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', price: '102.658.7', change: '+3.58%' },
  { id: 3, symbol: 'SEI', icon: 'https://cryptologos.cc/logos/sei-sei-logo.png', price: '102.658.7', change: '+3.58%' },
  { id: 4, symbol: 'SEI', icon: 'https://cryptologos.cc/logos/sei-sei-logo.png', price: '102.658.7', change: '+3.58%' },
  { id: 5, symbol: 'SEI', icon: 'https://cryptologos.cc/logos/sei-sei-logo.png', price: '102.658.7', change: '+3.58%' },
  { id: 6, symbol: 'SEI', icon: 'https://cryptologos.cc/logos/sei-sei-logo.png', price: '102.658.7', change: '+3.58%' },
  { id: 7, symbol: 'SEI', icon: 'https://cryptologos.cc/logos/sei-sei-logo.png', price: '102.658.7', change: '+3.58%' },
  { id: 8, symbol: 'SEI', icon: 'https://cryptologos.cc/logos/sei-sei-logo.png', price: '102.658.7', change: '+3.58%' },
];

export default function UserProfile({ params }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('watchlist');

  return (
    <div className={styles.container}>
      <div className={styles.topBanner}>
        {/* Navigation Bar */}
        <div className={styles.navBar}>
          <LeftOutline className={styles.navIcon} onClick={() => router.back()} />
          <div className={styles.rightIcons}>
            <MoreOutline className={styles.navIcon} />
            <div className={styles.navIcon} style={{ border: '2px solid #333', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '8px', height: '8px', background: '#333', borderRadius: '50%' }}></div>
            </div>
          </div>
        </div>

        {/* User Info Section */}
        <div className={styles.userInfoSection}>
          <div className={styles.userHeader}>
            <div className={styles.avatarWrapper}>
              <img src={MOCK_USER.avatar} alt="avatar" className={styles.avatar} />
              {MOCK_USER.isVip && (
                <img src="/icons/new_user/vip.svg" alt="vip" className={styles.verifyIcon} />
              )}
            </div>
            <div className={styles.userInfoRight}>
              <div className={styles.nameRow}>
                <span className={styles.nickname}>{MOCK_USER.nickname}</span>
                <div className={styles.followBtn}>
                  <span>+</span> {t('user.stats.following') || '关注'}
                </div>
              </div>
              <div className={styles.tagRow}>
                {MOCK_USER.tags.map((tag, index) => (
                  <span key={index} className={styles.tag}>{tag}</span>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.bio}>{MOCK_USER.bio}</div>

          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{MOCK_USER.stats.following}</span>
              <span className={styles.statLabel}>{t('user.stats.following') || '关注'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{MOCK_USER.stats.followers}</span>
              <span className={styles.statLabel}>{t('user.stats.followers') || '粉丝'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{MOCK_USER.stats.likes}</span>
              <span className={styles.statLabel}>{t('user.stats.likes') || '获赞'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{MOCK_USER.stats.points}</span>
              <span className={styles.statLabel}>{t('user.stats.points') || '积分'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className={styles.contentBody}>
        {/* Tabs */}
        <div className={styles.tabs}>
          <div 
            className={`${styles.tabItem} ${activeTab === 'watchlist' ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab('watchlist')}
          >
            <div>{t('user.tabs.watchlist') || '自选'}</div>
            <span className={styles.subText}>{t('user.tabs.watchlistDesc') || '他选购的商品'}</span>
          </div>
          <div 
            className={`${styles.tabItem} ${activeTab === 'monitor' ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab('monitor')}
          >
            <div>{t('user.tabs.monitor') || '监控'}</div>
            <span className={styles.subText}>{t('user.tabs.monitorDesc') || '他监控的商品'}</span>
          </div>
          <div 
            className={`${styles.tabItem} ${activeTab === 'content' ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab('content')}
          >
            <div>{t('user.tabs.content') || '内容'}</div>
            <span className={styles.subText}>{t('user.tabs.contentDesc') || '他发布的内容'}</span>
          </div>
        </div>

        {/* List Header */}
        <div className={styles.listHeader}>
          <span className={styles.colCoin}>{t('user.list.coin') || '币种'}</span>
          <span className={styles.colPrice}>{t('user.list.price') || '最新价格'}</span>
          <span className={styles.colChange}>{t('user.list.change24h') || '24h幅度'}</span>
          <span className={styles.colAction}>{t('user.list.actionHeader') || '自加选 加监控'}</span>
        </div>

        {/* Coin List */}
        <div className={styles.coinList}>
          {MOCK_COINS.map((coin, index) => (
            <div key={index} className={styles.listItem}>
              <div className={`${styles.colCoin} ${styles.coinInfo}`}>
                <img src={coin.icon} alt={coin.symbol} className={styles.coinIcon} />
                <span className={styles.coinSymbol}>{coin.symbol}</span>
              </div>
              <div className={`${styles.colPrice} ${styles.price}`}>{coin.price}</div>
              <div className={`${styles.colChange} ${styles.changeBox}`}>
                <div className={`${styles.changeTag} ${styles.changeUp}`}>
                  {coin.change}
                </div>
              </div>
              <div className={`${styles.colAction} ${styles.actionIcons}`}>
                <HeartIcon />
                <BellIcon />
              </div>
            </div>
          ))}
        </div>

        <div className={styles.viewMore}>
          {t('common.viewMore') || '查看更多'} &gt;
        </div>
      </div>
    </div>
  );
}

// Simple Icon Components for Demo
const HeartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF4D4F" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#ccc" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
  </svg>
);
