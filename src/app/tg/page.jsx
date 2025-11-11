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
  const [debugInfo, setDebugInfo] = useState({
    sdkLoaded: false,
    sdkError: '',
    tgAvailable: false,
    platform: '',
    version: '',
    colorScheme: '',
    initDataLen: 0,
    hasUser: false,
    initData: '',
    initDataUnsafeJson: '',
  });
  const searchParams = useSearchParams();
  const symbol = searchParams.get('symbol') || '';

  // 初始化 Telegram WebApp（脚本加载完成后执行）
  const initTelegram = () => {
    const tg = window?.Telegram?.WebApp;
    if (!tg) {
      setDebugInfo((d) => ({
        ...d,
        sdkLoaded: !!window?.Telegram,
        tgAvailable: false,
        sdkError: d.sdkError || 'WebApp 不可用：请确认从 Telegram 内通过 WebApp 打开',
      }));
      return;
    }
    try {
      tg.ready();
      tg.expand();
      setTheme(tg.colorScheme || 'light');
      setUser(tg.initDataUnsafe?.user || null);
      setReady(true);
      // 主题变化监听
      tg.onEvent('themeChanged', () => setTheme(tg.colorScheme));

      const unsafe = tg.initDataUnsafe || {};
      const hasUser = !!unsafe.user;
      setDebugInfo({
        sdkLoaded: true,
        sdkError: '',
        tgAvailable: true,
        platform: tg.platform || '',
        version: tg.version || '',
        colorScheme: tg.colorScheme || '',
        initDataLen: (tg.initData || '').length,
        hasUser,
        initData: tg.initData || '',
        initDataUnsafeJson: JSON.stringify(unsafe, null, 2),
      });
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
      // 发送测试消息到 Telegram，确认 chatId 有效
      try {
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
        }
      } catch (e) {
        console.warn('发送测试消息失败:', e);
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
        onLoad={() => {
          setDebugInfo((d) => ({ ...d, sdkLoaded: true, sdkError: '' }));
          initTelegram();
        }}
        onError={() => {
          setDebugInfo((d) => ({
            ...d,
            sdkLoaded: false,
            sdkError: 'SDK 加载失败：请检查网络或脚本地址',
          }));
        }}
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
          <div style={{ marginTop: 12, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>调试面板</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
              <div>SDK加载：{String(debugInfo.sdkLoaded)}</div>
              <div>WebApp可用：{String(debugInfo.tgAvailable)}</div>
              <div>平台：{debugInfo.platform || '—'}</div>
              <div>版本：{debugInfo.version || '—'}</div>
              <div>主题：{debugInfo.colorScheme || '—'}</div>
              <div>initData长度：{debugInfo.initDataLen}</div>
              <div>存在user：{String(debugInfo.hasUser)}</div>
            </div>
            {debugInfo.sdkError ? (
              <div style={{ color: '#d9534f', marginTop: 8 }}>错误：{debugInfo.sdkError}</div>
            ) : null}
            <div style={{ marginTop: 8 }}>
              <Button size='small' onClick={initTelegram}>重新检测</Button>
            </div>
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer' }}>展开查看 initData / initDataUnsafe</summary>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: '#888' }}>initData（原始字符串）</div>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12, background: '#f7f7f7', padding: 8, borderRadius: 6 }}>
                  {debugInfo.initData || '（空）'}
                </pre>
                <div style={{ fontSize: 12, color: '#888' }}>initDataUnsafe（JSON）</div>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12, background: '#f7f7f7', padding: 8, borderRadius: 6 }}>
                  {debugInfo.initDataUnsafeJson || '（空）'}
                </pre>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}


