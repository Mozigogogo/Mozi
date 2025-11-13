'use client';

import React from 'react';
import { Button } from 'antd-mobile';
import { ExclamationCircleFill } from 'antd-mobile-icons';
import { COMMON_MSG } from '../../utils/constants';
import styles from './index.module.less';

const Error = ({ errMsg, onRefresh, isRefresh = false }) => {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className={styles.errorBox}>
      <ExclamationCircleFill fontSize={80} color='#e74c3c' />
      <div className={styles.errorText}>{errMsg || COMMON_MSG}</div>
      {isRefresh && (
        <Button 
          className={styles.errorBtn} 
          onClick={handleRefresh}
          color='primary'
        >
          刷新
        </Button>
      )}
    </div>
  );
};

export default Error;