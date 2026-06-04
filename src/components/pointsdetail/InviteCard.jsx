import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '@/app/pointsdetail/page.module.less';
import SectionHeader from './SectionHeader';
import DeferredImg from './DeferredImg';
import { getTgInviteLink } from '@/utils/constants';

const InviteCard = ({ pointsData, copyToClipboard, onApplyWithdraw }) => {
  const { t } = useTranslation();
  const inviteLinkFallback = pointsData.inviteLink || getTgInviteLink(pointsData.inviteCode);

  const formatUsdt = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return '0';
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className={styles.inviteCard}>
      <SectionHeader iconSrc="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/invite_icon.svg" iconAlt="Invite" title={t('pointsDetail.inviteRewards')} />

      <div className={styles.inviteRewardTypes}>
        <div className={styles.inviteRewardType}>
          <div className={styles.rewardIconBg}>
            <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/invite_register.png" alt="Register" width={40} height={40} />
          </div>
          <div className={styles.rewardText}>
            <div className={styles.rewardTitle}>{t('pointsDetail.inviteRegister')}</div>
            <div className={styles.rewardValue}>{t('pointsDetail.inviteRegisterReward', { defaultValue: '+250' })}</div>
          </div>
        </div>
        <div className={styles.inviteRewardType}>
          <div className={styles.rewardIconBg}>
            <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/invite_pay.png" alt="Pay" width={40} height={40} />
          </div>
          <div className={styles.rewardText}>
            <div className={styles.rewardTitle}>{t('pointsDetail.invitePay')}</div>
            <div className={styles.rewardValue}>{t('pointsDetail.invitePayReward', { defaultValue: '+3000' })}</div>
          </div>
        </div>
      </div>

      <div className={styles.inviteInputContainer}>
        <div className={styles.inviteInputWrapper}>
          <div className={styles.inviteInputLeft}>
            <span className={styles.inviteInputLabel}>{t('pointsDetail.inviteLink')}</span>
            <div className={styles.inviteLinkText}>{inviteLinkFallback}</div>
          </div>
          <button
            className={styles.copyBtn}
            onClick={() => copyToClipboard(inviteLinkFallback)}
          >
            <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/copy.svg" alt="Copy" width={18} height={18} />
          </button>
        </div>
      </div>

      <div className={styles.inviteInputContainer}>
        <div className={styles.inviteInputWrapper}>
          <div className={styles.inviteInputLeft}>
            <span className={styles.inviteInputLabel}>{t('pointsDetail.inviteCode')}</span>
            <div className={styles.inviteLinkText}>{pointsData.inviteCode || 'MOZI888'}</div>
          </div>
          <button className={styles.copyBtn} onClick={() => copyToClipboard(pointsData.inviteCode || 'MOZI888')}>
            <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/copy.svg" alt="Copy" width={18} height={18} />
          </button>
        </div>
      </div>

      <div className={styles.inviteStatsGrid}>
        <div className={styles.inviteStatBox}>
          <div className={styles.inviteStatValue}>{pointsData.totalInvites || 0}</div>
          <div className={styles.inviteStatLabel}>{t('pointsDetail.shareCount')}</div>
        </div>
        <div className={styles.inviteStatBox}>
          <div className={styles.inviteStatValue2}>{pointsData.earnedPoints || 0}</div>
          <div className={styles.inviteStatLabel}>{t('pointsDetail.totalEarned')}</div>
        </div>
      </div>

      <div className={styles.inviteStatsGrid}>
        <div className={styles.inviteStatBox}>
          <div className={styles.inviteStatValue}>{formatUsdt(pointsData.totalCommission)}</div>
          <div className={styles.inviteStatLabel}>{t('pointsDetail.totalCommission')}</div>
        </div>
        <div className={styles.inviteStatBox}>
          <div className={styles.inviteStatValue2}>{formatUsdt(pointsData.withdrawnAmount)}</div>
          <div className={styles.inviteStatLabel}>{t('pointsDetail.withdrawnAmount')}</div>
        </div>
      </div>

      <div className={styles.inviteStatsGrid}>
        <div className={styles.inviteStatBox}>
          <div className={styles.inviteStatValue}>{formatUsdt(pointsData.withdrawableAmount)}</div>
          <div className={styles.inviteStatLabel}>{t('pointsDetail.withdrawableAmount')}</div>
        </div>
        <div className={`${styles.inviteStatBox} ${styles.inviteStatBoxApply}`}>
          <div className={styles.inviteStatLabel}>{t('pointsDetail.applyTH')}</div>
          <button type="button" className={styles.inviteWithdrawBtn} onClick={() => onApplyWithdraw?.()}>
            {t('pointsDetail.applyWithdrawAction')}
          </button>
        </div>
      </div>

      <div className={styles.inviteRules}>
        <p>{t('pointsDetail.inviteRules.1')}</p>
        <p>{t('pointsDetail.inviteRules.2')}</p>
        <p>{t('pointsDetail.inviteRules.3')}</p>
        <p>{t('pointsDetail.inviteRules.4')}</p>
      </div>
    </div>
  );
};

export default InviteCard;

