'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { trackEvent, HomeEvents } from '@/utils/amplitude';
import { pushWithRouteBootLoading } from '@/utils/routeBootLoading';
import styles from './index.module.less';

/**
 * PC 端：右下角机器人对话入口（简化版，不复用移动端 FloatingRobot 动画/气泡逻辑）
 * - 如果传入 onClick，则优先执行 onClick（适配本页弹窗）
 * - 否则回退为跳转到 targetPath
 */
export default function FloatingRobotPc({ message, targetPath = '/ai', onClick }) {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (onClick || !targetPath || !targetPath.startsWith('/')) return;
    try {
      router.prefetch(targetPath);
    } catch (_) {}
  }, [router, targetPath, onClick]);

  const handleRobotClick = () => {
    trackEvent(HomeEvents.AI_CLICKED, {
      platform: 'pc',
      targetPath: onClick ? null : targetPath,
      robotState: 'pc',
      message: message || undefined,
    });

    if (onClick) {
      onClick();
      return;
    }

    pushWithRouteBootLoading(router, targetPath);
  };

  return (
    <button
      type="button"
      className={styles.floatRobotBtn}
      onClick={handleRobotClick}
      aria-label={t('home.robotBubble') || 'AI机器人'}
    >
      <img
        className={styles.robotIcon}
        src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/robot_ip.svg"
        alt={t('home.robotBubble') || 'AI机器人'}
      />
    </button>
  );
}

