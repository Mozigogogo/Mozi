import React from 'react';
import styles from '@/app/user/page.module.less';

const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';
const VIP_ICON = '/icons/new_user/vip.svg';

const UserInfo = ({ userInfo, handleLogin, isTelegramEnv }) => {
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
                <img className={styles.verifyIcon} src={VIP_ICON} alt="verify" onError={(e) => e.target.style.display = 'none'} />
              </div>
              <div className={styles.infoContent}>
                <div className={styles.nicknameWrapper}>
                  <span className={styles.nickname}>
                    {userInfo.nickname || "无为而治"}
                  </span>
                </div>
              </div>
            </div>

            {/* 第二行：标签 */}
            <div className={styles.tagsRow}>
              <span className={styles.userTag}>合规从业者</span>
              <span className={styles.userTag}>内容创作者</span>
              <span className={styles.userTag}>专职交易员</span>
              <span className={styles.userTag}>社群运营</span>
            </div>

            {/* 第三行：简介 */}
            <div className={styles.bioRow}>
              {userInfo.bio || "资金流动大师，金融NO.1"}
            </div>
          </div>
        ) : (
          <div className={styles.loginBox}>
            <div className={styles.headerContentTop} onClick={isTelegramEnv ? undefined : handleLogin}>
              <div className={styles.userInfoRow}>
                <div className={styles.avatarWrapper}>
                  <img className={styles.headerAvatar} src={DEFAULT_AVATAR} alt="头像" />
                </div>
                <div className={styles.infoContent}>
                  <div className={styles.nicknameWrapper}>
                    <span className={styles.nickname}>请登录</span>
                  </div>
                  <div className={styles.bioRow}>
                    登录后查看更多精彩内容
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
