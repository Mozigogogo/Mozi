import { SkeletonPage } from '@/components/Skeleton';
import { detailPageSkeletonConfig } from '@/components/Skeleton/configs/detailPageConfig';
import styles from './index.module.less';

/** 币种详情页路由切换 / 首屏加载时的骨架屏 */
export default function DetailPageLoading({
  hideNavSkeleton = false,
  inContent = false,
  /** PC 内容区：与详情白卡片同边距，避免路由切换时空窗 */
  pc = false,
  /** 二次进入：只留白卡片占位，不闪骨架动画 */
  quiet = false,
} = {}) {
  const skeleton = quiet ? null : (
    <SkeletonPage
      config={detailPageSkeletonConfig}
      className={`${styles.pageSkeleton}${inContent || pc ? ` ${styles.pageSkeletonInContent}` : ''}${pc ? ` ${styles.pageSkeletonPc}` : ''}`}
    />
  );

  if (pc) {
    return (
      <div className={styles.pcBootWrap} aria-busy={!quiet} aria-live="polite">
        <div className={`${styles.pcBootCard}${quiet ? ` ${styles.pcBootCardQuiet}` : ''}`}>
          {quiet ? null : (
            <div className={`${styles.shell} ${styles.shellInContent}`}>{skeleton}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.shell}${inContent ? ` ${styles.shellInContent}` : ''}`}>
      {!hideNavSkeleton ? <div className={styles.navSkeleton} aria-hidden /> : null}
      {skeleton}
    </div>
  );
}
