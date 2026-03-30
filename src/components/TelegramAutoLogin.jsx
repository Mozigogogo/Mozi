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
  const previewToken = (token) => {
    if (typeof token !== 'string' || !token) return null;
    const head = token.slice(0, 10);
    const tail = token.slice(-6);
    return `${head}...${tail}`;
  };

  // 调试：监听 token 写入/清除，定位 token 何时变为空
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalRemoveItem = localStorage.removeItem.bind(localStorage);

    localStorage.setItem = (key, value) => {
      const prev = key === 'token' ? localStorage.getItem('token') : null;
      const ret = originalSetItem(key, value);
      if (key === 'token') {
        console.warn('[TokenMonitor] token setItem', {
          prev: previewToken(prev),
          next: previewToken(String(value)),
          stack: new Error().stack,
        });
      }
      return ret;
    };

    localStorage.removeItem = (key) => {
      const prev = key === 'token' ? localStorage.getItem('token') : null;
      const ret = originalRemoveItem(key);
      if (key === 'token') {
        console.warn('[TokenMonitor] token removeItem', {
          prev: previewToken(prev),
          stack: new Error().stack,
        });
      }
      return ret;
    };

    const onStorage = (e) => {
      if (e?.key !== 'token') return;
      console.warn('[TokenMonitor] storage event token changed', {
        oldValue: previewToken(e.oldValue),
        newValue: previewToken(e.newValue),
      });
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
    };
  }, []);

  // sessionStorage 级别的去抖，防止组件反复挂载导致并发/重复调用 loginByTelegram
  const TG_AUTO_LOGIN_IN_FLIGHT_KEY = 'tg_auto_login_in_flight_v1';
  const TG_AUTO_LOGIN_LAST_SUCCESS_TS_KEY = 'tg_auto_login_last_success_ts_v1';
  const TG_AUTO_LOGIN_COOLDOWN_MS = 30 * 1000; // 30s 内不再重复触发

  // 兜底：tg WebView 重建后，sessionStorage 可能丢失冷却状态。
  // 当用户从详情页点击返回箭头导致“回到非首页”时，我们写入本地标记来跳过下一次自动登录。
  const TG_AUTO_LOGIN_SKIP_ONCE_KEY = 'tg_auto_login_skip_once_v1';

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
      if (process.env.NODE_ENV !== 'production') {
        const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        console.log('[TG auto login] enter handler', {
          path: typeof window !== 'undefined' ? window.location.pathname : null,
          hasToken: !!currentToken,
          token: previewToken(currentToken),
          now: Date.now(),
        });
      }

      // 若上一跳明确要求跳过自动登录，则直接退出
      try {
        if (typeof window !== 'undefined') {
          const skipUntilRaw = localStorage.getItem(TG_AUTO_LOGIN_SKIP_ONCE_KEY);
          const skipUntil = skipUntilRaw ? Number(skipUntilRaw) : NaN;
          if (Number.isFinite(skipUntil) && Date.now() < skipUntil) {
            localStorage.removeItem(TG_AUTO_LOGIN_SKIP_ONCE_KEY);
            return;
          }
        }
      } catch (_) {}

      // 限制：只允许在首页 `/` 自动登录
      // 目的：tg 环境下返回/重建可能导致该组件重复挂载，但不应在非首页触发 loginByTelegram
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path !== '/') {
          return;
        }
      }

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

      // 仅允许在“首次进入（navigate）”时自动调用登录接口。
      // Telegram WebView 上从详情页返回可能触发 back_forward/reload 的整页重载，
      // 这种场景不应再次请求 /user/login。
      let navigationType = null;
      try {
        const nav = performance?.getEntriesByType?.('navigation')?.[0];
        navigationType = nav?.type || null; // 'navigate' | 'reload' | 'back_forward' | 'prerender'
      } catch (_) {}

      if (navigationType && navigationType !== 'navigate') {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[TG auto login] navigation guard: skip loginByTelegram', {
            navigationType,
          });
        }
        loginAttemptedRef.current = true;
        await runPostLoginSideEffects({
          caller: 'TelegramAutoLogin_navigationGuardSkip',
          forceDataInfo: false,
        });
        window.dispatchEvent(new CustomEvent('tg-login-success'));
        setIsLoading(false);
        return;
      }

      // 以 Telegram WebApp 的 initData hash 作为“启动标识”
      // 需求：只在“启动 Telegram 小程序”时允许调用 /api/user/login
      // 返回详情页导致组件重建时，hash 通常不变，因此会跳过 loginByTelegram
      let initHash = null;
      try {
        const tgWebAppForHash = window.Telegram.WebApp;
        const initDataForHash = tgWebAppForHash?.initData;
        const urlParamsForInit = new URLSearchParams(initDataForHash || '');
        initHash = urlParamsForInit.get('hash');
      } catch (_) {}

      const TG_AUTO_LOGIN_HANDLED_LAUNCH_HASH_KEY = 'tg_auto_login_handled_launch_hash_v1';
      try {
        if (initHash) {
          const handledLaunchHash = localStorage.getItem(TG_AUTO_LOGIN_HANDLED_LAUNCH_HASH_KEY);
          if (handledLaunchHash && handledLaunchHash === initHash) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[TG auto login] launch already handled, skip loginByTelegram', {
                initHash: `${initHash.slice(0, 8)}...`,
              });
            }
            loginAttemptedRef.current = true;
            await runPostLoginSideEffects({
              caller: 'TelegramAutoLogin_launchAlreadyHandled',
              forceDataInfo: false,
            });
            window.dispatchEvent(new CustomEvent('tg-login-success'));
            setIsLoading(false);
            return;
          }
        }
      } catch (_) {}

      // 全局 in-flight / 冷却：避免重复挂载造成多次 loginByTelegram
      if (typeof window !== 'undefined') {
        const inFlight = sessionStorage.getItem(TG_AUTO_LOGIN_IN_FLIGHT_KEY) === 'true';
        const lastSuccessTsRaw = sessionStorage.getItem(TG_AUTO_LOGIN_LAST_SUCCESS_TS_KEY);
        const lastSuccessTs = lastSuccessTsRaw ? Number(lastSuccessTsRaw) : NaN;
        const recentlySucceeded =
          Number.isFinite(lastSuccessTs) && Date.now() - lastSuccessTs <= TG_AUTO_LOGIN_COOLDOWN_MS;

        if (process.env.NODE_ENV !== 'production') {
          console.log('[TG auto login] env & throttle', {
            inFlight,
            recentlySucceeded,
            lastSuccessTs: Number.isFinite(lastSuccessTs) ? lastSuccessTs : null,
          });
        }

        if (inFlight || recentlySucceeded) {
          return;
        }
      }

      // 规则（按你的需求）：只要本地已经有 token，就绝不再调用登录接口。
      // Telegram 自动登录只允许在“没有 token 的首次启动”场景触发。
      try {
        const existingToken = localStorage.getItem('token');
        if (existingToken) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[TG auto login] existing token present, skip loginByTelegram', {
              token: previewToken(existingToken),
              now: Date.now(),
            });
          }

          loginAttemptedRef.current = true;
          await runPostLoginSideEffects({
            caller: 'TelegramAutoLogin_skipLogin_tokenPresent',
            forceDataInfo: false,
          });
          window.dispatchEvent(new CustomEvent('tg-login-success'));
          setIsLoading(false);
          return;
        }
      } catch (e) {
        // guard 失败不影响后续正常登录
      }

      if (process.env.NODE_ENV !== 'production') {
        console.warn('[TG auto login] token missing -> may call loginByTelegram', {
          now: Date.now(),
        });
      }
      
      // 在 Telegram 环境下，显示加载中遮罩
      setIsLoading(true);

      // 标记为登录进行中
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(TG_AUTO_LOGIN_IN_FLIGHT_KEY, 'true');
      }

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

      if (process.env.NODE_ENV !== 'production') {
        console.log('[TG auto login] start decision', {
          hasLocalProfile,
          appChannel: localStorage.getItem('appChannel'),
        });
      }

      // 从 initData 解析 hash
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');

      if (!hash) {
        setIsLoading(false);
        return;
      }

      // 准备走登录接口前：先标记启动 hash，避免返回/重建时重复触发 /api/user/login
      try {
        localStorage.setItem(TG_AUTO_LOGIN_HANDLED_LAUNCH_HASH_KEY, hash);
      } catch (_) {}

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

          if (process.env.NODE_ENV !== 'production') {
            console.log('[TG auto login] loginByTelegram success, token saved', {
              token: previewToken(token),
            });
          }

          // 记录成功时间，作为跨组件挂载的冷却依据
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(TG_AUTO_LOGIN_LAST_SUCCESS_TS_KEY, String(Date.now()));
            sessionStorage.removeItem(TG_AUTO_LOGIN_IN_FLIGHT_KEY);
          }

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

        // 登录失败时允许下次再尝试（同一启动 hash 可能仍有效）
        try {
          localStorage.removeItem(TG_AUTO_LOGIN_HANDLED_LAUNCH_HASH_KEY);
        } catch (_) {}
      } finally {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(TG_AUTO_LOGIN_IN_FLIGHT_KEY);
        }
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
