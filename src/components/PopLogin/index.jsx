'use client';

import React, { useState } from 'react';
import LoginModal from '../LoginModal';
import PCAuthModal from '../PCAuthModal';
import styles from './index.module.less';
import { useTranslation } from 'react-i18next';

export default function PopLogin({ visible = false, onClose, onLoginSuccess }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPCAuthModal, setShowPCAuthModal] = useState(false);
  const { t } = useTranslation();

  if (!visible) return null;

  const isPC = typeof window !== 'undefined' && window.innerWidth >= 1024;

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
          <div className={styles.loginTitle}>{t('auth.notLoggedIn')}</div>
          <div
            className={styles.loginBtn}
            onClick={() => (isPC ? setShowPCAuthModal(true) : setShowLoginModal(true))}
          >
            {t('auth.loginRegister')}
          </div>
        </div>
      </div>

      {!isPC && (
        <LoginModal
          visible={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false);
            onLoginSuccess?.();
            onClose?.();
          }}
          initialMode="login"
        />
      )}

      {isPC && (
        <PCAuthModal
          open={showPCAuthModal}
          onClose={() => setShowPCAuthModal(false)}
          onSuccess={() => {
            setShowPCAuthModal(false);
            onLoginSuccess?.();
            onClose?.();
          }}
          initialMode="select"
        />
      )}
    </>
  );
}