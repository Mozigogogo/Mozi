import React from 'react';
import { useRouter } from 'next/navigation';
import { ClockCircleOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import styles from '@/app/pointsdetail/page.module.less';

const PoolStatusCard = ({ poolStatus, countdown, weekendRemainingHours }) => {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className={styles.poolCard}>
      <div className={styles.poolHeader}>
        <span className={styles.poolTitle}>{t('pointsDetail.poolTitleText') || '本月积分池状态'}</span>
        {poolStatus.mode === 'SCARCE' ? (
          <span className={styles.poolTagAlert}>
            <img src="/point/warn.svg" alt="" />
            {t('pointsDetail.poolScarce') || '紧张'}
          </span>
        ) : (
          <span className={styles.poolTagSufficient}>
            <img src="/point/supply_volume.svg" alt="" />
            {t('pointsDetail.poolSufficient') || '充足'}
          </span>
        )}
      </div>

      <div className={styles.poolProgressSection}>
        <div className={styles.poolPercentRow}>
          <span
            className={poolStatus.mode === 'SCARCE' ? styles.poolPercentTextAlert : styles.poolPercentText}
            style={
              poolStatus.mode === 'SCARCE'
                ? {
                    background: 'linear-gradient(90deg, #FD8D38 0%, #FC3B43 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent'
                  }
                : {}
            }
          >
            {poolStatus.percent}%
          </span>
          <span className={styles.poolRemainingLabel}>{t('pointsDetail.poolRemaining') || '剩余积分'}</span>
        </div>
        <div className={styles.poolProgressBarContainer}>
          <div className={styles.poolProgressBar}>
            <div
              className={`${styles.poolProgressFill} ${
                poolStatus.mode === 'SCARCE'
                  ? styles.fillAlert
                  : poolStatus.percent > 30
                    ? styles.fillNormal
                    : styles.fillAlert
              }`}
              style={{
                width: `${poolStatus.percent}%`,
                background: poolStatus.mode === 'SCARCE' ? 'linear-gradient(90deg, #FD8D38 0%, #FC3B43 100%)' : undefined
              }}
            ></div>
            {poolStatus.mode !== 'SCARCE' && poolStatus.percent > 30 && <div className={styles.separators}></div>}
          </div>
          <div className={styles.poolProgressScales}>
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <div className={styles.poolStatsGrid}>
        <div className={styles.poolStatBox}>
          <div className={styles.statLabel}>{t('pointsDetail.poolDistributed') || '已发放'}</div>
          <div className={styles.statValue}>{poolStatus.totalPool}</div>
        </div>
        <div className={styles.poolStatBox}>
          <div className={styles.statLabel}>{t('pointsDetail.poolMineable')}</div>
          <div className={styles.statValue}>{poolStatus.remainingMineable}</div>
        </div>
      </div>

      <div className={styles.poolCountdownSection}>
        <div className={styles.countdownHeader}>
          <ClockCircleOutline className={styles.clockIcon} />
          <span>{t('pointsDetail.poolResetCountdown') || '距离下月重置'}</span>
        </div>
        <div className={styles.countdownBoxes}>
          <div className={styles.countdownItem}>
            <div
              className={poolStatus.mode === 'SCARCE' ? styles.countdownBoxAlert : styles.countdownBox}
              style={{ background: poolStatus.mode === 'SCARCE' ? 'linear-gradient(90deg, #FD8D38 0%, #FC3B43 100%)' : undefined }}
            >
              {countdown.days}
            </div>
            <div className={styles.countdownLabel}>{t('pointsDetail.poolDays') || '天'}</div>
          </div>
          <div className={styles.countdownSeparator}>:</div>
          <div className={styles.countdownItem}>
            <div
              className={poolStatus.mode === 'SCARCE' ? styles.countdownBoxAlert : styles.countdownBox}
              style={{ background: poolStatus.mode === 'SCARCE' ? 'linear-gradient(90deg, #FD8D38 0%, #FC3B43 100%)' : undefined }}
            >
              {countdown.hours.toString().padStart(2, '0')}
            </div>
            <div className={styles.countdownLabel}>{t('pointsDetail.poolHours') || '时'}</div>
          </div>
          <div className={styles.countdownSeparator}>:</div>
          <div className={styles.countdownItem}>
            <div
              className={poolStatus.mode === 'SCARCE' ? styles.countdownBoxAlert : styles.countdownBox}
              style={{ background: poolStatus.mode === 'SCARCE' ? 'linear-gradient(90deg, #FD8D38 0%, #FC3B43 100%)' : undefined }}
            >
              {countdown.minutes.toString().padStart(2, '0')}
            </div>
            <div className={styles.countdownLabel}>{t('pointsDetail.poolMinutes') || '分'}</div>
          </div>
        </div>
      </div>

      {poolStatus.mode === 'SCARCE' ? (
        <div className={styles.poolEventBannerScarce}>
          <div className={styles.eventHeader}>
            <img src="/point/warn.svg" alt="Alert" className={styles.eventIcon} />
            <span className={styles.eventTitleScarce}>{t('pointsDetail.poolScarceTitle') || '积分池紧张！'}</span>
          </div>
          <div className={styles.eventList}>
            <div className={styles.eventItem}>
              <img src="/point/dot.svg" alt="Dot" className={styles.dotIcon} />
              <span>
                {t('pointsDetail.poolScarceDesc1_part1') || '任务奖励已降至 '}
                <span className={styles.highlightRed}>{t('pointsDetail.poolScarceDesc1_highlight') || '70折'}</span>
                {t('pointsDetail.poolScarceDesc1_part2') || ' (基础10积分→现在7积分)'}
              </span>
            </div>
            <div className={styles.eventItem}>
              <img src="/point/dot.svg" alt="Dot" className={styles.dotIcon} />
              <span>
                {t('pointsDetail.poolScarceDesc2_part1') || '预计 '}
                <span className={styles.highlightRed}>{t('pointsDetail.poolScarceDesc2_highlight') || '7天后'}</span>
                {t('pointsDetail.poolScarceDesc2_part2') || ' 积分池可能耗尽'}
              </span>
            </div>
            <div className={styles.eventItem}>
              <img src="/point/bingo.svg" alt="Bingo" className={styles.starIcon} />
              <span className={styles.highlightGreen} style={{ color: '#10B981' }}>
                {t('pointsDetail.poolScarceDesc3') || '会员用户不受影响，效率保持1.5-2倍'}
              </span>
            </div>
          </div>
        </div>
      ) : poolStatus.mode === 'NORMAL' ? (
        <div className={styles.poolEventBanner}>
          <div className={styles.eventHeader}>
            <img src="/point/gift.svg" alt="Gift" className={styles.eventIcon} />
            <span className={styles.tipsTitle}>{t('pointsDetail.poolNormalTitle') || '积分小帖士'}</span>
          </div>
          <div className={styles.tipsContent}>
            <div className={styles.tipsText}>{t('pointsDetail.poolNormalDesc') || '越早参与，获得越多！会员用户获取效率更高，且不受池子紧张影响。'}</div>
          </div>
        </div>
      ) : (
        <div className={styles.poolEventBanner}>
          <div className={styles.eventHeader}>
            <img src="/point/gift.svg" alt="Gift" className={styles.eventIcon} />
            <span className={styles.eventTitle}>{t('pointsDetail.poolEventTitle') || '周末积分加倍活动!'}</span>
            <span className={styles.eventTag}>HOT</span>
          </div>
          <div className={styles.eventList}>
            <div className={styles.eventItem}>
              <img src="/point/star.svg" alt="Star" className={styles.starIcon} />
              <span>
                {t('pointsDetail.poolEventDesc1_part1') || '所有任务奖励'}
                <span className={styles.highlightText}>{t('pointsDetail.poolEventDesc1_highlight') || 'x1.5倍'}</span>
                {t('pointsDetail.poolEventDesc1_part2') || ' (发帖10积分→15积分)'}
              </span>
            </div>
            <div className={styles.eventItem}>
              <img src="/point/star.svg" alt="Star" className={styles.starIcon} />
              <span>
                {t('pointsDetail.poolEventDesc2_part1') || '活动时间：本周末48小时(还剩 '}
                <span className={styles.highlightText}>
                  {weekendRemainingHours > 0 ? `${weekendRemainingHours}小时` : t('pointsDetail.poolEventDesc2_highlight') || '42小时'}
                </span>
                {t('pointsDetail.poolEventDesc2_part2') || ' )'}
              </span>
            </div>
            <div className={styles.eventItem}>
              <img src="/point/star.svg" alt="Star" className={styles.starIcon} />
              <span>{t('pointsDetail.poolEventDesc3') || '积分充足，抓紧领取，机不可失!'}</span>
            </div>
          </div>
        </div>
      )}

      <button className={styles.upgradeBtn} onClick={() => router.push('/vip-recharge')}>
        <img src="/point/vip.svg" alt="Crown" className={styles.crownIcon} />
        {t('pointsDetail.poolUpgradeMember') || '升级会员'}
      </button>
    </div>
  );
};

export default PoolStatusCard;

