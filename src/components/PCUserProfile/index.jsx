'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FavoriteIcon } from '@/components/Icons/FavoriteIcon';
import { BellIcon } from '@/components/Icons/BellIcon';
import styles from './index.module.less';

const MOCK_USER = {
  nickname: '无为而治',
  avatar: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png',
  isVip: true,
  tags: ['合规从业者', '内容创作者', '专职交易员', '社群运营'],
  bio: '资金流动大师，金融NO.1',
  stats: {
    following: 23,
    followers: 23,
    likes: 23,
    points: 23
  }
};

const MOCK_COINS = [
  { id: 1, symbol: 'BTC', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', price: '102.658.7', change: '+3.58%', isUp: true },
  { id: 2, symbol: 'ETH', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', price: '102.658.7', change: '+3.58%', isUp: true },
  { id: 3, symbol: 'SEI', icon: 'https://cryptologos.cc/logos/sei-sei-logo.png', price: '102.658.7', change: '+3.58%', isUp: true },
  { id: 4, symbol: 'SEI', icon: 'https://cryptologos.cc/logos/sei-sei-logo.png', price: '102.658.7', change: '+3.58%', isUp: true },
  { id: 5, symbol: 'SEI', icon: 'https://cryptologos.cc/logos/sei-sei-logo.png', price: '102.658.7', change: '+3.58%', isUp: true },
  { id: 6, symbol: 'SEI', icon: 'https://cryptologos.cc/logos/sei-sei-logo.png', price: '102.658.7', change: '+3.58%', isUp: true },
  { id: 7, symbol: 'SEI', icon: 'https://cryptologos.cc/logos/sei-sei-logo.png', price: '102.658.7', change: '+3.58%', isUp: true },
  { id: 8, symbol: 'SEI', icon: 'https://cryptologos.cc/logos/sei-sei-logo.png', price: '102.658.7', change: '+3.58%', isUp: true },
];

export default function PCUserProfile() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('watchlist');

  const tabs = [
    { key: 'watchlist', title: t('user.tabs.watchlist') || '自选', subtitle: t('user.tabs.watchlistDesc') || '他自选的币' },
    { key: 'monitor', title: t('user.tabs.monitor') || '监控', subtitle: t('user.tabs.monitorDesc') || '他监控的商品' },
    { key: 'content', title: t('user.tabs.content') || '内容', subtitle: t('user.tabs.contentDesc') || '他发布的内容' },
  ];

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.headerCard}>
        <div className={styles.avatarWrapper}>
          <img src={MOCK_USER.avatar} alt="avatar" className={styles.avatar} />
          {MOCK_USER.isVip && (
            <img src="/icons/new_user/vip.svg" alt="vip" className={styles.vipBadge} />
          )}
        </div>
        
        <div className={styles.userInfo}>
          <div className={styles.nameRow}>
            <span className={styles.nickname}>{MOCK_USER.nickname}</span>
            <div className={styles.tagsRow}>
              {MOCK_USER.tags.map((tag, index) => (
                <span key={index} className={styles.tag}>{tag}</span>
              ))}
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

      {/* Tabs Section */}
      <div className={styles.tabsRow}>
        {tabs.map((tab) => (
          <div 
            key={tab.key}
            className={`${styles.tabCard} ${activeTab === tab.key ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className={styles.tabTitle}>{tab.title}</span>
            <span className={styles.tabSubtitle}>{tab.subtitle}</span>
          </div>
        ))}
      </div>

      {/* Content Table Section */}
      {activeTab === 'watchlist' && (
        <div className={styles.contentSection}>
          <div className={styles.tableHeader}>
            <span>{t('user.list.coin') || '币种'}</span>
            <span>{t('user.list.price') || '最新价格'}</span>
            <span>{t('user.list.change24h') || '24h幅度'}</span>
            <span className={styles.headerCenter}>{t('user.list.actionHeaderWatchlist') || '自加选'}</span>
            <span className={styles.headerCenter}>{t('user.list.actionHeaderMonitor') || '加监控'}</span>
          </div>
          
          <div className={styles.tableBody}>
            {MOCK_COINS.map((coin, index) => (
              <div key={index} className={styles.tableRow}>
                <div className={styles.colCoin}>
                  <img src={coin.icon} alt={coin.symbol} />
                  <span>{coin.symbol}</span>
                </div>
                <div className={styles.colPrice}>{coin.price}</div>
                <div className={styles.colChange}>
                  <span className={`${styles.changeTag} ${coin.isUp ? styles.up : styles.down}`}>
                    {coin.change}
                  </span>
                </div>
                <div className={`${styles.centerCol} ${styles.actionBtn}`}>
                  <FavoriteIcon filled={true} size={24} color="#FF4D4F" />
                </div>
                <div className={`${styles.centerCol} ${styles.actionBtn}`}>
                  <BellIcon size={24} color="#ccc" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Placeholder for other tabs */}
      {activeTab !== 'watchlist' && (
        <div className={styles.contentSection} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#999' }}>
          {t('common.noData') || '暂无数据'}
        </div>
      )}
    </div>
  );
}
