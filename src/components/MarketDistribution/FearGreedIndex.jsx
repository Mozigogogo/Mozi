/**
 * 恐慌贪婪指数组件
 */
'use client';

import styles from './index.module.less';

const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';
const warnIcon = `${CDN_PREFIX}/icon/warn.png`;

export default function FearGreedIndex({ 
  index = 0, 
  category = '加载中...', 
  onClick 
}) {
  return (
    <div className={styles.indicatorItem}>
      <div className={styles.indicatorHeader}>
        <span className={styles.indicatorTitle}>恐慌贪婪指数</span>
        <img className={styles.infoIcon} src={warnIcon} alt="info" />
      </div>
      <div className={styles.fearGreedContainer}>
        <div className={styles.fearGreedChart}>
          <div 
            className={styles.fearGreedSemicircle}
            onClick={onClick}
          >
            <div className={styles.fearGreedInner}>
              <div className={styles.fearGreedValue}>{index}</div>
              <div className={styles.fearGreedText}>{category}</div>
            </div>
            <div 
              className={styles.fearGreedBall}
              style={{
                transform: `translateX(-50%) rotate(${-90 + (index / 100) * 180}deg)`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

