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
      console.log('🔄 [TG自动登录] 准备执行自动登录流程...', new Date().toISOString());
      
      // 防止重复执行
      if (loginAttemptedRef.current) {
        console.log('⚠️ [TG自动登录] 检测到已执行过登录，跳过本次执行');
        return;
      }

      // 检查是否在 Telegram 环境
      const isWindowDefined = typeof window !== 'undefined';
      const hasTelegram = isWindowDefined && !!window.Telegram;
      const hasWebApp = hasTelegram && !!window.Telegram.WebApp;
      
      console.log('🔍 [TG自动登录] 环境检查详情:', {
        isWindowDefined,
        hasTelegram,
        hasWebApp,
        userAgent: isWindowDefined ? window.navigator.userAgent : 'N/A'
      });

      if (!isWindowDefined || !hasWebApp) {
        console.log('❌ [TG自动登录] 环境检查失败: 非 Telegram WebApp 环境');
        return;
      }

      // 如果本地已有未过期 token，则跳过 loginByTelegram，避免每次进入详情都重复请求登录接口
      try {
        const existingToken = localStorage.getItem('token');
        if (existingToken) {
          const expMs = getJwtExpMs(existingToken);
          const isValid = expMs && expMs - Date.now() > 60 * 1000; // 预留 1 分钟
          if (isValid) {
            console.log('✅ [TG自动登录] 本地 token 未过期，跳过登录接口');
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
        console.warn('⚠️ [TG自动登录] token exp 校验失败，继续走登录流程:', e);
      }
      
      // 在 Telegram 环境下，显示加载中遮罩
      setIsLoading(true);

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
            console.log('✅ [TG自动登录] 检测到本地已有用户信息，将在登录时不传递 TG 昵称和头像');
          }
        }
      } catch (e) {
        console.error('❌ [TG自动登录] 检查本地用户信息失败:', e);
      }

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
        setIsLoading(false);
        return;
      }

      // 获取邀请码（从 URL 参数或 localStorage）
      const searchParams = new URLSearchParams(window.location.search);
      const inviteCode = searchParams.get('inviteCode') || searchParams.get('invite') || localStorage.getItem('inviteCode') || '';

      // 判断环境
      const env = process.env.NEXT_PUBLIC_APP_ENV || 'test';

      console.log('🚀 [TG自动登录] 开始 Telegram 自动登录');
      // Toast.show({ content: '正在自动登录...', icon: 'loading' });

      console.log('========== TG 登录参数 ==========');
      console.log('type:', 'login');
      console.log('telegramId:', String(tgUser.id));
      console.log('username:', hasLocalProfile ? '[Local Profile Exists - Omitted]' : (tgUser.username || tgUser.first_name || ''));
      console.log('photoUrl:', hasLocalProfile ? '[Local Profile Exists - Omitted]' : (tgUser.photo_url || ''));
      console.log('hash:', hash);
      console.log('inviteCode:', inviteCode);
      console.log('channel:', 'tg');
      console.log('env:', env);
      try {
        console.log('完整 initData:', initData);
      } catch (e) {
        console.log('完整 initData 打印失败');
      }
      console.log('================================');

      try {
        // 如果本地已有用户信息，则不传递 TG 的用户名和头像，避免覆盖
        const username = hasLocalProfile ? '' : (tgUser.username || tgUser.first_name || '');
        const photoUrl = hasLocalProfile ? '' : (tgUser.photo_url || '');

        console.log('🚀 [TG自动登录] 调用 loginByTelegram 接口...');
        const res = await loginByTelegram({
          telegramId: String(tgUser.id),
          username: username,
          photoUrl: photoUrl,
          hash: hash,
          inviteCode: inviteCode,
          env: env
        });
        
        console.log('🚀 [TG自动登录] 登录接口返回:', JSON.stringify(res, null, 2));

        // 尝试从多个位置获取 token
        const token = res?.data?.token || res?.token || res?.data?.accessToken;

        if (token) {
          console.log('✅ [TG自动登录] 获取到 token:', token.substring(0, 10) + '...');
          // 保存 token
          localStorage.setItem('token', token);

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
          console.log('✅ [TG自动登录] 用户信息已保存:', { nickName, avatar });

          const userId = res?.data?.userId || res?.userId;
          if (userId) {
            localStorage.setItem('userId', userId);
          }

          // 登录成功后清除邀请码
          if (inviteCode) {
            localStorage.removeItem('inviteCode');
            console.log('✅ [TG自动登录] 邀请码已使用并清除');
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

          console.log('✅ [TG自动登录] Telegram 自动登录成功');
          
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
