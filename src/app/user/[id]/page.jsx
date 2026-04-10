'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LeftOutline, MoreOutline } from 'antd-mobile-icons';
import { FavoriteIcon } from '@/components/Icons/FavoriteIcon';
import { BellIcon } from '@/components/Icons/BellIcon';
import MonitorContent from '@/components/MonitorContent';
import { Skeleton } from '@/components/Skeleton';
import { getUserDataInfo } from '@/api/user';
import UserPosts from '../components/UserPosts';
import styles from './page.module.less';

const PCUserProfile = dynamic(() => import('../../../components/PCUserProfile'), {
  loading: () => null,
});
const PCLayout = dynamic(() => import('../../../components/PCLayout'), {
  loading: () => null,
});

// Simple Icon Components for Demo
const HeartIcon = () => (
  <FavoriteIcon filled={true} size={20} color="#FF4D4F" />
);

const MonitorIcon = () => (
  <BellIcon size={20} />
);

// 初始占位数据（避免接口返回前 UI 抖动；不要写死业务数字）
const EMPTY_PROFILE = {
  nickname: '',
  avatar: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png',
  isVip: false,
  tags: [],
  bio: '',
  stats: {
    following: 0,
    followers: 0,
    likes: 0,
    points: 0
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
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [isPC, setIsPC] = useState(false);
  const [profile, setProfile] = useState(EMPTY_PROFILE);

  useEffect(() => {
    const checkDevice = () => {
      setIsPC(window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  useEffect(() => {
    const targetUserId = String(params?.id ?? '').trim();
    if (!targetUserId) return;

    const fetchUserProfile = async () => {
      try {
        const res = await getUserDataInfo(targetUserId);
        const user = res?.data || {};

        setProfile({
          nickname: user.nickName || user.nickname || '',
          avatar: user.avatar || EMPTY_PROFILE.avatar,
          isVip: user.isVip === 1 || user.isVip === true,
          tags: Array.isArray(user.tags) ? user.tags : [],
          bio: user.personalProfile || user.bio || '',
          stats: {
            following: user.followingCount ?? 0,
            followers: user.fansCount ?? 0,
            likes: user.totalLikeCount ?? 0,
            points: user.totalPoints ?? 0
          }
        });
      } catch (error) {
        console.error('获取用户资料失败:', error);
      }
    };

    fetchUserProfile();
  }, [params?.id]);

  // Simulate loading for watchlist
  useEffect(() => {
    const timer = setTimeout(() => {
      setWatchlistLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isPC) {
    return (
      <PCLayout>
        <PCUserProfile />
      </PCLayout>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBanner}>
        {/* Navigation Bar */}
        <div className={styles.navBar}>
          <LeftOutline className={styles.navIcon} onClick={() => router.back()} />
        </div>

        {/* User Info Section */}
        <div className={styles.userInfoSection}>
          <div className={styles.userHeader}>
            <div className={styles.leftColumn}>
              <div className={styles.avatarWrapper}>
                <img src={profile.avatar} alt="avatar" className={styles.avatar} />
                {profile.isVip && (
                  <img src="/icons/new_user/vip.svg" alt="vip" className={styles.verifyIcon} />
                )}
              </div>
              <div className={styles.tagRow}>
                {profile.tags.map((tag, index) => (
                  <span key={index} className={styles.tag}>{tag}</span>
                ))}
              </div>
            </div>
            <div className={styles.userInfoRight}>
              <div className={styles.nameRow}>
                <span className={styles.nickname}>{profile.nickname}</span>
                <div className={styles.followBtn}>
                  <img src="/icons/new_user/plus.svg" alt="" /> {t('user.stats.following') || '关注'}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.bio}>{profile.bio}</div>

          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{profile.stats.following}</span>
              <span className={styles.statLabel}>{t('user.stats.following') || '关注'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{profile.stats.followers}</span>
              <span className={styles.statLabel}>{t('user.stats.followers') || '粉丝'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{profile.stats.likes}</span>
              <span className={styles.statLabel}>{t('user.stats.likes') || '获赞'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{profile.stats.points}</span>
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

        {/* Content Area */}
        {activeTab === 'watchlist' && (
          <div className={styles.listContainer}>
            {/* List Header */}
            <div className={styles.listHeader}>
              <span className={styles.colCoin}>{t('user.list.coin') || '币种'}</span>
              <span className={styles.colPrice}>{t('user.list.price') || '最新价格'}</span>
              <span className={styles.colChange}>{t('user.list.change24h') || '24h幅度'}</span>
              <div className={styles.colAction}>
                <span className={styles.actionCell}>{t('user.list.actionHeaderWatchlist') || '自加选'}</span>
                <span className={styles.actionCell}>{t('user.list.actionHeaderMonitor') || '加监控'}</span>
              </div>
            </div>

            {/* Coin List */}
            {watchlistLoading ? (
              <div className={styles.coinList}>
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className={styles.listItem} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className={`${styles.colCoin} ${styles.coinInfo}`} style={{ gap: '12px' }}>
                      <Skeleton config={{ type: 'circle', size: 32 }} />
                      <Skeleton config={{ type: 'element', width: 60, height: 16 }} />
                    </div>
                    <div className={styles.colPrice}>
                      <Skeleton config={{ type: 'element', width: 80, height: 16 }} />
                    </div>
                    <div className={styles.colChange}>
                      <Skeleton config={{ type: 'element', width: 60, height: 28, borderRadius: 4 }} />
                    </div>
                    <div className={styles.colAction} style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                      <Skeleton config={{ type: 'circle', size: 20 }} />
                      <Skeleton config={{ type: 'circle', size: 20 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
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
                      <div className={styles.actionCell}><HeartIcon /></div>
                      <div className={styles.actionCell}><MonitorIcon /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!watchlistLoading && (
              <div className={styles.viewMore}>
                {t('common.viewMore') || '查看更多'} &gt;
              </div>
            )}
          </div>
        )}

        {activeTab === 'monitor' && (
          <div style={{ height: 'calc(100vh - 280px)', background: '#fff' }}>
            <MonitorContent showNavBar={false} showBackOnEmpty={false} readOnly={true} className={styles.monitorContainer} />
          </div>
        )}

        {activeTab === 'content' && (
          <UserPosts userId={params.id} />
        )}
      </div>
    </div>
  );
}
