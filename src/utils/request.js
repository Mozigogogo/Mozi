import axios from 'axios';
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
      if (typeof window !== 'undefined') {
        const currentToken = localStorage.getItem('token');
        // 获取请求头中的 token，兼容不同写法
        const requestToken = response.config?.headers?.authentication || 
                             response.config?.headers?.Authentication || 
                             response.config?.headers?.['authentication'];
        
        // 如果当前有 token，但请求没有带 token，或者请求带的 token 与当前不一致
        // 则认为该 401 不应该影响当前的登录态
        if (currentToken && requestToken !== currentToken) {
           console.warn('⚠️ [Request] 忽略非当前 Token 的 401 响应', { requestToken: requestToken ? 'Exist' : 'None' });
           return data;
        }

        // 只有在 JWT 真正已过期时才清空 token，避免 token 未过期但因接口/权限返回 401
        // 导致触发 TelegramAutoLogin 的重复登录循环
        if (currentToken) {
          const expMs = getJwtExpMs(currentToken);
          if (typeof expMs === 'number' && expMs - Date.now() > 0) {
            return Promise.reject(new Error('Unauthorized'));
          }
        }
      }

      // 清除token
      const debugEnabled = typeof window !== 'undefined' && localStorage.getItem('debug_tg_login') === '1';
      if (debugEnabled) {
        const previewToken = (token) => {
          if (typeof token !== 'string' || !token) return null;
          return `${token.slice(0, 10)}...${token.slice(-6)}`;
        };
        const currentToken = localStorage.getItem('token');
        const requestToken = response.config?.headers?.authentication ||
          response.config?.headers?.Authentication ||
          response.config?.headers?.['authentication'];
        const expMs = currentToken ? getJwtExpMs(currentToken) : null;
        console.log('[Request] 401: clear token about to happen', {
          currentToken: previewToken(currentToken),
          requestToken: previewToken(requestToken),
          expMs,
          now: Date.now(),
        });
      }
      clearToken();
      
      if (debugEnabled) {
        const tokenAfter = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        console.log('[Request] 401: token after clear', { tokenAfter: tokenAfter ? tokenAfter.slice(0, 10) + '...' : null });
      }
      
      // 只在浏览器环境中执行，且本次会话未提示过
      if (typeof window !== 'undefined' && !hasShownSessionExpired()) {
        markSessionExpiredShown();
        
        // 获取当前语言
        const language = localStorage.getItem('i18nextLng') || 'zh';
        const message = language === 'zh' 
          ? '登录已失效，请重新登录' 
          : 'Session expired, please login again';
        
        // 检测是否为PC端
        const appChannel = localStorage.getItem('appChannel');
        const isPC = appChannel === 'pc';
        const isTG = appChannel === 'tg';
        
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
      
      return Promise.reject(new Error('Session expired'));
    }
    
    return data;
  },
  (error) => {
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
  // 调试：定位是谁清除了 token（只在 debug_tg_login=1 时输出）
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('debug_tg_login') === '1') {
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