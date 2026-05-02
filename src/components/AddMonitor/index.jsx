'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './index.module.less';

const AddMonitor = ({ symbol, unselectedColor = '#C7C9CD' }) => {
  const router = useRouter();

  const changeOwn = async (e) => {
    e.stopPropagation();
    console.log('🔍 [DEBUG] AddMonitor click, symbol:', symbol);
    router.push(`/addwarn?symbol=${symbol}`);
  };

  return (
    <div className={styles.monitor} onClick={changeOwn}>
      <img 
        src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_home/monitor-bell.svg" 
        alt="monitor"
        width="18"
        height="22"
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default AddMonitor;