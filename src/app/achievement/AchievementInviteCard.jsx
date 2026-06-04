'use client';

import { useTranslation } from 'react-i18next';
import { getTgInviteLink } from '@/utils/constants';
import styles from './AchievementInviteCard.module.less';

export default function AchievementInviteCard({ pointsData, copyToClipboard, onApplyWithdraw }) {
  const { t } = useTranslation();
  const inviteCode = String(pointsData.inviteCode || '').trim();

  const formatUsdt = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return '0';
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };
  const inviteLinkFallback =
    pointsData.inviteLink ||
    (typeof window !== 'undefined' && inviteCode
      ? `${window.location.origin}/?inviteCode=${encodeURIComponent(inviteCode)}`
      : getTgInviteLink(inviteCode));

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/invite_icon.svg" alt="invite" className={styles.headerIcon} />
        <h3 className={styles.title}>{t('pointsDetail.inviteRewards')}</h3>
      </div>

      <div className={styles.rewardRow}>
        <div className={styles.rewardItem}>
          <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/invite_register.png" alt="register" className={styles.rewardIcon} />
          <div className={styles.rewardText}>
            <div className={styles.rewardName}>{t('pointsDetail.inviteRegister')}</div>
            <div className={styles.rewardValue}>{t('pointsDetail.inviteRegisterReward', { defaultValue: '+250' })}</div>
          </div>
        </div>
        <div className={styles.rewardItem}>
          <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/invite_pay.png" alt="pay" className={styles.rewardIcon} />
          <div className={styles.rewardText}>
            <div className={styles.rewardName}>{t('pointsDetail.invitePay')}</div>
            <div className={styles.rewardValue}>{t('pointsDetail.invitePayReward', { defaultValue: '+3000' })}</div>
          </div>
        </div>
      </div>

      <div className={styles.inputBlock}>
        <span className={styles.inputLabel}>{t('pointsDetail.inviteLink')}</span>
        <div className={styles.inputValue} title={inviteLinkFallback}>
          {inviteLinkFallback}
        </div>
        <button type="button" className={styles.copyBtn} onClick={() => copyToClipboard(inviteLinkFallback)}>
          <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/copy.svg" alt="copy" />
        </button>
      </div>

      <div className={styles.inputBlock}>
        <span className={styles.inputLabel}>{t('pointsDetail.inviteCode')}</span>
        <div className={styles.inputValue}>{pointsData.inviteCode || 'MOZI888'}</div>
        <button
          type="button"
          className={styles.copyBtn}
          onClick={() => copyToClipboard(pointsData.inviteCode || 'MOZI888')}
        >
          <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/copy.svg" alt="copy" />
        </button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <div className={styles.statValue}>{pointsData.totalInvites || 0}</div>
          <div className={styles.statLabel}>{t('pointsDetail.shareCount')}</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>{pointsData.earnedPoints || 0}</div>
          <div className={styles.statLabel}>{t('pointsDetail.totalEarned')}</div>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <div className={styles.statValue}>{formatUsdt(pointsData.totalCommission)}</div>
          <div className={styles.statLabel}>{t('pointsDetail.totalCommission')}</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>{formatUsdt(pointsData.withdrawnAmount)}</div>
          <div className={styles.statLabel}>{t('pointsDetail.withdrawnAmount')}</div>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <div className={styles.statValue}>{formatUsdt(pointsData.withdrawableAmount)}</div>
          <div className={styles.statLabel}>{t('pointsDetail.withdrawableAmount')}</div>
        </div>
        <div className={`${styles.statBox} ${styles.statBoxApply}`}>
          <div className={styles.statLabel}>{t('pointsDetail.applyTH')}</div>
          <button type="button" className={styles.withdrawBtn} onClick={() => onApplyWithdraw?.()}>
            {t('pointsDetail.applyWithdrawAction')}
          </button>
        </div>
      </div>

      <div className={styles.rules}>
        <p>{t('pointsDetail.inviteRules.1')}</p>
        <p>{t('pointsDetail.inviteRules.2')}</p>
        <p>{t('pointsDetail.inviteRules.3')}</p>
        <p>{t('pointsDetail.inviteRules.4')}</p>
      </div>
    </section>
  );
}

