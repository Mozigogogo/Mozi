'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { BellOutline } from 'antd-mobile-icons';
import styles from './index.module.css';

const AddMonitor = ({ symbol }) => {
  const router = useRouter();

  const changeOwn = async (e) => {
    e.stopPropagation();
    router.push(`/addwarn?symbol=${symbol}`);
  };

  return (
    <div className={styles.monitor} onClick={changeOwn}>
      <BellOutline fontSize={20} />
    </div>
  );
};

export default AddMonitor;