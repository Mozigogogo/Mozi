'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { Button } from 'antd-mobile';
import styles from './page.module.css';

export default function TgWebAppPage() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  // 初始化 Telegram WebApp（脚本加载完成后执行）
  const initTelegram = () => {
    const tg = window?.Telegram?.WebApp;
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      setTheme(tg.colorScheme || 'light');
      setUser(tg.initDataUnsafe?.user || null);
      setReady(true);
      // 主题变化监听
      tg.onEvent('themeChanged', () => setTheme(tg.colorScheme));
    } catch {}
  };

  useEffect(() => {
    // 如果脚本已经存在，直接初始化
    if (window?.Telegram?.WebApp) initTelegram();
  }, []);

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div className={`${styles.container} ${theme === 'dark' ? styles.dark : ''}`}>
      {/* Telegram WebApp SDK */}
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={initTelegram}
      />

      <div className={styles.card}>
        <div className={styles.title}>Mozi Telegram WebApp</div>
        <div className={styles.subtitle}>{ready ? '已连接 Telegram 环境' : '正在初始化...'}</div>

        <div className={styles.block}>
          <div className={styles.blockTitle}>用户信息</div>
          {user ? (
            <ul className={styles.list}>
              <li>ID：{user.id}</li>
              <li>用户名：{user.username || '—'}</li>
              <li>昵称：{[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}</li>
              <li>语言：{user.language_code || '—'}</li>
            </ul>
          ) : (
            <div className={styles.tip}>未获取到用户信息（可能未在 Telegram 环境或权限未开放）</div>
          )}
        </div>

        <div className={styles.actions}>
          <Button color='primary' block onClick={goHome}>
            进入应用首页
          </Button>
        </div>
      </div>
    </div>
  );
}


