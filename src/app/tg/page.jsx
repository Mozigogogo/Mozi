'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { Button, Toast } from 'antd-mobile';
import styles from './page.module.less';

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

  // 绑定并测试推送：通过内部 API 发送一条消息到当前用户
  const sendTestMessage = async () => {
    try {
      if (!user?.id) {
        Toast.show({ content: '未获取到 Telegram 用户信息' });
        return;
      }
      const res = await fetch('/api/tg/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: user.id,
          text: `✅ 绑定成功\nID: ${user.id}\n用户名: ${user.username || ''}`,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        Toast.show({ content: '已发送测试消息，请在 Telegram 查看' });
        try {
          // 将 chatId 缓存到本地，便于其他页面（如 addwarn）使用
          localStorage.setItem('tgChatId', String(user.id));
        } catch {}
      } else {
        Toast.show({ content: `发送失败：${data?.description || '未知错误'}` });
      }
    } catch (error) {
      console.error('发送测试消息错误:', error);
      Toast.show({ content: '网络错误，稍后再试' });
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
          <Button style={{ marginTop: 12 }} block onClick={sendTestMessage}>
            绑定并测试推送
          </Button>
        </div>
      </div>
    </div>
  );
}


