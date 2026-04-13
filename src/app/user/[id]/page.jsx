'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Toast } from 'antd-mobile';
import { LeftOutline, MoreOutline } from 'antd-mobile-icons';
import { FavoriteIcon } from '@/components/Icons/FavoriteIcon';
import { BellIcon } from '@/components/Icons/BellIcon';
import MonitorContent from '@/components/MonitorContent';
import { Skeleton } from '@/components/Skeleton';
import { getSelfselectByUserId } from '@/api/market';
import { getUserProfile, followUser, unfollowUser } from '@/api/user';
import UserPosts from '../components/UserPosts';
import styles from './page.module.less';
import userMeStyles from '@/app/user/page.module.less';

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
/** 与「我的」页一致：依据 profile 接口字段推导 pro / lite / free，用于昵称渐变与角标 */
function getProfileSubscriptionTier(user) {
  if (!user || typeof user !== 'object') return 'free';
  const tierCode = String(user.tierCode || '').toUpperCase();
  if (tierCode === 'PRO') return 'pro';
  if (tierCode === 'LITE') return 'lite';

  const planRaw = user.planCode || user.memberTier || user.plan_name || user.plan || user.tier || '';
  const plan = String(planRaw || '').toUpperCase();
  if (plan) {
    if (plan.includes('PRO')) return 'pro';
    if (plan.includes('LITE')) return 'lite';
    if (plan.includes('FREE') || plan === '0' || plan === 'NONE') return 'free';
  }

  if (user.isVip === 1 || user.isVip === true) return 'pro';
  const planLevelNumber = Number(user.planLevel);
  if (Number.isFinite(planLevelNumber) && planLevelNumber > 0) return 'pro';
  return 'free';
}

const EMPTY_PROFILE = {
  userId: '',
  nickname: '',
  avatar: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png',
  isVip: false,
  isLite: false,
  planCode: '',
  planLevel: 0,
  memberTier: '',
  isFollowing: false,
  tags: [],
  bio: '',
  stats: {
    following: 0,
    followers: 0,
    likes: 0,
    points: 0
  }
};

export default function UserProfile({ params }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('watchlist');
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistError, setWatchlistError] = useState(false);
  const [isPC, setIsPC] = useState(false);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [followLoading, setFollowLoading] = useState(false);
  const targetUserId = decodeURIComponent(
    String(pathname || '').match(/^\/user\/([^/?#]+)/)?.[1] || String(params?.id ?? '')
  ).trim();

  useEffect(() => {
    const checkDevice = () => {
      setIsPC(window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const fetchUserProfileData = useCallback(async (idFromCaller) => {
    const resolvedUserId = String(idFromCaller ?? '').trim();
    if (!resolvedUserId) return;
    try {
      const res = await getUserProfile(resolvedUserId, { noCache: true });
      const user = res?.data?.data && typeof res.data.data === 'object' ? res.data.data : (res?.data || {});
      const rawIdentityTag = user.identityTag;
      const identityTags =
        rawIdentityTag == null || String(rawIdentityTag).trim() === ''
          ? []
          : String(rawIdentityTag).split(/[,，]/).map((x) => x.trim()).filter(Boolean);
      const planLevelNumber = Number(user.planLevel);
      const tier = getProfileSubscriptionTier(user);
      const followingRaw = user.isFollowing;
      const isFollowingNormalized =
        followingRaw === true ||
        followingRaw === 1 ||
        followingRaw === '1' ||
        String(followingRaw).toLowerCase() === 'true';

      setProfile({
        userId: user.userId || resolvedUserId,
        nickname: user.nickName || user.nickname || '',
        avatar: user.avatar || EMPTY_PROFILE.avatar,
        isVip: tier === 'pro',
        isLite: tier === 'lite',
        planCode: user.planCode || '',
        planLevel: Number.isFinite(planLevelNumber) ? planLevelNumber : 0,
        memberTier: user.memberTier || '',
        isFollowing: isFollowingNormalized,
        tags: identityTags,
        bio: user.introduction || user.personalProfile || user.bio || '',
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
  }, []);

  // 监听路由中的 userId 变化，每次切到新用户都强制拉取
  useEffect(() => {
    if (!targetUserId) return;
    fetchUserProfileData(targetUserId);
  }, [targetUserId, fetchUserProfileData]);

  const handleFollowToggle = async () => {
    if (!targetUserId || followLoading) return;
    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await unfollowUser(targetUserId);
        setProfile((prev) => ({ ...prev, isFollowing: false }));
        Toast.show({
          content: t('common.unfollowed', { defaultValue: '已取消关注' }),
          position: 'bottom',
        });
      } else {
        await followUser(targetUserId);
        setProfile((prev) => ({ ...prev, isFollowing: true }));
        Toast.show({
          content: t('common.followed', { defaultValue: '已关注' }),
          position: 'bottom',
        });
      }
      // 关注状态切换后，主动拉一次服务端最新数据，避免本地状态与后端不一致
      fetchUserProfileData(targetUserId);
    } catch (error) {
      console.error('关注状态更新失败:', error);
      Toast.show({ content: t('common.operationFailed') || '操作失败，请稍后重试', position: 'bottom' });
    } finally {
      setFollowLoading(false);
    }
  };

  // 每次重新进入页面（切回标签页 / 浏览器返回恢复）都重新拉取
  useEffect(() => {
    const onFocus = () => targetUserId && fetchUserProfileData(targetUserId);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        targetUserId && fetchUserProfileData(targetUserId);
      }
    };
    const onPageShow = () => targetUserId && fetchUserProfileData(targetUserId);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [targetUserId, fetchUserProfileData]);

  // 拉取他人的自选列表
  useEffect(() => {
    if (!targetUserId || activeTab !== 'watchlist') return;

    let cancelled = false;
    const fetchWatchlist = async () => {
      setWatchlistLoading(true);
      setWatchlistError(false);
      try {
        const res = await getSelfselectByUserId(targetUserId);

        if (cancelled) return;

        // 兼容多种返回结构：{ data: [...] } 或直接数组
        if (res?.data?.isLogin === false) {
          setWatchlist([]);
          setWatchlistError(false);
          setWatchlistLoading(false);
          return;
        }

        let list = [];
        const raw = res?.data ?? res;
        if (Array.isArray(raw)) {
          list = raw;
        } else if (Array.isArray(raw?.list)) {
          list = raw.list;
        } else if (Array.isArray(raw?.data)) {
          list = raw.data;
        }

        setWatchlist(list.filter(Boolean));
        setWatchlistError(false);
      } catch (error) {
        console.error('获取用户自选列表失败:', error);
        if (!cancelled) {
          setWatchlistError(true);
        }
      } finally {
        if (!cancelled) {
          setWatchlistLoading(false);
        }
      }
    };

    fetchWatchlist();

    return () => {
      cancelled = true;
    };
  }, [targetUserId, activeTab]);

  if (isPC) {
    return (
      <PCLayout>
        <PCUserProfile />
      </PCLayout>
    );
  }

  const nicknameClass = profile.isVip
    ? userMeStyles.nicknameVip
    : profile.isLite
      ? userMeStyles.nicknameLite
      : userMeStyles.nickname;

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
            <div className={styles.avatarWrapper}>
              <img src={profile.avatar} alt="avatar" className={styles.avatar} />
              {(profile.isVip || profile.isLite) && (
                <img
                  src={profile.isVip ? '/icons/new_user/vip.svg' : '/icons/vip/lite.svg'}
                  alt={profile.isVip ? 'vip' : 'lite'}
                  className={styles.verifyIcon}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
            </div>
            <div className={styles.userInfoRight}>
              <div className={styles.nameRow}>
                <div className={`${userMeStyles.nicknameWrapper} ${styles.nicknameSlot}`}>
                  <span className={nicknameClass}>{profile.nickname}</span>
                </div>
                <div
                  className={styles.followBtn}
                  onClick={handleFollowToggle}
                  style={{ opacity: followLoading ? 0.7 : 1, pointerEvents: followLoading ? 'none' : 'auto' }}
                >
                  {!profile.isFollowing && <img src="/icons/new_user/plus.svg" alt="" />}
                  {profile.isFollowing
                    ? t('common.followed', { defaultValue: '已关注' })
                    : t('user.stats.following', { defaultValue: '关注' })}
                </div>
              </div>
            </div>
            <div className={styles.tagRow}>
              {profile.tags.map((tag, index) => (
                <span key={index} className={styles.tag}>{tag}</span>
              ))}
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
            ) : watchlistError ? (
              <div className={styles.coinList} style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                {t('common.loadFailed') || '加载自选数据失败，请稍后重试'}
              </div>
            ) : watchlist.length === 0 ? (
              <div className={styles.coinList} style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                {t('user.watchlist.empty') || '该用户暂无自选'}
              </div>
            ) : (
              <>
                <div className={styles.coinList}>
                  {watchlist.map((item, index) => {
                    const symbol = item.symbol || item.base || '--';
                    const icon = item.url || '/default-coin.svg';
                    const price = item.last ?? item.currentPrice ?? item.price ?? '--';
                    const changeRaw = item.price24h ?? item.priceChangePercent ?? item.change ?? '';
                    const changeStr = typeof changeRaw === 'number' ? `${changeRaw.toFixed(2)}%` : String(changeRaw || '');
                    const isUp = changeStr.startsWith('+') || (!changeStr.startsWith('-') && Number(changeRaw) >= 0);

                    return (
                      <div key={symbol || index} className={styles.listItem}>
                        <div className={`${styles.colCoin} ${styles.coinInfo}`}>
                          <img
                            src={icon}
                            alt={symbol}
                            className={styles.coinIcon}
                            onError={(e) => {
                              e.target.src = '/default-coin.svg';
                            }}
                          />
                          <span className={styles.coinSymbol}>{symbol}</span>
                        </div>
                        <div className={`${styles.colPrice} ${styles.price}`}>{price}</div>
                        <div className={`${styles.colChange} ${styles.changeBox}`}>
                          <div className={`${styles.changeTag} ${isUp ? styles.changeUp : styles.changeDown}`}>
                            {changeStr || '--'}
                          </div>
                        </div>
                        <div className={`${styles.colAction} ${styles.actionIcons}`}>
                          <div className={styles.actionCell}><HeartIcon /></div>
                          <div className={styles.actionCell}><MonitorIcon /></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.viewMore}>
                  {t('common.viewMore') || '查看更多'} &gt;
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'monitor' && (
          <div style={{ height: 'calc(100vh - 280px)', background: '#fff' }}>
            <MonitorContent showNavBar={false} showBackOnEmpty={false} readOnly={true} className={styles.monitorContainer} />
          </div>
        )}

        {activeTab === 'content' && (
          <UserPosts userId={targetUserId} />
        )}
      </div>
    </div>
  );
}
