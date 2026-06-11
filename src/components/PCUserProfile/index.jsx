'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Pagination, message } from 'antd';
import { FavoriteIcon } from '@/components/Icons/FavoriteIcon';
import { BellIcon } from '@/components/Icons/BellIcon';
import MonitorContent from '@/components/MonitorContent';
import UserPosts from '@/app/user/components/UserPosts';
import { updateUserInfo } from '@/api/user';
import styles from './index.module.less';

const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';
const AVATAR_UPLOAD_ICON =
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_user/upload_image.svg';
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const NICKNAME_EDIT_ICON =
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_user/edit.svg';
const NICKNAME_MAX_LENGTH = 50;

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
  isSelfProfile = false,
  onAvatarUpdated,
  onNicknameUpdated,
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const resolvedProfile = profile || {};
  const fileInputRef = useRef(null);
  const nicknameInputRef = useRef(null);
  const skipNicknameBlurSaveRef = useRef(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);

  const goFollowingList = () => {
    router.push(
      targetUserId
        ? `/user/following?userId=${encodeURIComponent(targetUserId)}`
        : '/user/following'
    );
  };

  const goFansList = () => {
    router.push(
      targetUserId
        ? `/user/fans?userId=${encodeURIComponent(targetUserId)}`
        : '/user/fans'
    );
  };
  const stats = resolvedProfile.stats || {};
  const identityTags = Array.isArray(resolvedProfile.tags) ? resolvedProfile.tags : [];
  const nicknameClass = resolvedProfile.isVip
    ? styles.nicknameVip
    : resolvedProfile.isLite
      ? styles.nicknameLite
      : styles.nickname;
  const displayAvatar = avatarPreview || resolvedProfile.avatar || DEFAULT_AVATAR;

  const syncProfileToStorage = ({ avatar, nickname }) => {
    try {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        const parsed = JSON.parse(storedUserInfo);
        if (avatar) parsed.avatar = avatar;
        if (nickname) parsed.nickName = nickname;
        localStorage.setItem('userInfo', JSON.stringify(parsed));
      }
    } catch (e) {
      console.error('[PCUserProfile] sync userInfo failed:', e);
    }

    try {
      const storedDataInfo = localStorage.getItem('userDataInfo');
      if (storedDataInfo) {
        const parsed = JSON.parse(storedDataInfo);
        if (!parsed.userInfo) parsed.userInfo = {};
        if (avatar) parsed.userInfo.avatar = avatar;
        if (nickname) parsed.userInfo.nickName = nickname;
        localStorage.setItem('userDataInfo', JSON.stringify(parsed));
      }
    } catch (e) {
      console.error('[PCUserProfile] sync userDataInfo failed:', e);
    }
  };

  useEffect(() => {
    if (isEditingNickname) {
      nicknameInputRef.current?.focus();
      nicknameInputRef.current?.select();
    }
  }, [isEditingNickname]);

  const startEditNickname = () => {
    setEditNickname(resolvedProfile.nickname || '');
    setIsEditingNickname(true);
  };

  const cancelEditNickname = () => {
    skipNicknameBlurSaveRef.current = true;
    setIsEditingNickname(false);
    setEditNickname(resolvedProfile.nickname || '');
  };

  const saveNickname = async () => {
    const trimmed = editNickname.trim();
    if (!trimmed) {
      message.error(t('user.toast.nicknameRequired'));
      return;
    }
    if (trimmed.length > NICKNAME_MAX_LENGTH) {
      message.error(t('user.toast.nicknameTooLong'));
      return;
    }
    if (trimmed === String(resolvedProfile.nickname || '').trim()) {
      setIsEditingNickname(false);
      return;
    }

    const hideLoading = message.loading(t('user.toast.saving'), 0);
    setNicknameSaving(true);

    try {
      await updateUserInfo({
        nickName: trimmed,
        avatar: displayAvatar,
      });
      onNicknameUpdated?.(trimmed);
      syncProfileToStorage({ nickname: trimmed, avatar: displayAvatar });
      message.success(t('user.saveSuccess'));
      setIsEditingNickname(false);
    } catch (error) {
      console.error('[PCUserProfile] nickname save failed:', error);
      message.error(t('user.saveFailed'));
    } finally {
      hideLoading();
      setNicknameSaving(false);
    }
  };

  const handleAvatarClick = () => {
    if (!isSelfProfile || avatarUploading) return;
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > AVATAR_MAX_BYTES) {
      message.error(t('user.toast.avatarTooLarge'));
      return;
    }

    const nickname = String(resolvedProfile.nickname || '').trim();
    if (!nickname) {
      message.warning(t('user.toast.nicknameRequired'));
      return;
    }

    const hideLoading = message.loading(t('user.toast.saving'), 0);
    setAvatarUploading(true);

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result || '');
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(file);
      });

      if (!dataUrl) {
        throw new Error('empty avatar data');
      }

      setAvatarPreview(String(dataUrl));

      const res = await updateUserInfo({
        avatar: dataUrl,
        nickName: nickname,
      });

      const newAvatar =
        (typeof res?.data === 'string' && res.data) ||
        (typeof res?.data?.avatar === 'string' && res.data.avatar) ||
        String(dataUrl);

      setAvatarPreview(null);
      onAvatarUpdated?.(newAvatar);
      syncProfileToStorage({ avatar: newAvatar, nickname });
      message.success(t('user.saveSuccess'));
    } catch (error) {
      console.error('[PCUserProfile] avatar upload failed:', error);
      setAvatarPreview(null);
      message.error(t('user.saveFailed'));
    } finally {
      hideLoading();
      setAvatarUploading(false);
    }
  };

  const tabs = [
    {
      key: 'watchlist',
      title: t('user.tabs.watchlist') || '自选',
      subtitle: t(isSelfProfile ? 'user.tabs.watchlistDescSelf' : 'user.tabs.watchlistDesc')
        || (isSelfProfile ? '我选购的商品' : '他选购的商品'),
    },
    {
      key: 'monitor',
      title: t('user.tabs.monitor') || '监控',
      subtitle: t(isSelfProfile ? 'user.tabs.monitorDescSelf' : 'user.tabs.monitorDesc')
        || (isSelfProfile ? '我监控的商品' : '他监控的商品'),
    },
    {
      key: 'content',
      title: t('user.tabs.content') || '内容',
      subtitle: t(isSelfProfile ? 'user.tabs.contentDescSelf' : 'user.tabs.contentDesc')
        || (isSelfProfile ? '我发布的内容' : '他发布的内容'),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
      {/* Header Section */}
      <div className={styles.headerCard}>
        <div
          className={`${styles.avatarWrapper} ${isSelfProfile ? styles.avatarWrapperEditable : ''} ${avatarUploading ? styles.avatarUploading : ''}`}
          onClick={handleAvatarClick}
          onKeyDown={(e) => {
            if (!isSelfProfile) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleAvatarClick();
            }
          }}
          role={isSelfProfile ? 'button' : undefined}
          tabIndex={isSelfProfile ? 0 : undefined}
          aria-label={isSelfProfile ? t('editProfile.changeAvatar', { defaultValue: '更换头像' }) : undefined}
        >
          <img src={displayAvatar} alt="avatar" className={styles.avatar} />
          {isSelfProfile ? (
            <div className={styles.avatarEditOverlay} aria-hidden>
              <img src={AVATAR_UPLOAD_ICON} alt="" className={styles.avatarEditIcon} />
            </div>
          ) : null}
          {(resolvedProfile.isVip || resolvedProfile.isLite) && (
            <img
              src={resolvedProfile.isVip ? 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_user/vip.svg' : 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/vip/lite.svg'}
              alt={resolvedProfile.isVip ? 'vip' : 'lite'}
              className={styles.vipBadge}
            />
          )}
          {isSelfProfile ? (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.avatarFileInput}
              onChange={handleAvatarFileChange}
            />
          ) : null}
        </div>
        
        <div className={styles.userInfo}>
          <div className={styles.nameRow}>
            <div className={styles.nameEditGroup}>
              {isSelfProfile && isEditingNickname ? (
                <input
                  ref={nicknameInputRef}
                  className={styles.nicknameInput}
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveNickname();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelEditNickname();
                    }
                  }}
                  onBlur={() => {
                    if (skipNicknameBlurSaveRef.current) {
                      skipNicknameBlurSaveRef.current = false;
                      return;
                    }
                    if (!nicknameSaving) {
                      saveNickname();
                    }
                  }}
                  maxLength={NICKNAME_MAX_LENGTH}
                  disabled={nicknameSaving}
                  aria-label={t('editProfile.nickname', { defaultValue: '昵称' })}
                />
              ) : (
                <span className={nicknameClass}>{resolvedProfile.nickname || '-'}</span>
              )}
              {isSelfProfile && !isEditingNickname ? (
                <button
                  type="button"
                  className={styles.nicknameEditBtn}
                  onClick={startEditNickname}
                  aria-label={t('editProfile.editNickname', { defaultValue: '编辑昵称' })}
                >
                  <img src={NICKNAME_EDIT_ICON} alt="" className={styles.nicknameEditIcon} />
                </button>
              ) : null}
            </div>
            {!isSelfProfile ? (
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
            ) : null}
          </div>
          
          <div className={styles.tagsRow}>
            {identityTags.map((tag, index) => (
              <span key={index} className={styles.tag}>{tag}</span>
            ))}
          </div>
          
          <div className={styles.bio}>{resolvedProfile.bio || '-'}</div>
          
          <div className={styles.statsRow}>
            <div
              className={`${styles.statItem} ${styles.statItemClickable}`}
              onClick={goFollowingList}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  goFollowingList();
                }
              }}
            >
              <span className={styles.statValue}>{stats.following ?? 0}</span>
              <span className={styles.statLabel}>{t('user.stats.following') || '关注'}</span>
            </div>
            <div
              className={`${styles.statItem} ${styles.statItemClickable}`}
              onClick={goFansList}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  goFansList();
                }
              }}
            >
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
