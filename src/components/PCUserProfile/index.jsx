'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pagination } from 'antd';
import { FavoriteIcon } from '@/components/Icons/FavoriteIcon';
import { BellIcon } from '@/components/Icons/BellIcon';
import MonitorContent from '@/components/MonitorContent';
import UserPosts from '@/app/user/components/UserPosts';
import styles from './index.module.less';

const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';

export default function PCUserProfile({
  profile,
  targetUserId,
  activeTab,
  setActiveTab,
  watchlist,
  watchlistLoading,
  watchlistError,
  onFollowToggle,
  followLoading,
}) {
  const { t } = useTranslation();
  const resolvedProfile = profile || {};
  const stats = resolvedProfile.stats || {};
  const identityTags = Array.isArray(resolvedProfile.tags) ? resolvedProfile.tags : [];

  const tabs = [
    { key: 'watchlist', title: t('user.tabs.watchlist') || '自选', subtitle: t('user.tabs.watchlistDesc') || '他自选的币' },
    { key: 'monitor', title: t('user.tabs.monitor') || '监控', subtitle: t('user.tabs.monitorDesc') || '他监控的商品' },
    { key: 'content', title: t('user.tabs.content') || '内容', subtitle: t('user.tabs.contentDesc') || '他发布的内容' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
      {/* Header Section */}
      <div className={styles.headerCard}>
        <div className={styles.avatarWrapper}>
          <img src={resolvedProfile.avatar || DEFAULT_AVATAR} alt="avatar" className={styles.avatar} />
          {(resolvedProfile.isVip || resolvedProfile.isLite) && (
            <img
              src={resolvedProfile.isVip ? '/icons/new_user/vip.svg' : '/icons/vip/lite.svg'}
              alt={resolvedProfile.isVip ? 'vip' : 'lite'}
              className={styles.vipBadge}
            />
          )}
        </div>
        
        <div className={styles.userInfo}>
          <div className={styles.nameRow}>
            <span className={styles.nickname}>{resolvedProfile.nickname || '-'}</span>
            <button
              type="button"
              className={styles.followBtn}
              onClick={onFollowToggle}
              disabled={followLoading}
            >
              {resolvedProfile.isFollowing
                ? t('common.followed', { defaultValue: '已关注' })
                : t('user.stats.following', { defaultValue: '关注' })}
            </button>
          </div>
          
          <div className={styles.tagsRow}>
            {identityTags.map((tag, index) => (
              <span key={index} className={styles.tag}>{tag}</span>
            ))}
          </div>
          
          <div className={styles.bio}>{resolvedProfile.bio || '-'}</div>
          
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.following ?? 0}</span>
              <span className={styles.statLabel}>{t('user.stats.following') || '关注'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.followers ?? 0}</span>
              <span className={styles.statLabel}>{t('user.stats.followers') || '粉丝'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.likes ?? 0}</span>
              <span className={styles.statLabel}>{t('user.stats.likes') || '获赞'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.points ?? 0}</span>
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
        <div className={`${styles.contentSection} ${styles.watchlistSection}`}>
          <div className={styles.tableHeader}>
            <span>{t('user.list.coin') || '币种'}</span>
            <span>{t('user.list.price') || '最新价格'}</span>
            <span>{t('user.list.change24h') || '24h幅度'}</span>
            <span className={styles.headerCenter}>{t('user.list.actionHeaderWatchlist') || '自加选'}</span>
            <span className={styles.headerCenter}>{t('user.list.actionHeaderMonitor') || '加监控'}</span>
          </div>
          
          <div className={styles.tableBody}>
            {(watchlist || []).map((item, index) => {
              const symbol = item.symbol || item.base || '--';
              const icon = item.url || '/default-coin.svg';
              const price = item.last ?? item.currentPrice ?? item.price ?? '--';
              const changeRaw = item.price24h ?? item.priceChangePercent ?? item.change ?? '';
              const changeStr = typeof changeRaw === 'number' ? `${changeRaw.toFixed(2)}%` : String(changeRaw || '');
              const isUp = changeStr.startsWith('+') || (!changeStr.startsWith('-') && Number(changeRaw) >= 0);
              return (
              <div key={index} className={styles.tableRow}>
                <div className={styles.colCoin}>
                  <img
                    src={icon}
                    alt={symbol}
                    onError={(e) => {
                      e.currentTarget.src = '/default-coin.svg';
                    }}
                  />
                  <span>{symbol}</span>
                </div>
                <div className={styles.colPrice}>{price}</div>
                <div className={styles.colChange}>
                  <span className={`${styles.changeTag} ${isUp ? styles.up : styles.down}`}>
                    {changeStr || '--'}
                  </span>
                </div>
                <div className={styles.centerCol}>
                  <div className={styles.actionBtn}>
                    <FavoriteIcon filled={true} size={24} color="#FF4D4F" />
                  </div>
                </div>
                <div className={styles.centerCol}>
                  <div className={styles.actionBtn}>
                    <BellIcon size={24} color="#ccc" />
                  </div>
                </div>
              </div>
              );
            })}
            {watchlistLoading && (
              <div className={styles.noData}>{t('community.actions.loading') || 'Loading...'}</div>
            )}
            {!watchlistLoading && watchlistError && (
              <div className={styles.noData}>{t('common.loadFailed') || '加载失败'}</div>
            )}
            {!watchlistLoading && !watchlistError && (!watchlist || watchlist.length === 0) && (
              <div className={styles.noData}>{t('user.watchlist.empty') || '该用户暂无自选'}</div>
            )}
          </div>
          <div className={styles.paginationWrapper}>
            <Pagination defaultCurrent={1} total={Math.max((watchlist || []).length, 1)} align="center" />
          </div>
        </div>
      )}
      
      {activeTab === 'monitor' && (
        <div className={styles.contentSection}>
          <MonitorContent
            showNavBar={false}
            showBackOnEmpty={false}
            readOnly={true}
            userId={targetUserId}
            pcMode={true}
          />
        </div>
      )}

      {activeTab === 'content' && (
        <div className={styles.contentSection}>
          <UserPosts userId={targetUserId} pcMode={true} />
        </div>
      )}
      </div>
    </div>
  );
}
