'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getTaskRanking } from '@/api/points';
import styles from './AchievementRankingCard.module.less';

const tabs = ['day', 'month', 'total'];
const rankTypeByTab = { day: 'daily', month: 'monthly', total: 'total' };
const avatarColorPalette = ['#8db8ff', '#f7c748', '#ff8a8a', '#8fe2ff', '#b395ff', '#89e9b8', '#ffae6b', '#ff8bc9'];

const crownByRank = {
  1: '/icons/pc/top1_header.svg',
  2: '/icons/pc/top2_header.svg',
  3: '/icons/pc/top3_header.svg',
};

export default function AchievementRankingCard({ onInviteClick, style, noTopMargin = false }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('day');
  const [rankData, setRankData] = useState({});
  const [currentUserData, setCurrentUserData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadRankData = async () => {
      const apiType = rankTypeByTab[activeTab] || 'total';
      setIsLoading(true);
      try {
        const res = await getTaskRanking(apiType, 50);
        if (cancelled) return;
        if (res?.code !== 0 || !res?.data) {
          setRankData((prev) => ({ ...prev, [activeTab]: [] }));
          setCurrentUserData((prev) => ({ ...prev, [activeTab]: { rank: null, points: 0 } }));
          return;
        }
        const rankings = Array.isArray(res.data.rankings)
          ? res.data.rankings
          : (Array.isArray(res.data) ? res.data : []);
        const mappedList = rankings.map((item, index) => ({
          id: item.userId || index + 1,
          rank: index + 1,
          name: item.nickName || item.nickname || item.userName || t('points.me', { defaultValue: '我' }),
          score: Number(item.points || item.totalPoints || item.dailyPoints || item.monthlyPoints || 0),
          color: avatarColorPalette[index % avatarColorPalette.length],
          isMe: Boolean(item.isCurrentUser),
        }));
        setRankData((prev) => ({ ...prev, [activeTab]: mappedList }));
        setCurrentUserData((prev) => ({
          ...prev,
          [activeTab]: {
            rank: Number(res.data.currentUserRank) || null,
            points: Number(res.data.currentUserPoints) || 0,
          },
        }));
      } catch (error) {
        console.error('Failed to fetch achievement ranking:', error);
        if (!cancelled) {
          setRankData((prev) => ({ ...prev, [activeTab]: [] }));
          setCurrentUserData((prev) => ({ ...prev, [activeTab]: { rank: null, points: 0 } }));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadRankData();
    return () => {
      cancelled = true;
    };
  }, [activeTab, t]);

  const list = useMemo(() => {
    const source = Array.isArray(rankData[activeTab]) ? [...rankData[activeTab]] : [];
    const current = currentUserData[activeTab];
    const hasMe = source.some((item) => item.isMe);
    if (!hasMe && current?.rank) {
      source.push({
        id: `me-${activeTab}`,
        rank: current.rank,
        name: t('points.me', { defaultValue: '我' }),
        score: current.points || 0,
        color: '#2bcf9c',
        isMe: true,
      });
    }
    return source;
  }, [activeTab, currentUserData, rankData, t]);
  const top3 = list.slice(0, 3);
  const tail = list.slice(3);
  const top3Display = [2, 1, 3]
    .map((rank) => top3.find((item) => item.rank === rank))
    .filter(Boolean);

  const tabLabel = (key) => {
    if (key === 'day') return t('pointsDetail.rankDay', { defaultValue: '日榜' });
    if (key === 'month') return t('pointsDetail.rankMonth', { defaultValue: '月榜' });
    return t('pointsDetail.rankTotal', { defaultValue: '总榜' });
  };

  return (
    <section className={`${styles.card} ${noTopMargin ? styles.noTopMargin : ''}`} style={style}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <img src="/icons/pool_status_logo.svg" alt="" className={styles.titleIcon} />
          <h3 className={styles.title}>{t('pointsDetail.rankingListTitle', { defaultValue: 'Ranking List' })}</h3>
          <span className={styles.titleUnderline} />
        </div>
        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabel(tab)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className={styles.stateBox}>{t('common.loading', { defaultValue: 'Loading...' })}</div>
      ) : list.length === 0 ? (
        <div className={styles.stateBox}>{t('common.noData', { defaultValue: '暂无数据' })}</div>
      ) : (
        <>
          <div className={styles.top3Row}>
            {top3Display.map((item) => (
              <div key={item.id || item.rank} className={`${styles.top3Item} ${item.rank === 1 ? styles.top1Item : ''}`}>
                <div className={`${styles.avatarWrap} ${item.rank === 1 ? styles.top1AvatarWrap : ''}`}>
                  <img src={crownByRank[item.rank]} alt="" className={styles.crown} />
                  <div className={`${styles.avatar} ${item.rank === 1 ? styles.top1Avatar : ''}`} style={{ background: item.color }}>
                    {item.name.slice(0, 1)}
                  </div>
                </div>
                <div className={`${styles.name} ${item.rank === 1 ? styles.top1Name : ''}`}>{item.name}</div>
                <div className={`${styles.score} ${item.rank === 1 ? styles.top1Score : styles.topSideScore}`}>
                  <img src="/point/new_coin.svg" alt="" className={styles.scoreCoinIcon} />
                  <span>{item.score}</span>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.list}>
            {tail.map((item) => (
              <div key={item.id || `${item.rank}-${item.name}`} className={`${styles.row} ${item.isMe ? styles.meRow : ''}`}>
                <div className={styles.left}>
                  <span className={styles.rankNo}>{item.rank}</span>
                  <span className={styles.miniAvatar} style={{ background: item.color }}>
                    {item.name.slice(0, 1)}
                  </span>
                  <span className={styles.rowName}>{item.name}</span>
                </div>
                <span className={styles.rowScore}>
                  <img src="/point/new_coin.svg" alt="" className={styles.rowScoreCoinIcon} />
                  <span>{item.score}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <button type="button" className={styles.inviteBtn} onClick={onInviteClick}>
        <img src="/icons/pc/share.svg" alt="" className={styles.inviteIcon} />
        {t('pointsDetail.inviteChallenge', { defaultValue: 'Invite friends to challenge' })}
      </button>
    </section>
  );
}

