import { SkeletonPage } from '@/components/Skeleton';
import { detailPageSkeletonConfig } from '@/components/Skeleton/configs/detailPageConfig';
import styles from './index.module.less';

/** 币种详情页路由切换 / 首屏加载时的骨架屏 */
export default function DetailPageLoading() {
  return (
    <div className={styles.shell}>
      <div className={styles.navSkeleton} aria-hidden />
      <SkeletonPage config={detailPageSkeletonConfig} className={styles.pageSkeleton} />
    </div>
  );
}
