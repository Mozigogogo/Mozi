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
    if (token) {
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
             // 触发自定义事件，由 Layout 监听并显示弹窗
             const event = new CustomEvent('SHOW_POINTS_MODAL', { 
               detail: { 
                 points: data.data.points || data.data.rewardPoints || 10 
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
      }

      // 清除token
      clearToken();
      
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
    const { url, method = 'GET', data, params } = options;
    
    const config = {
      url,
      method,
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
  localStorage.removeItem('token');
};