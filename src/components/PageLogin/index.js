'use client';

import React, { useState } from 'react';
import { Modal, Button, Toast } from 'antd-mobile';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
// import styles from './index.module.css';

export const PageLogin = ({ show = false, hideCb, onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      // H5 环境下的登录逻辑
      // 这里可以根据实际需求实现登录功能
      // 比如跳转到登录页面或显示登录表单
      
      // 模拟登录成功
      localStorage.setItem('token', 'mock_token');
      Toast.show({
        content: '登录成功',
        duration: 2000,
      });
      
      // 调用登录成功回调
      onLoginSuccess && onLoginSuccess();
      hideCb && hideCb();
    } catch (error) {
      console.error('登录失败:', error);
      Toast.show({
        content: '登录失败',
        duration: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    hideCb && hideCb();
  };

  return (
    <Modal
      visible={show}
      content={
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>您还未登录</div>
          <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>登录后可享受更多功能</div>
        </div>
      }
      actions={[
        {
          key: 'cancel',
          text: '取消',
          onClick: handleCancel,
        },
        {
          key: 'login',
          text: '登录/注册',
          primary: true,
          loading: loading,
          onClick: handleLogin,
        },
      ]}
      onClose={handleCancel}
    />
  );
};

export default PageLogin;