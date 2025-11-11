'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { Button, Toast } from 'antd-mobile';
import styles from './page.module.less';

export default function TgWebAppPage() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const searchParams = useSearchParams();
  const symbol = searchParams.get('symbol') || '';

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

  // 绑定用户信息与 chatId，并在 3 秒后跳回 addwarn 页面
  const bindAndRedirect = async () => {
    try {
      if (!user?.id) {
        Toast.show({ content: '未获取到 Telegram 用户信息' });
        return;
      }
      // 本地绑定（供后续页面使用）
      try {
        localStorage.setItem('tgChatId', String(user.id));
        localStorage.setItem('tgUser', JSON.stringify({
          id: user.id,
          username: user.username || '',
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          language_code: user.language_code || '',
        }));
        localStorage.setItem('tgBindAt', String(Date.now()));
      } catch {}

      Toast.show({ content: '绑定成功，3秒后返回配置告警' });
      setTimeout(() => {
        const href = `/addwarn${symbol ? `?symbol=${encodeURIComponent(symbol)}` : ''}`;
        window.location.href = href;
      }, 3000);
    } catch (error) {
      console.error('绑定过程错误:', error);
      Toast.show({ content: '绑定失败，请稍后重试' });
    }
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
          <Button style={{ marginTop: 12 }} block onClick={bindAndRedirect}>
            绑定并继续配置
          </Button>
        </div>
      </div>
    </div>
  );
}


