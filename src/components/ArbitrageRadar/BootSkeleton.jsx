'use client';

import { LogoLoading } from '@/components/Loading';
import { ROUTE_BOOT_LOGO } from '@/utils/routeBootLoading';
import styles from './boot-skeleton.module.less';

/** 套利雷达 chunk / mount 前：内容区 LogoLoading */
export default function ArbitrageBootSkeleton() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-label="loading">
      <LogoLoading visible image={ROUTE_BOOT_LOGO} size={72} />
    </div>
  );
}
