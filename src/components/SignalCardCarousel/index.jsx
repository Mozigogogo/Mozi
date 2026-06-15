'use client';

import SignalCard from '@/components/SignalCard';
import styles from './index.module.less';

export default function SignalCardCarousel({ cards = [], isPC = false }) {
  if (!cards.length) return null;

  return (
    <div className={styles.carousel} role="list" aria-label="信号卡片列表">
      <div className={styles.track}>
        {cards.map((data, idx) => (
          <div
            key={`${data?.card?.coin || 'signal'}-${idx}`}
            className={styles.cardItem}
            role="listitem"
          >
            <SignalCard data={data} variant="sidebar" embedded isPC={isPC} />
          </div>
        ))}
      </div>
    </div>
  );
}
