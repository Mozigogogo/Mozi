'use client';

import { useState, useEffect } from 'react';

/**
 * Telegram 调试信息组件
 * 在开发环境下显示在页面右下角
 */
export default function TelegramDebugInfo() {
  const [info, setInfo] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 只在开发环境显示
    if (process.env.NODE_ENV !== 'development') return;

    const updateInfo = () => {
      const channel = localStorage.getItem('appChannel');
      const hasTelegram = !!window.Telegram;
      const hasWebApp = !!window.Telegram?.WebApp;
      
      setInfo({
        channel,
        hasTelegram,
        hasWebApp,
        platform: window.Telegram?.WebApp?.platform,
        initDataLength: window.Telegram?.WebApp?.initData?.length || 0,
      });
    };

    updateInfo();
    const interval = setInterval(updateInfo, 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development' || !info) return null;

  return (
    <>
      {/* 悬浮按钮 */}
      <div
        onClick={() => setVisible(!visible)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: info.channel === 'tg' ? '#0088cc' : '#666',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 9999,
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        }}
      >
        {info.channel?.toUpperCase() || 'PC'}
      </div>

      {/* 详细信息面板 */}
      {visible && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            width: '300px',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '15px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: 9999,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            maxHeight: '400px',
            overflow: 'auto',
          }}
        >
          <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>
            环境检测信息
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <strong>Channel:</strong> 
            <span style={{ 
              marginLeft: '5px', 
              padding: '2px 6px', 
              background: info.channel === 'tg' ? '#d4edda' : '#f8d7da',
              borderRadius: '3px'
            }}>
              {info.channel || '未设置'}
            </span>
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <strong>window.Telegram:</strong> {info.hasTelegram ? '✅' : '❌'}
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <strong>window.Telegram.WebApp:</strong> {info.hasWebApp ? '✅' : '❌'}
          </div>
          
          {info.hasWebApp && (
            <>
              <div style={{ marginBottom: '8px' }}>
                <strong>platform:</strong> {info.platform || '(空)'}
              </div>
              
              <div style={{ marginBottom: '8px' }}>
                <strong>initData length:</strong> {info.initDataLength}
              </div>
            </>
          )}
          
          <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
            <button
              onClick={() => {
                localStorage.removeItem('appChannel');
                window.location.reload();
              }}
              style={{
                width: '100%',
                padding: '8px',
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              清除缓存并刷新
            </button>
          </div>
        </div>
      )}
    </>
  );
}
