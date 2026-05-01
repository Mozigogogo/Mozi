import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClockCircleOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import styles from '@/app/pointsdetail/page.module.less';
import { RightArrowIcon } from '@/components/Icons';
import DeferredImg from './DeferredImg';

const PoolStatusCard = ({ poolStatus, countdown, weekendRemainingHours }) => {
  const router = useRouter();
  const { t } = useTranslation();

  const leftRowRef = useRef(null);
  const rightRowRef = useRef(null);
  const [hideLeftIcon, setHideLeftIcon] = useState(false);
  const [hideRightIcon, setHideRightIcon] = useState(false);

  const updateOverflow = useMemo(() => {
    const isOverflowing = (el) => {
      if (!el) return false;
      return el.scrollWidth > el.clientWidth;
    };
    return () => {
      setHideLeftIcon(isOverflowing(leftRowRef.current));
      setHideRightIcon(isOverflowing(rightRowRef.current));
    };
  }, []);

  useEffect(() => {
    updateOverflow();

    // 监听容器尺寸变化（例如不同机型、字体、数据变化导致的布局变化）
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => updateOverflow()) : null;
    if (ro) {
      if (leftRowRef.current) ro.observe(leftRowRef.current);
      if (rightRowRef.current) ro.observe(rightRowRef.current);
    }

    // 兜底：字体加载或渲染后再次计算
    const t1 = setTimeout(updateOverflow, 0);
    const t2 = setTimeout(updateOverflow, 200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro?.disconnect?.();
    };
  }, [updateOverflow, poolStatus?.totalPool, poolStatus?.remainingMineable, t]);

  return (
    <div className={styles.poolCard}>
      <div className={styles.poolHeader}>
        <div className={styles.poolTitleWrap}>
          <DeferredImg
            className={styles.poolTitleIcon}
            src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pool_status_logo.svg"
            alt=""
            width={22}
            height={22}
          />
          <div className={styles.poolTitleContainer}>
            <span className={styles.poolTitle}>{t('pointsDetail.poolTitleText') || '本月积分池状态'}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              height="5"
              viewBox="0 0 70 5"
              fill="none"
              preserveAspectRatio="none"
              className={styles.poolTitleUnderline}
            >
              <path
                d="M0 2.5C0 1.11929 1.11929 0 2.5 0H67.5C68.8807 0 70 1.11929 70 2.5C70 3.88071 68.8807 5 67.5 5H2.5C1.11929 5 0 3.88071 0 2.5Z"
                fill="#FCCB37"
              />
            </svg>
          </div>
        </div>
        {poolStatus.mode === 'SCARCE' ? (
          <span className={styles.poolTagAlert}>
            <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/warn.svg" alt="" width={14} height={14} />
            {t('pointsDetail.poolScarce') || '紧张'}
          </span>
        ) : (
          <span className={styles.poolTagSufficient}>
            <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/supply_volume.svg" alt="" width={14} height={14} />
            {t('pointsDetail.poolSufficient') || '充足'}
          </span>
        )}
      </div>

      <div className={styles.poolProgressSection}>
        <div className={styles.poolPercentRow}>
          <span
            className={
              poolStatus.mode === 'SCARCE'
                ? styles.poolPercentTextAlert
                : poolStatus.percent === 100
                  ? styles.poolPercentTextFull
                  : styles.poolPercentText
            }
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
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <div className={styles.poolStatsGrid}>
        <div className={styles.poolStatBox}>
          <div className={styles.statLabel}>{t('pointsDetail.poolDistributed') || '已发放'}</div>
          <div className={styles.statValueRow} ref={leftRowRef}>
            <div className={styles.statValue}>{poolStatus.totalPool}</div>
            {!hideLeftIcon && <DeferredImg className={styles.statIcon} src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/gift.svg" alt="" width={28} height={28} />}
          </div>
        </div>
        <div className={styles.poolStatBox}>
          <div className={styles.statLabel}>{t('pointsDetail.poolMineable')}</div>
          <div className={styles.statValueRow} ref={rightRowRef}>
            <div className={styles.statValue}>{poolStatus.remainingMineable}</div>
            {!hideRightIcon && <DeferredImg className={styles.statIcon} src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/balance.svg" alt="" width={28} height={28} />}
          </div>
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
            <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/warn.svg" alt="Alert" className={styles.eventIcon} width={32} height={32} />
            <span className={styles.eventTitleScarce}>{t('pointsDetail.poolScarceTitle') || '积分池紧张！'}</span>
          </div>
          <div className={styles.eventList}>
            <div className={styles.eventItem}>
              <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/star.svg" alt="Star" className={styles.scarceBulletIcon} width={14} height={14} />
              <span>
                {t('pointsDetail.poolScarceDesc1_part1') || '任务奖励已降至 '}
                <span className={styles.highlightRed}>{t('pointsDetail.poolScarceDesc1_highlight') || '70折'}</span>
                {t('pointsDetail.poolScarceDesc1_part2') || ' (基础10积分→现在7积分)'}
              </span>
            </div>
            <div className={styles.eventItem}>
              <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/star.svg" alt="Star" className={styles.scarceBulletIcon} width={14} height={14} />
              <span>
                {t('pointsDetail.poolScarceDesc2_part1') || '预计 '}
                <span className={styles.highlightRed}>{t('pointsDetail.poolScarceDesc2_highlight') || '7天后'}</span>
                {t('pointsDetail.poolScarceDesc2_part2') || ' 积分池可能耗尽'}
              </span>
            </div>
            <div className={styles.eventItem}>
              <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/star.svg" alt="Star" className={styles.scarceBulletIcon} width={14} height={14} />
              <span className={styles.highlightGreen} style={{ color: '#10B981' }}>
                {t('pointsDetail.poolScarceDesc3') || '会员用户不受影响，效率保持1.5-2倍'}
              </span>
            </div>
          </div>
        </div>
      ) : poolStatus.mode === 'NORMAL' ? (
        <div className={styles.poolEventBannerNormal}>
          <div className={styles.eventHeader}>
            <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/gift.svg" alt="Gift" className={styles.eventIcon} width={32} height={32} />
            <span className={styles.tipsTitleNormal}>{t('pointsDetail.poolNormalTitle') || '积分小帖士'}</span>
          </div>
          <div className={styles.tipsContent}>
            <div className={styles.tipsTextNormal}>{t('pointsDetail.poolNormalDesc') || '越早参与，获得越多！会员用户获取效率更高，且不受池子紧张影响。'}</div>
          </div>
        </div>
      ) : (
        <div className={styles.poolEventBannerBoost}>
          <div className={styles.eventHeaderBoost}>
            <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/gift.svg" alt="Gift" className={styles.eventIconBoost} width={30} height={30} />
            <span className={styles.eventTitleBoost}>{t('pointsDetail.poolEventTitle') || '周末积分加倍活动!'}</span>
          </div>
          <div className={styles.eventListBoost}>
            <div className={styles.eventItemBoost}>
              <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/star.svg" alt="Star" className={styles.starIconBoost} width={12} height={12} />
              <span>
                {t('pointsDetail.poolEventDesc1_part1') || '所有任务奖励'}
                <span className={styles.highlightTextBoost}>{t('pointsDetail.poolEventDesc1_highlight') || 'x1.5倍'}</span>
                {t('pointsDetail.poolEventDesc1_part2') || ' (发帖10积分→15积分)'}
              </span>
            </div>
            <div className={styles.eventItemBoost}>
              <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/star.svg" alt="Star" className={styles.starIconBoost} width={12} height={12} />
              <span>
                {t('pointsDetail.poolEventDesc2_part1') || '活动时间：本周末48小时(还剩 '}
                <span className={styles.highlightTextBoost}>
                  {weekendRemainingHours > 0 ? `${weekendRemainingHours}小时` : t('pointsDetail.poolEventDesc2_highlight') || '42小时'}
                </span>
                {t('pointsDetail.poolEventDesc2_part2') || ' )'}
              </span>
            </div>
            <div className={styles.eventItemBoost}>
              <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/star.svg" alt="Star" className={styles.starIconBoost} width={12} height={12} />
              <span>{t('pointsDetail.poolEventDesc3') || '积分充足，抓紧领取，机不可失!'}</span>
            </div>
          </div>
        </div>
      )}

      <button className={styles.upgradeBtn} onClick={() => router.push('/vip-recharge')}>
        <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/vip.svg" alt="Crown" className={styles.crownIcon} width={28} height={28} />
        <div className={styles.upgradeText}>
          <span className={styles.upgradeTitle}>{t('pointsDetail.poolUpgradeMember') || 'Unlock pro'}</span>
          <span className={styles.upgradeSubtitle}>{t('pointsDetail.poolUpgradeMemberSubtitle') || 'no pool limits'}</span>
        </div>
        <RightArrowIcon className={styles.upgradeArrow} size={20} color="#FBDBB5" strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default PoolStatusCard;

