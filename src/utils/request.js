import axios from 'axios';
import { getTonPaymentTraceId } from '@/app/vip-recharge/utils/tonPaymentTrace';
import { INTERFACE_URL, Interface } from './constants.js';

// 创建axios实例
const instance = axios.create({
  baseURL: INTERFACE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    // perfDebug: record start time per request (only when enabled)
    try {
      if (typeof window !== 'undefined') {
        const enabled = new URLSearchParams(window.location.search).get('perfDebug') === '1';
        if (enabled) {
          config.metadata = config.metadata || {};
          config.metadata.startTime = performance.now();
        }
      }
    } catch (_) {}

    // 从localStorage获取token
    const token = localStorage.getItem('token');
    
    // 检查请求中是否已经包含了 Authorization 头（忽略大小写）
    // 如果已经有 Authorization 头（例如 getPoolStatus 接口），则不再添加 authentication 头
    // Axios v1+ config.headers 可能是 AxiosHeaders 对象，支持 .has() 方法
    const hasAuthorization = config.headers['Authorization'] || 
                             config.headers['authorization'] || 
                             (config.headers.has && config.headers.has('Authorization'));
                             
    if (token && !hasAuthorization) {
      config.headers.authentication = token;
    }
    
    // 从localStorage获取用户选择的语言
    const language = localStorage.getItem('i18nextLng') || 'en';
    config.headers['Accept-Language'] = language;

    try {
      const tonTraceId = getTonPaymentTraceId();
      const url = String(config.url || '');
      if (tonTraceId && url.includes('/payment/')) {
        config.headers['X-Mozi-Ton-Trace-Id'] = tonTraceId;
      }
    } catch (_) {}
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 401 提示控制：使用 sessionStorage 确保每个会话只提示一次
// 使用 sessionStorage 而不是变量，这样刷新页面会重置，但标签页切换不会
const SESSION_EXPIRED_KEY = 'session_expired_shown';

// 检查是否已经显示过会话过期提示
const hasShownSessionExpired = () => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(SESSION_EXPIRED_KEY) === 'true';
};

// 标记已显示会话过期提示
const markSessionExpiredShown = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, 'true');
  }
};

// 重置会话过期提示标志（用于路由切换时）
export const resetSessionExpiredFlag = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
  }
};

// 任务积分映射表
const TASK_POINTS_MAP = {
  // 一次性任务
  'ALARM': 10,
  'VIDEO': 15,
  'WECHAT': 20,
  'COMMUNITY': 20,
  'EARLY_BIRD': 50,
  'INVITE_USER': 500,
  'TWITTER': 10,
  'COMPLETE_PROFILE': 20,
  'FIRST_LOGIN': 50,
  'FIRST_POST': 50,
  'ADD_WATCHLIST': 30,
  
  // 重复性/日常任务
  'DAILY_LIKE': 4,
  'POST': 10,
  'RECEIVE_LIKE': 4,
  'REPLY': 4,
  'POST_RECEIVE_REPLY': 4,
  'DAILY_LOGIN': 5
};

// 调试开关：控制 request 链路的控制台输出（仅用于定位问题）
// 设为 true 后可恢复相关日志。
const ENABLE_REQUEST_DEBUG = false;

// 尽量从 JWT 的 exp 字段判断 token 是否已过期（不校验签名）
const getJwtExpMs = (token) => {
  try {
    if (typeof token !== 'string') return null;
    const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
    const parts = raw.split('.');
    if (parts.length < 2) return null;
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = payloadB64.length % 4 ? '='.repeat(4 - (payloadB64.length % 4)) : '';
    if (typeof atob !== 'function') return null;
    const jsonStr = atob(payloadB64 + pad);
    const payload = JSON.parse(jsonStr);
    const exp = payload?.exp;
    const expNum = typeof exp === 'number' ? exp : typeof exp === 'string' ? Number(exp) : null;
    if (typeof expNum === 'number' && Number.isFinite(expNum)) {
      return expNum * 1000;
    }
  } catch (_) {}
  return null;
};

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    const data = response.data;

    // perfDebug: log slow API requests
    try {
      const enabled =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('perfDebug') === '1';
      if (enabled) {
        const start = response.config?.metadata?.startTime;
        const dur = typeof start === 'number' ? performance.now() - start : null;
        if (typeof dur === 'number' && dur > 1200) {
          // eslint-disable-next-line no-console
          console.warn('[perfDebug][api slow]', {
            url: response.config?.url,
            method: response.config?.method,
            ms: Math.round(dur),
            status: response.status,
          });
        }
      }
    } catch (_) {}
    
    // 全局任务完成监听：只要是任务完成接口且返回成功，就触发积分弹窗
    if (data && data.code === 0 && data.data && data.data.success) {
      const isTaskComplete = response.config.url && (
        response.config.url.includes(Interface.TASK_COMPLETE) || 
        response.config.url.includes('/task/complete')
      );
      
      if (isTaskComplete) {
         try {
           if (typeof window !== 'undefined') {
             let points = data.data.points || data.data.rewardPoints;
             
             // 如果接口未返回积分，尝试从请求参数的 taskCode 映射获取
             if (!points && response.config.data) {
               try {
                 const requestData = typeof response.config.data === 'string' 
                   ? JSON.parse(response.config.data) 
                   : response.config.data;
                   
                 if (requestData && requestData.taskCode) {
                   points = TASK_POINTS_MAP[requestData.taskCode];
                 }
               } catch (parseError) {
                 console.warn('解析请求数据失败:', parseError);
               }
             }
             
             // 触发自定义事件，由 Layout 监听并显示弹窗
             const event = new CustomEvent('SHOW_POINTS_MODAL', { 
               detail: { 
                 points: points || 10 // 如果都获取不到，默认显示 10
               } 
             });
             window.dispatchEvent(event);
           }
         } catch (e) {
           console.error('Trigger points modal failed:', e);
         }
      }
    }

    // 检查返回的code是否为401
    if (data && data.code === 401) {
      // 检查请求使用的 token 是否与当前存储的 token 一致
      // 防止并发请求或旧请求的 401 误删新登录的 token
      let isTG = false;
      let isPC = false;
      let isTGEnv = false;
      if (typeof window !== 'undefined') {
        const currentToken = localStorage.getItem('token');
        const appChannel = localStorage.getItem('appChannel');
        isTG = appChannel === 'tg';
        isPC = appChannel === 'pc';
        isTGEnv = isTG;

        // 获取请求头中的 token，兼容不同写法
        const requestToken =
          response.config?.headers?.authentication ||
          response.config?.headers?.Authentication ||
          response.config?.headers?.['authentication'];

        // 非 TG 环境下：如果当前有 token，但请求没有带 token，或者请求带的 token 与当前不一致，
        // 则认为该 401 不应该影响当前的登录态（保留原有保护逻辑）。
        // TG 环境下：无论是否有 token、是否匹配，都按 401 触发重新登录流程。
        if (!isTG && currentToken && requestToken !== currentToken) {
          console.warn('⚠️ [Request] 忽略非当前 Token 的 401 响应', {
            requestToken: requestToken ? 'Exist' : 'None',
          });
          return data;
        }
      }

      // NOTE: 按当前产品策略，401 不清除 token（仅提示 + 抛错），避免误删导致反复登录/循环。
      // 以下是历史逻辑（保留注释，便于将来回滚/排查）：
      //
      // // 只有在 JWT 真正已过期时才清空 token，避免 token 未过期但因接口/权限返回 401
      // // 导致触发 TelegramAutoLogin 的重复登录循环
      // if (typeof window !== 'undefined') {
      //   const currentToken = localStorage.getItem('token');
      //   if (currentToken) {
      //     const expMs = getJwtExpMs(currentToken);
      //     if (typeof expMs === 'number' && expMs - Date.now() > 0) {
      //       return Promise.reject(new Error('Unauthorized'));
      //     }
      //   }
      // }
      //
      // // 清除 token（已禁用）
      // const debugEnabled = ENABLE_REQUEST_DEBUG;
      // if (debugEnabled && typeof window !== 'undefined') {
      //   const previewToken = (token) => {
      //     if (typeof token !== 'string' || !token) return null;
      //     return `${token.slice(0, 10)}...${token.slice(-6)}`;
      //   };
      //   const currentToken = localStorage.getItem('token');
      //   const requestToken =
      //     response.config?.headers?.authentication ||
      //     response.config?.headers?.Authentication ||
      //     response.config?.headers?.['authentication'];
      //   const expMs = currentToken ? getJwtExpMs(currentToken) : null;
      //   console.log('[Request] 401: clear token about to happen', {
      //     currentToken: previewToken(currentToken),
      //     requestToken: previewToken(requestToken),
      //     expMs,
      //     now: Date.now(),
      //   });
      // }
      // clearToken();
      // if (debugEnabled && typeof window !== 'undefined') {
      //   const tokenAfter = localStorage.getItem('token');
      //   console.log('[Request] 401: token after clear', {
      //     tokenAfter: tokenAfter ? tokenAfter.slice(0, 10) + '...' : null,
      //   });
      // }
      
      // 只在浏览器环境中执行，且本次会话未提示过
      if (typeof window !== 'undefined' && !hasShownSessionExpired()) {
        markSessionExpiredShown();
        
        // 获取当前语言
        const language = localStorage.getItem('i18nextLng') || 'zh';
        const message = language === 'zh' 
          ? '登录已失效，请重新登录' 
          : 'Session expired, please login again';
        
        // 显示提示，不自动跳转
        try {
          if (isPC) {
            // PC端使用 antd 的 message
            import('antd').then(({ message: antdMessage }) => {
              antdMessage.warning({
                content: message,
                duration: 3,
              });
            }).catch(() => {
              console.warn('Antd message 加载失败');
            });
          } else if (!isTG) {
            // 移动端使用 antd-mobile 的 Toast
            import('antd-mobile').then(({ Toast }) => {
              Toast.show({
                content: message,
                position: 'center',
                duration: 2000,
                maskClickable: true  // 允许点击遮罩关闭
              });
            }).catch(() => {
              console.warn('Toast 加载失败');
            });
          }
        } catch (e) {
          console.warn('提示显示失败:', e);
        }
      }

      // tg 环境自动重新登录：401 通常意味着 token 失效，但现有逻辑不会清 token，
      // 导致 TelegramAutoLogin（tg 下仅 token 缺失时触发）无法重新登录。
      if (typeof window !== 'undefined' && isTGEnv) {
        try {
          const TG_401_RELOGIN_LAST_TS_KEY = 'tg_401_auto_relogin_last_ts_v1';
          const TG_401_RELOGIN_COOLDOWN_MS = 60 * 1000; // 避免死循环：60s 内最多触发一次

          const lastTsRaw = sessionStorage.getItem(TG_401_RELOGIN_LAST_TS_KEY);
          const lastTs = lastTsRaw ? Number(lastTsRaw) : NaN;
          const shouldRelogin = !Number.isFinite(lastTs) || Date.now() - lastTs > TG_401_RELOGIN_COOLDOWN_MS;

          if (shouldRelogin) {
            sessionStorage.setItem(TG_401_RELOGIN_LAST_TS_KEY, String(Date.now()));

            // 清 token + 清 TelegramAutoLogin 的“已处理 hash/冷却”标记，确保它会重新调用 loginByTelegram
            localStorage.removeItem('token');
            localStorage.removeItem('tg_auto_login_handled_launch_hash_v1');
            sessionStorage.removeItem('tg_auto_login_in_flight_v1');
            sessionStorage.removeItem('tg_auto_login_last_success_ts_v1');
            localStorage.removeItem('tg_auto_login_skip_once_v1');

            // 跳转到 TG 首页触发 TelegramAutoLogin。
            // 当前 TG 入口统一使用 `/home`，避免重新回到营销首页 `/`。
            if (window.location.pathname !== '/home') {
              window.location.replace('/home');
            } else {
              // 若已经在首页，避免整页 reload；直接通知 TelegramAutoLogin 重试登录
              window.dispatchEvent(new CustomEvent('tg-force-relogin'));
            }
          }
        } catch (e) {
          console.warn('[Request] tg relogin on 401 failed:', e);
        }
      }

      return Promise.reject(new Error('Session expired'));
    }
    
    return data;
  },
  (error) => {
    // perfDebug: log slow/failed API requests
    try {
      const enabled =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('perfDebug') === '1';
      if (enabled) {
        const start = error?.config?.metadata?.startTime;
        const dur = typeof start === 'number' ? performance.now() - start : null;
        // eslint-disable-next-line no-console
        console.warn('[perfDebug][api error]', {
          url: error?.config?.url,
          method: error?.config?.method,
          ms: typeof dur === 'number' ? Math.round(dur) : null,
          message: error?.message,
        });
      }
    } catch (_) {}
    return Promise.reject(error);
  }
);

// 封装请求函数
export const request = async (options) => {
  try {
    const { url, method = 'GET', data, params, headers } = options;
    
    const config = {
      url,
      method,
      headers,
      ...(method.toUpperCase() === 'GET' ? { params: data || params } : { data }),
    };
    
    const response = await instance(config);
    return response;
  } catch (error) {
    throw error;
  }
};

// 获取token
export const getToken = () => {
  return localStorage.getItem('token');
};

// 设置token
export const setToken = (token) => {
  localStorage.setItem('token', token);
};

// 清除token
export const clearToken = () => {
  // 调试：定位是谁清除了 token
  try {
    if (ENABLE_REQUEST_DEBUG && typeof window !== 'undefined') {
      const currentToken = localStorage.getItem('token');
      const preview = (t) => {
        if (typeof t !== 'string' || !t) return null;
        return `${t.slice(0, 10)}...${t.slice(-6)}`;
      };
      console.warn('[Request] clearToken() called', {
        tokenBeforeClear: preview(currentToken),
        stack: new Error().stack,
      });
    }
  } catch (_) {}
  localStorage.removeItem('token');
};