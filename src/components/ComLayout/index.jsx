'use client';

import React from 'react';
import { SpinLoading } from 'antd-mobile';
import styles from './index.module.less';

const ComLayout = ({ isLoading, children }) => {
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <SpinLoading color='primary' />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {children}
    </div>
  );
};

export default ComLayout;