import axios from 'axios';
import { INTERFACE_URL } from './constants.js';

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

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    const data = response.data;
    
    // 检查返回的code是否为401
    if (data && data.code === 401) {
      // 清除token
      clearToken();
      
      // 只在浏览器环境中执行
      if (typeof window !== 'undefined') {
        // 获取当前语言
        const language = localStorage.getItem('i18nextLng') || 'zh';
        const message = language === 'zh' 
          ? '登录已失效，请重新登录' 
          : 'Session expired, please login again';
        
        // 尝试使用 antd-mobile 的 Toast（项目中已经在使用）
        // 如果不可用，则使用 alert
        try {
          // 动态导入 antd-mobile Toast
          import('antd-mobile').then(({ Toast }) => {
            Toast.show({
              content: message,
              position: 'bottom',
              duration: 2000
            });
            // Toast显示后跳转
            setTimeout(() => {
              window.location.href = '/user?showLogin=true';
            }, 500);
          }).catch(() => {
            // 如果导入失败，直接跳转
            window.location.href = '/user?showLogin=true';
          });
        } catch (e) {
          // 如果出错，直接跳转
          window.location.href = '/user?showLogin=true';
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