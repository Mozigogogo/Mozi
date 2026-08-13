'use client';

import { Tooltip } from 'antd';
import { Popover } from 'antd-mobile';

import styles from './index.module.less';

export default function IndicatorInfoTip({ content, isPC = false, iconSrc, alt = 'info' }) {
  const icon = <img className={styles.infoIcon} src={iconSrc} alt={alt} />;

  if (isPC) {
    return (
      <Tooltip
        title={content}
        placement="bottom"
        color="#fff"
        overlayInnerStyle={{ padding: 0, color: '#333' }}
        mouseEnterDelay={0.15}
        mouseLeaveDelay={0.08}
      >
        <span className={styles.infoIconWrap}>{icon}</span>
      </Tooltip>
    );
  }

  return (
    <Popover content={content} trigger="click" placement="bottom">
      {icon}
    </Popover>
  );
}
