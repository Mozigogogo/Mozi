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
    return response.data;
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