import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/user/page.module.less';

const StatsAndActions = ({ userInfo, openEditProfile, setShowBenefitCodeModal }) => {
  const router = useRouter();
  const EDIT_ICON = '/icons/new_user/edit.svg';
  const BIND_ICON = '/icons/new_user/bind.svg';

  if (!userInfo.isLogin) return null;

  return (
    <div className={styles.statsAndActionsWrapper}>
        <div className={styles.statsActionRow}>
            <div className={styles.statsGroup}>
                <div className={styles.statItem}>
                    <span className={styles.statValue}>123</span>
                    <span className={styles.statLabel}>关注</span>
                </div>
                <div className={styles.statItem}>
                        <span className={styles.statValue}>123</span>
                        <span className={styles.statLabel}>粉丝</span>
                </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>123</span>
                        <span className={styles.statLabel}>获赞</span>
                </div>
                <div className={styles.statItem}>
                        <span className={styles.statValue}>123W</span>
                        <span className={styles.statLabel}>积分</span>
                </div>
            </div>
            <div className={styles.actionGroup}>
                <div className={styles.profileBtn} onClick={() => router.push('/user/edit')}>
                    个人主页
                </div>
                <div className={styles.iconBtn} onClick={openEditProfile}>
                        {/* 编辑图标 */}
                        <img src={EDIT_ICON} alt="edit" />
                </div>
                <div className={styles.iconBtn} onClick={() => setShowBenefitCodeModal(true)}>
                        {/* 链接/分享图标 */}
                        <img src={BIND_ICON} alt="link" />
                </div>
            </div>
        </div>
    </div>
  );
};

export default StatsAndActions;
