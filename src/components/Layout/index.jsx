'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SpinLoading } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Loading } from '../Loading';
import { tabBarList } from '../../app/app.config';
import styles from './index.module.less';

function isHomePath(pathname) {
  return pathname === '/' || pathname === '/home';
}

const Layout = ({ children, title, isLoading, isError, errMsg, needLogin, loginCallback, bottomPadding = 50, containerMaxHeight, containerHeight, loadingTop }) => {
  const pathname = usePathname();
  const { t } = useTranslation();

  // 底部导航图标映射（与小程序保持一致）
  const iconMap = {
    'home': 'home',           // 首页
    'compass': 'find',        // 发现
    'message': 'community',   // 社区
    'user': 'me'              // 我的
  };

  // `/home` 是 TG 首页别名，底部 TabBar 需要把它视为首页。
  const isMainPage = tabBarList.some((item) => {
    if (item.path === '/') return isHomePath(pathname);
    return item.path === pathname;
  });

  // 预热底部导航图标到浏览器缓存，减少首次切页图标延迟
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const iconNames = Object.values(iconMap);
    iconNames.forEach((name) => {
      const activeImg = new window.Image();
      activeImg.src = `/icons/${name}-actived.png`;
      const normalImg = new window.Image();
      normalImg.src = `/icons/${name}-no-actived.png`;
    });
  }, []);

  if (isError) {
    return (
      <div className={styles.errorBox}>
        <div className={styles.errorIcon}>❌</div>
        <div className={styles.errorMsg}>{errMsg || t('common.error')}</div>
      </div>
    );
  }

  if (isLoading) {
    const loadingStyle = loadingTop ? {
      alignItems: 'flex-start',
      paddingTop: `${loadingTop}px`,
      height: 'auto',
      minHeight: '80vh'
    } : {};
    
    return (
      <div className={styles.loadingBox} style={loadingStyle}>
        <Loading color="#11B787" />
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
            const isActive = item.path === '/' ? isHomePath(pathname) : pathname === item.path;
            const iconName = iconMap[item.icon] || 'home';
            const iconSrc = `/icons/${iconName}-${isActive ? 'actived' : 'no-actived'}.png`;
            const href =
              item.path === '/' && isHomePath(pathname)
                ? '/home'
                : item.path;
            
            return (
              <Link href={href} key={item.path} className={styles.tabItem}>
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