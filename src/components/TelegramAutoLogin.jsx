'use client';

import { useEffect, useRef } from 'react';
import { Toast } from 'antd-mobile';
import { loginByTelegram } from '@/api/user';
import request from '@/api/index';
import Interface from '@/utils/constants';

/**
 * Telegram 自动登录组件
 * 用户打开 TG 小程序时自动进行登录
 */
export default function TelegramAutoLogin() {
  const loginAttemptedRef = useRef(false);

  useEffect(() => {
    const handleTelegramAutoLogin = async () => {
      // 防止重复执行
      if (loginAttemptedRef.current) {
        return;
      }

      // 检查是否已登录
      const existingToken = localStorage.getItem('token');
      if (existingToken) {
        console.log('✅ [TG自动登录] 用户已登录，跳过自动登录');
        return;
      }

      // 检查是否在 Telegram 环境
      if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
        console.log('❌ [TG自动登录] 非 Telegram WebApp 环境');
        return;
      }

      loginAttemptedRef.current = true;

      const tgWebApp = window.Telegram.WebApp;

      // 打印 TG 环境原始参数数据
      console.log('========== TG 原始数据 ==========');
      console.log('window.Telegram.WebApp:', tgWebApp);
      console.log('initData (原始字符串):', tgWebApp.initData);
      console.log('initDataUnsafe (完整对象):', tgWebApp.initDataUnsafe);
      console.log('initDataUnsafe.hash:', tgWebApp.initDataUnsafe?.hash);
      console.log('initDataUnsafe.auth_date:', tgWebApp.initDataUnsafe?.auth_date);
      console.log('initDataUnsafe.query_id:', tgWebApp.initDataUnsafe?.query_id);
      console.log('platform:', tgWebApp.platform);
      console.log('version:', tgWebApp.version);
      console.log('colorScheme:', tgWebApp.colorScheme);
      console.log('================================');

      const initData = tgWebApp.initData;
      const initDataUnsafe = tgWebApp.initDataUnsafe;

      if (!initData || !initDataUnsafe?.user) {
        console.log('❌ [TG自动登录] 无法获取 Telegram initData');
        return;
      }

      const tgUser = initDataUnsafe.user;

      // 打印用户原始数据
      console.log('========== TG 用户原始数据 ==========');
      console.log('user 对象:', tgUser);
      console.log('user.id:', tgUser.id);
      console.log('user.first_name:', tgUser.first_name);
      console.log('user.last_name:', tgUser.last_name);
      console.log('user.username:', tgUser.username);
      console.log('user.language_code:', tgUser.language_code);
      console.log('user.photo_url:', tgUser.photo_url);
      console.log('user.is_premium:', tgUser.is_premium);
      console.log('====================================');

      // 从 initData 解析 hash
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');

      if (!hash) {
        console.log('❌ [TG自动登录] 无法获取 hash');
        return;
      }

      // 获取邀请码（从 URL 参数或 localStorage）
      const searchParams = new URLSearchParams(window.location.search);
      const inviteCode = searchParams.get('inviteCode') || searchParams.get('invite') || localStorage.getItem('inviteCode') || '';

      // 判断环境
      const env = process.env.NEXT_PUBLIC_APP_ENV || 'test';

      console.log('🚀 [TG自动登录] 开始 Telegram 自动登录');
      console.log('========== TG 登录参数 ==========');
      console.log('type:', 'login');
      console.log('telegramId:', String(tgUser.id));
      console.log('username:', tgUser.username || tgUser.first_name || '');
      console.log('photoUrl:', tgUser.photo_url || '');
      console.log('hash:', hash);
      console.log('inviteCode:', inviteCode);
      console.log('channel:', 'tg');
      console.log('env:', env);
      console.log('完整 initData:', initData);
      console.log('================================');

      try {
        Toast.show({ icon: 'loading', content: '登录中...', duration: 0 });

        const res = await loginByTelegram({
          telegramId: String(tgUser.id),
          username: tgUser.username || tgUser.first_name || '',
          photoUrl: tgUser.photo_url || '',
          hash: hash,
          inviteCode: inviteCode,
          env: env
        });

        Toast.clear();

        if (res?.data?.token) {
          // 保存 token
          localStorage.setItem('token', res.data.token);

          // 保存用户信息，完全依赖后端返回的 nickName
          const userData = res?.data?.userInfo || res?.data?.user || {};
          const nickName = userData.nickName || '';
          const avatar = userData.avatar || tgUser.photo_url || '';
          
          const userInfoWithSubscribe = {
            ...userData,
            nickName: nickName,
            avatar: avatar,
            subscribeAnnouncement: res.data.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));
          console.log('✅ [TG自动登录] 用户信息已保存:', { nickName, avatar });

          if (res?.data?.userId) {
            localStorage.setItem('userId', res.data.userId);
          }

          // 登录成功后清除邀请码
          if (inviteCode) {
            localStorage.removeItem('inviteCode');
            console.log('✅ [TG自动登录] 邀请码已使用并清除');
          }

          // 同步调用 /user/datainfo 获取用户详细信息（仅用于积分等数据，不覆盖 nickName/avatar）
          try {
            const dataInfoRes = await request({
              url: Interface.USER_DATA_INFO,
              method: 'GET'
            });

            if (dataInfoRes?.data) {
              console.log('✅ [TG自动登录] 获取用户详细信息成功');
              // 保留本地已有的 nickName/avatar，不让 datainfo 覆盖
              const nextDataInfo = {
                ...dataInfoRes.data,
                userInfo: {
                  ...(dataInfoRes.data?.userInfo || {}),
                  nickName: nickName,
                  avatar: avatar
                }
              };
              localStorage.setItem('userDataInfo', JSON.stringify(nextDataInfo));
            }
          } catch (dataInfoError) {
            console.error('❌ [TG自动登录] 获取用户详细信息失败:', dataInfoError);
          }

          // 完成每日登录任务
          try {
            await request({
              url: Interface.TASK_COMPLETE,
              method: 'POST',
              data: { taskCode: 'DAILY_LOGIN' }
            });
            console.log('✅ [TG自动登录] 每日登录任务上报成功');
          } catch (taskError) {
            console.error('❌ [TG自动登录] 每日登录任务上报失败:', taskError);
          }

          Toast.show({ content: '登录成功', position: 'center', icon: 'success' });

          console.log('✅ [TG自动登录] Telegram 自动登录成功');
          
          // 触发页面刷新以更新状态
          window.dispatchEvent(new CustomEvent('tg-login-success'));
        } else {
          console.error('❌ [TG自动登录] 登录失败:', res?.message || res?.errorMsg);
          Toast.show({ content: res?.message || res?.errorMsg || '登录失败', position: 'bottom' });
        }
      } catch (error) {
        Toast.clear();
        console.error('❌ [TG自动登录] 登录异常:', error);
        Toast.show({ content: '登录失败，请重试', position: 'bottom' });
      }
    };

    // 延迟执行，确保 Telegram WebApp SDK 已加载
    const timer = setTimeout(() => {
      handleTelegramAutoLogin();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // 这是一个无 UI 的组件
  return null;
}
