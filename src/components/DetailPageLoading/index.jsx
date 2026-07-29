import { SkeletonPage } from '@/components/Skeleton';
import { detailPageSkeletonConfig } from '@/components/Skeleton/configs/detailPageConfig';
import styles from './index.module.less';

/** 币种详情页路由切换 / 首屏加载时的骨架屏 */
export default function DetailPageLoading({ hideNavSkeleton = false, inContent = false } = {}) {
  return (
    <div className={`${styles.shell}${inContent ? ` ${styles.shellInContent}` : ''}`}>
      {!hideNavSkeleton ? <div className={styles.navSkeleton} aria-hidden /> : null}
      <SkeletonPage
        config={detailPageSkeletonConfig}
        className={`${styles.pageSkeleton}${inContent ? ` ${styles.pageSkeletonInContent}` : ''}`}
      />
    </div>
  );
}
