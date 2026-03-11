import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../page.module.less';
import SectionHeader from './SectionHeader';

const InviteCard = ({ pointsData, copyToClipboard }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.inviteCard}>
      <SectionHeader iconSrc="/point/invite_icon.svg" iconAlt="Invite" title={t('pointsDetail.inviteRewards')} />
      
      <div className={styles.inviteRewardTypes}>
        <div className={styles.inviteRewardType}>
          <div className={styles.rewardIconBg}>
            <img src="/point/invite_register.png" alt="Register" />
          </div>
          <div className={styles.rewardText}>
            <div className={styles.rewardTitle}>{t('pointsDetail.inviteRegister')}</div>
            <div className={styles.rewardValue}>+250</div>
          </div>
        </div>
        <div className={styles.inviteRewardType}>
          <div className={styles.rewardIconBg}>
            <img src="/point/invite_pay.png" alt="Pay" />
          </div>
          <div className={styles.rewardText}>
            <div className={styles.rewardTitle}>{t('pointsDetail.invitePay')}</div>
            <div className={styles.rewardValue}>+500</div>
          </div>
        </div>
      </div>

      <div className={styles.inviteInputContainer}>
        <span className={styles.inviteInputLabel}>{t('pointsDetail.inviteLink')}</span>
        <div className={styles.inviteInputWrapper}>
          <div className={styles.inviteLinkText}>{pointsData.inviteLink || `https://t.me/MoziBot?start=${pointsData.inviteCode}`}</div>
          <button className={styles.copyBtn} onClick={() => copyToClipboard(pointsData.inviteLink || `https://t.me/MoziBot?start=${pointsData.inviteCode}`)}>
            <img src="/point/copy.svg" alt="Copy" />
          </button>
        </div>
      </div>

      <div className={styles.inviteInputContainer}>
        <span className={styles.inviteInputLabel}>{t('pointsDetail.inviteCode')}</span>
        <div className={styles.inviteInputWrapper}>
          <div className={styles.inviteLinkText}>{pointsData.inviteCode || 'MOZI888'}</div>
          <button className={styles.copyBtn} onClick={() => copyToClipboard(pointsData.inviteCode || 'MOZI888')}>
            <img src="/point/copy.svg" alt="Copy" />
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
