'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';
import AiRobotButtonSvg from '@/components/AiRobotButtonSvg';

/**
 * 胶囊升级按钮：直接使用 `public/images/ai_robot/button.svg` 作为视觉背景。
 * （为了避免 svg 内置图形与 HTML 文案/图标重复，这里不再渲染单独的 icon/text。）
 */
export default function AiRobotUpgradePillButton({
  onClick,
  disabled = false,
  className,
  children,
  label,
  // 兼容旧用法：背景 svg 已包含图形，这些 props 将不再用于渲染
  iconSrc: _iconSrc,
  iconAlt: _iconAlt,
  ariaLabel,
  type = 'button',
  iconWidth: _iconWidth,
  iconHeight: _iconHeight,
}) {
  const text = children ?? label ?? '';
  const { i18n } = useTranslation();
  const isEnglish =
    i18n?.language?.toLowerCase().startsWith('en') ||
    (typeof window !== 'undefined' &&
      (localStorage.getItem('i18nextLng') || '').toLowerCase().startsWith('en'));

  const backgroundSrc = isEnglish
    ? 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/button_en.svg'
    : 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/button.svg';

  return (
    <button
      type={type}
      className={`${styles.button} ${disabled ? styles.disabled : ''} ${className || ''}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={ariaLabel || (typeof text === 'string' ? text : 'upgrade')}
    >
      <AiRobotButtonSvg className={styles.background} src={backgroundSrc} />
      <span className={styles.srOnly}>{text}</span>
    </button>
  );
}

