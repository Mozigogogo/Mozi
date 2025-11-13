'use client';

import React, { useState } from 'react';
import LoginModal from '../LoginModal';
import styles from './index.module.less';

export default function PopLogin({ visible = false, onClose, onLoginSuccess }) {
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (!visible) return null;

  const handleMaskClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <>
      <div className={styles.popupWrap} onClick={handleMaskClick}>
        <div className={styles.loginContainer} onClick={(e) => e.stopPropagation()}>
          <img
            className={styles.loginWarnIcon}
            src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/login_warn.png'}
            alt={'login-warn'}
          />
          <div className={styles.loginTitle}>您还未登录</div>
          <div className={styles.loginBtn} onClick={() => setShowLoginModal(true)}>登录/注册</div>
        </div>
      </div>

      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          onLoginSuccess?.();
          onClose?.();
        }}
        initialMode='login'
      />
    </>
  );
}