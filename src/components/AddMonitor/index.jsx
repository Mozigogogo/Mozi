'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './index.module.less';

const AddMonitor = ({ symbol, unselectedColor = '#C7C9CD' }) => {
  const router = useRouter();

  const changeOwn = async (e) => {
    e.stopPropagation();
    router.push(`/addwarn?symbol=${symbol}`);
  };

  return (
    <div className={styles.monitor} onClick={changeOwn}>
      <svg 
        viewBox="0 0 1024 1024" 
        width="20" 
        height="20" 
        fill={unselectedColor}
      >
        <path d="M816 768h-24V428c0-141.6-93.6-261.6-224-303.2V96c0-19.2-16-32-32-32h-64c-19.2 0-32 12.8-32 32v28.8C310.4 166.4 216 286.4 216 428v340h-24c-19.2 0-32 12.8-32 32v64c0 19.2 12.8 32 32 32h624c19.2 0 32-12.8 32-32v-64c0-19.2-12.8-32-32-32zM512 960c51.2 0 96-44.8 96-96H416c0 51.2 44.8 96 96 96z"></path>
      </svg>
    </div>
  );
};

export default AddMonitor;