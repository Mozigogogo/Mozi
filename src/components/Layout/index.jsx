'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SpinLoading } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { tabBarList } from '../../app/app.config';
import styles from './index.module.less';

const Layout = ({ children, title, isLoading, isError, errMsg, needLogin, loginCallback }) => {
  const pathname = usePathname();
  const { t } = useTranslation();

  // 底部导航图标映射
  const iconMap = {
    'home': '📊',
    'compass': '🔍',
    'message': '🏠',
    'user': '👤'
  };

  // 判断当前路径是否为主页面之一
  const isMainPage = tabBarList.some(item => item.path === pathname);

  if (isError) {
    return (
      <div className={styles.errorBox}>
        <div className={styles.errorIcon}>❌</div>
        <div className={styles.errorMsg}>{errMsg || t('common.error')}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loadingBox}>
        <SpinLoading color="primary" />
      </div>
    );
  }

  if (needLogin) {
    return (
      <div className={styles.loginBox}>
        <div>{t('user.pleaseLogin')}</div>
        <button className={styles.loginBtn} onClick={loginCallback}>{t('user.loginRegister')}</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {title && (
        <div className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
        </div>
      )}
      <main className={styles.content}>
        {children}
      </main>
      
      {isMainPage && (
        <div className={styles.tabBar}>
          {tabBarList.map(item => (
            <Link href={item.path} key={item.path} className={styles.tabItem}>
              <div className={`${styles.tabLink} ${pathname === item.path ? styles.active : ''}`}>
                <span className={styles.tabIcon}>{iconMap[item.icon] || '📱'}</span>
                <span>{item.i18nKey ? t(item.i18nKey) : item.name}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Layout;