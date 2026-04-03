import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '@/app/user/page.module.less';

const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';
const VIP_ICON = '/icons/new_user/vip.svg';

const UserInfo = ({ userInfo, handleLogin, isTelegramEnv }) => {
  const { t } = useTranslation();
  const isVip = !!userInfo?.isVip;

  return (
    <div className={styles.topBannerWrapper}>
      <div className={styles.headerBox}>
        {userInfo.isLogin ? (
          <div className={styles.headerContentTop}>
            {/* 第一行：头像、昵称 */}
            <div className={styles.userInfoRow}>
              <div className={styles.avatarWrapper}>
                <img className={styles.headerAvatar} src={userInfo.avatar || DEFAULT_AVATAR} alt="头像" />
                {/* 验证图标 */}
                {isVip && (
                  <img
                    className={styles.verifyIcon}
                    src={VIP_ICON}
                    alt="verify"
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                )}
              </div>
              <div className={styles.infoContent}>
                <div className={styles.nicknameWrapper}>
                  <span className={isVip ? styles.nicknameVip : styles.nickname}>
                    {userInfo.nickname || t('user.defaultNickname')}
                  </span>
                </div>
              </div>
            </div>

            {/* 第二行：标签 */}
            <div className={styles.tagsRow}>
              <span className={styles.userTag}>{t('user.tags.compliance')}</span>
              <span className={styles.userTag}>{t('user.tags.creator')}</span>
              <span className={styles.userTag}>{t('user.tags.trader')}</span>
              <span className={styles.userTag}>{t('user.tags.community')}</span>
            </div>

            {/* 第三行：简介 */}
            <div className={styles.bioRow}>
              {userInfo.bio || t('user.defaultBio')}
            </div>
          </div>
        ) : (
          <div className={styles.loginBox}>
            <div className={styles.headerContentTop} onClick={handleLogin}>
              <div className={styles.userInfoRow}>
                <div className={styles.avatarWrapper}>
                  <img className={styles.headerAvatar} src={DEFAULT_AVATAR} alt="头像" />
                </div>
                <div className={styles.infoContent}>
                  <div className={styles.nicknameWrapper}>
                    <span className={styles.nickname}>{t('user.pleaseLogin')}</span>
                  </div>
                  <div className={styles.bioRow}>
                    {t('user.loginTip')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserInfo;
