import React from 'react';
import { RightArrowIcon } from '@/components/Icons';
import { navigateToOrReload } from '@/utils/clientNavigation';
import styles from '@/app/user/page.module.less';

const UserActions = ({ 
  userInfo, 
  t, 
  attendUs, 
  unreadCount, 
  handleLogin, 
  score, 
  handleShare, 
  isTelegramEnv 
}) => {
  return (
    <>
      <div className={styles.actionButtons}>
        <div className={styles.actionButton} onClick={() => navigateToOrReload('/find?tab=self')}>
          <div className={styles.actionIcon}>
            <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/optional%402x.png'} alt={t('user.myFavorites')} loading="lazy" decoding="async" />
          </div>
          <div className={styles.actionText}>{t('user.myFavorites')}</div>
        </div>
        <div className={styles.actionButton} onClick={() => navigateToOrReload('/mywarn')}>
          <div className={styles.actionIcon}>
            <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/me-alert%402x.png'} alt={t('user.myWarnings')} loading="lazy" decoding="async" />
          </div>
          <div className={styles.actionText}>{t('user.myWarnings')}</div>
        </div>
        <div className={styles.actionButton} onClick={attendUs}>
          <div className={styles.actionIcon}>
            <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/twitter.svg'} alt={t('user.followTwitter')} loading="lazy" decoding="async" />
          </div>
          <div className={styles.actionText}>{t('user.followTwitter')}</div>
        </div>
      </div>

      <div className={styles.secondaryActions}>
        <div className={styles.actionRow}>
          <div className={styles.actionButton} onClick={() => navigateToOrReload('/mycomments')}>
            <div className={styles.actionIcon}>
              <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/comment%402x.png'} alt={t('user.myComments')} loading="lazy" decoding="async" />
            </div>
            <div className={styles.actionText}>{t('user.myComments')}</div>
          </div>
          <div className={styles.actionButton} onClick={() => navigateToOrReload('/mynotices')}>
            <div className={styles.actionIcon} style={{ position: 'relative' }}>
              <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/mail%402x.png'} alt={t('user.messageNotification')} loading="lazy" decoding="async" />
              {unreadCount > 0 && <div className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</div>}
            </div>
            <div className={styles.actionText}>{t('user.messageNotification')}</div>
          </div>
          <div className={styles.actionButton} onClick={() => navigateToOrReload('/mylikes')}>
            <div className={styles.actionIcon}>
              <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/like%402x.png'} alt={t('user.myLikes')} loading="lazy" decoding="async" />
            </div>
            <div className={styles.actionText}>{t('user.myLikes')}</div>
          </div>
        </div>
      </div>

      <div className={styles.horizontalButtons}>
        {!userInfo.isLogin ? (
          <div className={`${styles.horizontalBtn} ${styles.left}`} onClick={handleLogin}>
            <div className={styles.btnIcon}>
              <img className={styles.btnIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/feedback%402x.png'} alt="反馈" loading="lazy" decoding="async" />
            </div>
            <div className={styles.btnBottom}>
              <div className={styles.btnContent}>
                <div className={styles.btnText}>{t('user.feedback')}</div>
                <div className={styles.btnSubtext}>{t('user.feedbackDesc')}</div>
              </div>
              <div className={styles.btnArrow}>
                <RightArrowIcon size={24} color="#A5A9AF" />
              </div>
            </div>
          </div>
        ) : (
          <div className={`${styles.horizontalBtn} ${styles.left}`} onClick={score}>
            <div className={styles.btnIcon}>
              <img className={styles.btnIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/feedback%402x.png'} alt="反馈" loading="lazy" decoding="async" />
            </div>
            <div className={styles.btnBottom}>
              <div className={styles.btnContent}>
                <div className={styles.btnText}>{t('user.feedback')}</div>
                <div className={styles.btnSubtext}>{t('user.feedbackDesc')}</div>
              </div>
              <div className={styles.btnArrow}>
                <RightArrowIcon size={24} color="#A5A9AF" />
              </div>
            </div>
          </div>
        )}
        <div className={`${styles.horizontalBtn} ${styles.right}`} onClick={handleShare}>
          <div className={styles.btnIcon}>
            <img className={styles.btnIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/me-share%402x.png'} alt="推荐朋友" loading="lazy" decoding="async" />
          </div>
          <div className={styles.btnBottom}>
            <div className={styles.btnContent}>
              <div className={styles.btnText}>{t('user.recommendFriend')}</div>
              <div className={styles.btnSubtext}>{t('user.recommendDesc')}</div>
            </div>
            <div className={styles.btnArrow}>
              <RightArrowIcon size={24} color="#A5A9AF" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserActions;
