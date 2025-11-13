'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SpinLoading } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Loading } from '../Loading';
import { tabBarList } from '../../app/app.config';
import styles from './index.module.less';

const Layout = ({ children, title, isLoading, isError, errMsg, needLogin, loginCallback, bottomPadding = 50, containerMaxHeight, containerHeight }) => {
  const pathname = usePathname();
  const { t } = useTranslation();

  // 底部导航图标映射（与小程序保持一致）
  const iconMap = {
    'home': 'home',           // 首页
    'compass': 'find',        // 发现
    'message': 'community',   // 社区
    'user': 'me'              // 我的
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
        <Loading color="#11B787" tip="" />
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

  const containerStyle = { paddingBottom: `${bottomPadding}px` };
  if (containerMaxHeight) {
    containerStyle.maxHeight = containerMaxHeight;
    containerStyle.overflow = 'hidden';
  }
  if (containerHeight) {
    containerStyle.height = containerHeight;
  }

  return (
    <div className={styles.container} style={containerStyle}>
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
          {tabBarList.map(item => {
            const isActive = pathname === item.path;
            const iconName = iconMap[item.icon] || 'home';
            const iconSrc = `/icons/${iconName}-${isActive ? 'actived' : 'no-actived'}.png`;
            
            return (
              <Link href={item.path} key={item.path} className={styles.tabItem}>
                <div className={`${styles.tabLink} ${isActive ? styles.active : ''}`}>
                  <div className={styles.tabIcon}>
                    <Image 
                      src={iconSrc} 
                      alt={item.name}
                      width={22}
                      height={22}
                      priority
                    />
                  </div>
                  <span className={styles.tabText}>{item.i18nKey ? t(item.i18nKey) : item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Layout;