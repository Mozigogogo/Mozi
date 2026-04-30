'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import styles from './AchievementPoolEventCard.module.less';

export default function AchievementPoolEventCard({ mode = 'BOOST', remainingHours = 42 }) {
  const router = useRouter();
  const { t } = useTranslation();
  const currentMode = String(mode || 'BOOST').toUpperCase();
  const isScarce = currentMode === 'SCARCE';
  const isNormal = currentMode === 'NORMAL';
  const isPC = typeof window !== 'undefined' && window.innerWidth >= 1024;

  return (
    <section className={`${styles.card} ${isScarce ? styles.cardScarce : isNormal ? styles.cardNormal : ''}`}>
      {isScarce ? (
        <>
          <div className={styles.titleRow}>
            <span className={styles.dot}>●</span>
            <span className={styles.title}>{t('pointsDetail.poolScarceTitle', { defaultValue: '积分池紧张！' })}</span>
          </div>
          <ul className={styles.list}>
            <li>
              {t('pointsDetail.poolScarceDesc1_part1', { defaultValue: '任务奖励已降至 ' })}
              <span className={styles.highlight}>70折</span>
              {t('pointsDetail.poolScarceDesc1_part2', { defaultValue: ' (基础10积分->现在7积分)' })}
            </li>
            <li>
              {t('pointsDetail.poolScarceDesc2_part1', { defaultValue: '预计 ' })}
              <span className={styles.highlight}>{t('pointsDetail.poolScarceDesc2_highlight', { defaultValue: '7天后' })}</span>
              {t('pointsDetail.poolScarceDesc2_part2', { defaultValue: ' 积分池可能耗尽' })}
            </li>
            <li>{t('pointsDetail.poolScarceDesc3', { defaultValue: '会员用户不受影响，效率保持1.5-2倍' })}</li>
          </ul>
        </>
      ) : isNormal ? (
        <>
          <div className={styles.titleRow}>
            <span className={styles.dot}>●</span>
            <span className={styles.title}>{t('pointsDetail.poolNormalTitle', { defaultValue: '积分小贴士' })}</span>
          </div>
          <div className={styles.normalDesc}>
            {t('pointsDetail.poolNormalDesc', {
              defaultValue: '越早参与，获得越多！会员用户获取效率更高，且不受池子紧张影响。',
            })}
          </div>
        </>
      ) : (
        <>
          <div className={styles.titleRow}>
            <span className={styles.dot}>●</span>
            <span className={styles.title}>
              {t('pointsDetail.poolEventTitle', { defaultValue: 'Weekend points double event !' })}
            </span>
          </div>
          <ul className={styles.list}>
            <li>
              {t('pointsDetail.poolEventDesc1_part1', { defaultValue: 'All task rewards are multiplied by ' })}
              <span className={styles.highlight}>1.5</span>
              {t('pointsDetail.poolEventDesc1_part2', { defaultValue: ' (posting points: 10 points -> 15 points)' })}
            </li>
            <li>
              {t('pointsDetail.poolEventDesc2_part1', { defaultValue: 'Event duration: 48 hours this weekend (' })}
              <span className={styles.highlight}>{remainingHours} hours</span>
              {t('pointsDetail.poolEventDesc2_part2', { defaultValue: ' remaining)' })}
            </li>
            <li>
              {t('pointsDetail.poolEventDesc3', {
                defaultValue: "You have plenty of points, so grab them while you can! Don't miss out!",
              })}
            </li>
          </ul>
        </>
      )}

      <button
        className={styles.upgradeBtn}
        type="button"
        onClick={() => router.push(isPC ? '/subscribe' : '/vip-recharge')}
      >
        <div className={styles.upgradeLeft}>
          <img src="/point/vip.svg" alt="vip" className={styles.crown} />
          <div>
            <div className={styles.upgradeTitle}>
              {t('pointsDetail.poolUpgradeMember', { defaultValue: 'Unlock pro' })}
            </div>
            <div className={styles.upgradeSub}>
              {t('pointsDetail.poolUpgradeMemberSubtitle', { defaultValue: 'no point limits' })}
            </div>
          </div>
        </div>
        <span className={styles.arrow}>›</span>
      </button>
    </section>
  );
}

