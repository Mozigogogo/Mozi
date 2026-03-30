'use client';

import { useEffect, useRef, useState } from 'react';
import { Toast } from 'antd-mobile';
import { loginByTelegram } from '@/api/user';
import { getMySubscription } from '@/api/vip';
import { LogoLoading } from '@/components/Loading';
import { runPostLoginSideEffects } from '@/utils/postLogin';
import { syncI18nextLngFromLoginResponse } from '@/utils/syncLoginLanguage';
import { useTranslation } from 'react-i18next';

/**
 * Telegram 自动登录组件
 * 用户打开 TG 小程序时自动进行登录
 */
export default function TelegramAutoLogin() {
  const loginAttemptedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const { i18n } = useTranslation();

  // 尽量从 JWT 里读取 exp（不校验签名），用于判断是否需要重新走登录接口
  const getJwtExpMs = (token) => {
    try {
      if (typeof token !== 'string') return null;
      const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
      const parts = raw.split('.');
      if (parts.length < 2) return null;
      const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = payloadB64.length % 4 ? '='.repeat(4 - (payloadB64.length % 4)) : '';
      const jsonStr = atob(payloadB64 + pad);
      const payload = JSON.parse(jsonStr);
      if (typeof payload?.exp === 'number' && Number.isFinite(payload.exp)) {
        return payload.exp * 1000;
      }
    } catch (_) {}
    return null;
  };

  useEffect(() => {
    const handleTelegramAutoLogin = async () => {
      // 防止重复执行
      if (loginAttemptedRef.current) {
        return;
      }

      // 检查是否在 Telegram 环境
      const isWindowDefined = typeof window !== 'undefined';
      const hasTelegram = isWindowDefined && !!window.Telegram;
      const hasWebApp = hasTelegram && !!window.Telegram.WebApp;
      
      if (!isWindowDefined || !hasWebApp) {
        return;
      }

      // 如果本地已经有 token：
      // - 一般不应重复调用 loginByTelegram（路由重挂载时会重复）
      // - 只有当我们能解出 exp 且明确接近/已过期时，才走登录接口刷新 token
      try {
        const existingToken = localStorage.getItem('token');
        if (existingToken) {
          const expMs = getJwtExpMs(existingToken);
          // expMs 解码失败时，默认认为 token 仍可用，避免重复登录
          const isExpired =
            typeof expMs === 'number' ? expMs - Date.now() <= 60 * 1000 : false;

          if (!isExpired) {
            loginAttemptedRef.current = true;

            // 尽量保持页面状态一致：触发副作用/同步事件，但不再请求登录
            await runPostLoginSideEffects({ caller: 'TelegramAutoLogin_skipLogin', forceDataInfo: false });
            window.dispatchEvent(new CustomEvent('tg-login-success'));
            setIsLoading(false);
            return;
          }

        }
      } catch (e) {
        // guard 失败不影响后续正常登录
      }
      
      // 在 Telegram 环境下，显示加载中遮罩
      setIsLoading(true);

      loginAttemptedRef.current = true;

      const tgWebApp = window.Telegram.WebApp;

      const initData = tgWebApp.initData;
      const initDataUnsafe = tgWebApp.initDataUnsafe;

      if (!initData || !initDataUnsafe?.user) {
        setIsLoading(false);
        return;
      }

      const tgUser = initDataUnsafe.user;

      // 检查本地是否有昵称和头像
      let hasLocalProfile = false;
      try {
        const storedUserInfoStr = localStorage.getItem('userInfo');
        if (storedUserInfoStr) {
          const storedUserInfo = JSON.parse(storedUserInfoStr);
          // 如果本地有昵称且不为空，则认为已有本地配置
          if (storedUserInfo.nickName && storedUserInfo.nickName.trim()) {
            hasLocalProfile = true;
          }
        }
      } catch (e) {
        console.error('❌ [TG自动登录] 检查本地用户信息失败:', e);
      }

      // 从 initData 解析 hash
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');

      if (!hash) {
        setIsLoading(false);
        return;
      }

      // 获取邀请码（从 URL 参数或 localStorage）
      const searchParams = new URLSearchParams(window.location.search);
      const inviteCode = searchParams.get('inviteCode') || searchParams.get('invite') || localStorage.getItem('inviteCode') || '';

      // 判断环境
      const env = process.env.NEXT_PUBLIC_APP_ENV || 'test';

      // Toast.show({ content: '正在自动登录...', icon: 'loading' });

      try {
        // 如果本地已有用户信息，则不传递 TG 的用户名和头像，避免覆盖
        const username = hasLocalProfile ? '' : (tgUser.username || tgUser.first_name || '');
        const photoUrl = hasLocalProfile ? '' : (tgUser.photo_url || '');

        const res = await loginByTelegram({
          telegramId: String(tgUser.id),
          username: username,
          photoUrl: photoUrl,
          hash: hash,
          inviteCode: inviteCode,
          env: env
        });

        // 尝试从多个位置获取 token
        const token = res?.data?.token || res?.token || res?.data?.accessToken;

        if (token) {
          // 保存 token
          localStorage.setItem('token', token);
          // 通知已建立的 WebSocket 使用新 token 重新鉴权
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('mozi:tokenUpdated', {
                detail: { token },
              })
            );
          }

          // 根据后端返回 language 更新缓存语言，并同步 i18next
          syncI18nextLngFromLoginResponse(res, i18n);
          // Toast.show({ content: '登录成功', icon: 'success' });

          // 保存用户信息

          // 保存用户信息
          const userData = res?.data?.userInfo || res?.data?.user || res?.user || {};
          let nickName = userData.nickName;
          let avatar = userData.avatar;
          
          // 如果本地已有配置，且后端返回为空，则保留本地配置
          if (hasLocalProfile) {
            try {
               const currentStored = JSON.parse(localStorage.getItem('userInfo') || '{}');
               if (!nickName && currentStored.nickName) {
                   nickName = currentStored.nickName;
               }
               if (!avatar && currentStored.avatar) {
                   avatar = currentStored.avatar;
               }
            } catch(e) {}
          }
          
          // 兜底逻辑
          if (!nickName) nickName = '';
          if (!avatar) avatar = tgUser.photo_url || '';

          const userInfoWithSubscribe = {
            ...userData,
            nickName: nickName,
            avatar: avatar,
            subscribeAnnouncement: res.data?.subscribeAnnouncement || res.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));

          const userId = res?.data?.userId || res?.userId;
          if (userId) {
            localStorage.setItem('userId', userId);
          }

          // 登录成功后清除邀请码
          if (inviteCode) {
            localStorage.removeItem('inviteCode');
          }

          // 登录成功后的统一副作用（datainfo + 任务），带去重
          try {
            await runPostLoginSideEffects({ caller: 'TelegramAutoLogin', forceDataInfo: true });
          } catch (e) {
            console.error('❌ [TG自动登录] post-login side effects failed:', e);
          }

          // 登录成功后：立刻拉取订阅状态/权益与会员标识
          // getMySubscription 内部会同步 planCode 到 localStorage，并派发 mozi:subscriptionPlanCodeUpdated 事件
          try {
            const subRes = await getMySubscription();
            const data = subRes?.data ?? subRes;

            // 兼容不同后端字段命名：尽最大可能把“会员标识”落到统一 key
            const membershipId =
              data?.memberId ??
              data?.membershipId ??
              data?.subscriberId ??
              data?.subscriptionId ??
              data?.subId ??
              data?.vipId ??
              data?.id ??
              null;

            // 供其它页面/埋点使用
            try {
              localStorage.setItem('mozi_my_subscription_last_v1', JSON.stringify(data));
              const CACHE_KEY = 'mozi_my_subscription_cache_v1';
              localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
              const PLAN_CODE_KEY = 'mozi_my_subscription_plan_code_v1';
              const nextPlanCode = data?.planCode;
              if (nextPlanCode !== undefined && nextPlanCode !== null) {
                const next = String(nextPlanCode);
                const prev = localStorage.getItem(PLAN_CODE_KEY);
                if (prev === null || String(prev) !== next) {
                  localStorage.setItem(PLAN_CODE_KEY, next);
                }
              }
              if (membershipId !== null && membershipId !== undefined) {
                localStorage.setItem('mozi_my_subscription_member_id_v1', String(membershipId));
              }
            } catch (e) {
              console.error('❌ [TG自动登录] 写入订阅缓存失败:', e);
            }

            window.dispatchEvent(
              new CustomEvent('mozi:subscriptionUpdated', {
                detail: { subscription: data, membershipId },
              })
            );
          } catch (e) {
            // 不阻断登录主流程
            console.error('❌ [TG自动登录] getMySubscription 失败:', e);
          }

          // 触发页面刷新以更新状态
          window.dispatchEvent(new CustomEvent('tg-login-success'));
        } else {
          console.error('❌ [TG自动登录] 登录失败: 未找到 token', res);
          Toast.show({ content: res?.message || res?.errorMsg || '登录失败(无token)', position: 'bottom' });
        }
      } catch (error) {
        console.error('❌ [TG自动登录] 登录异常:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 延迟执行，确保 Telegram WebApp SDK 已加载
    const timer = setTimeout(() => {
      handleTelegramAutoLogin();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // return <LogoLoading visible={isLoading} fullscreen mask image="/images/community/loadding.png" />;
  return null;
}
