'use client';

import {
  EllipsisOutlined,
  HeartFilled,
  MessageOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import styles from './index.module.less';

function NewsItem({ item }) {
  return (
    <div className={styles.item}>
      <div className={styles.avatar} aria-hidden />

      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.account}>{item.account}</span>
          <span className={styles.badge}>{item.tag}</span>
        </div>
        <div className={styles.time}>{item.time}</div>
        <div className={styles.newsTitle}>{item.title}</div>
        <div className={styles.desc}>{item.desc}</div>
        <div className={styles.actions}>
          <span className={styles.actionLike}>
            <HeartFilled />
            {item.likeCount}
          </span>
          <span className={styles.action}>
            <MessageOutlined />
            {item.commentCount}
          </span>
          <span className={styles.action}>
            <ShareAltOutlined />
            {item.shareCount}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PCFlashNewsCard({ items = [] }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <span className={styles.dot} />
          <span className={styles.headerTitle}>24H快讯</span>
        </div>

        <div className={styles.tools}>
          <button type="button" className={styles.iconBtn} aria-label="refresh">
            <ReloadOutlined />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="more">
            <EllipsisOutlined />
          </button>
        </div>
      </div>

      <div className={styles.list}>
        {items.map((item) => (
          <NewsItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
