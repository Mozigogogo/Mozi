import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import styles from '@/app/user/page.module.less';

const StatsAndActions = ({ userInfo, openEditProfile, setShowBenefitCodeModal, pointsTotal }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const EDIT_ICON = '/icons/new_user/edit.svg';
  const BIND_ICON = '/icons/new_user/bind.svg';

  if (!userInfo.isLogin) return null;

  const formatStat = (v) => {
    if (v == null) return '0';
    const n = Number(v);
    if (Number.isFinite(n)) return new Intl.NumberFormat().format(n);
    return String(v);
  };

  return (
    <div className={styles.statsAndActionsWrapper}>
        <div className={styles.statsActionRow}>
            <div className={styles.statsGroup}>
                <div className={styles.statItem}>
                    <span className={styles.statValue}>{formatStat(userInfo.followingCount)}</span>
                    <span className={styles.statLabel}>{t('user.stats.following')}</span>
                </div>
                <div className={styles.statItem}>
                        <span className={styles.statValue}>{formatStat(userInfo.fansCount)}</span>
                        <span className={styles.statLabel}>{t('user.stats.followers')}</span>
                </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{formatStat(userInfo.totalLikeCount)}</span>
                        <span className={styles.statLabel}>{t('user.stats.likes')}</span>
                </div>
                <div className={styles.statItem}>
                        <span className={styles.statValue}>
                          {formatStat(pointsTotal != null ? pointsTotal : userInfo.totalPoints)}
                        </span>
                        <span className={styles.statLabel}>{t('user.stats.points')}</span>
                </div>
            </div>
            <div className={styles.actionGroup}>
                <div className={styles.profileBtn} onClick={() => router.push('/user/edit')}>
                    {t('user.personalPage')}
                </div>
                {/* <div className={styles.iconBtn} onClick={openEditProfile}>
                        <img src={EDIT_ICON} alt="edit" />
                </div> */}
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
