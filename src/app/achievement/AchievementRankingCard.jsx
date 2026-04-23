'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './AchievementRankingCard.module.less';

const tabs = ['day', 'month', 'total'];

const rankMock = {
  day: [
    { rank: 1, name: '李四', score: 1980, color: '#8db8ff' },
    { rank: 2, name: '张三', score: 2000, color: '#f7c748' },
    { rank: 3, name: '王五', score: 1950, color: '#ff8a8a' },
    { rank: 4, name: '赵六', score: 1900, color: '#8fe2ff' },
    { rank: 5, name: '陈七', score: 1860, color: '#b395ff' },
    { rank: 6, name: '林八', score: 1800, color: '#89e9b8' },
    { rank: 7, name: '吴九', score: 1740, color: '#ffae6b' },
    { rank: 8, name: '郑十', score: 1680, color: '#ff8bc9' },
    { rank: 9, name: '我', score: 2000, color: '#2bcf9c', isMe: true },
  ],
  month: [
    { rank: 1, name: '张三', score: 6200, color: '#f7c748' },
    { rank: 2, name: '王五', score: 5980, color: '#8db8ff' },
    { rank: 3, name: '李四', score: 5800, color: '#ff8a8a' },
    { rank: 4, name: '赵六', score: 5500, color: '#8fe2ff' },
    { rank: 5, name: '我', score: 5260, color: '#2bcf9c', isMe: true },
  ],
  total: [
    { rank: 1, name: '张三', score: 15200, color: '#f7c748' },
    { rank: 2, name: '李四', score: 14980, color: '#8db8ff' },
    { rank: 3, name: '王五', score: 14550, color: '#ff8a8a' },
    { rank: 4, name: '赵六', score: 13200, color: '#8fe2ff' },
    { rank: 9, name: '我', score: 10200, color: '#2bcf9c', isMe: true },
  ],
};

const crownByRank = {
  1: '👑',
  2: '♕',
  3: '♛',
};

export default function AchievementRankingCard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('total');

  const list = useMemo(() => rankMock[activeTab] || [], [activeTab]);
  const top3 = list.filter((x) => x.rank <= 3).sort((a, b) => a.rank - b.rank);
  const tail = list.filter((x) => x.rank > 3).sort((a, b) => a.rank - b.rank);

  const tabLabel = (key) => {
    if (key === 'day') return t('pointsDetail.rankDay', { defaultValue: '日榜' });
    if (key === 'month') return t('pointsDetail.rankMonth', { defaultValue: '月榜' });
    return t('pointsDetail.rankTotal', { defaultValue: '总榜' });
  };

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <img src="/icons/pool_status_logo.svg" alt="" className={styles.titleIcon} />
          <h3 className={styles.title}>Ranking List</h3>
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

      <div className={styles.top3Row}>
        {top3.map((item) => (
          <div key={item.rank} className={styles.top3Item}>
            <div className={styles.crown}>{crownByRank[item.rank]}</div>
            <div className={styles.avatar} style={{ background: item.color }}>
              {item.name.slice(0, 1)}
            </div>
            <div className={styles.name}>{item.name}</div>
            <div className={styles.score}>🪙 {item.score}</div>
          </div>
        ))}
      </div>

      <div className={styles.list}>
        {tail.map((item) => (
          <div key={`${item.rank}-${item.name}`} className={`${styles.row} ${item.isMe ? styles.meRow : ''}`}>
            <div className={styles.left}>
              <span className={styles.rankNo}>{item.rank}</span>
              <span className={styles.miniAvatar} style={{ background: item.color }}>
                {item.name.slice(0, 1)}
              </span>
              <span className={styles.rowName}>{item.name}</span>
            </div>
            <span className={styles.rowScore}>🪙 {item.score}</span>
          </div>
        ))}
      </div>

      <button type="button" className={styles.inviteBtn}>
        <span className={styles.inviteIcon}>↻</span>
        {t('pointsDetail.inviteFriendsNow', { defaultValue: '邀请朋友来挑战吧' })}
      </button>
    </section>
  );
}

