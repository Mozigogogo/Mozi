/**
 * 告警配置管理 Hook
 * 提供全局单例的告警配置获取和缓存机制
 */
import { useRef, useCallback, useEffect } from 'react';
import { getAlertConfig } from '../api/user';

// 全局缓存和状态管理（跨组件共享）
const globalCache = {
  data: null,              // 缓存的配置数据
  timestamp: 0,            // 缓存时间戳
  promise: null,           // 正在进行的请求 Promise
  isFetching: false,       // 是否正在获取
};

// 缓存有效期：5分钟
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * 使用告警配置的 Hook
 * @param {Object} options - 配置选项
 * @param {boolean} options.autoFetch - 是否自动获取（默认 false）
 * @param {boolean} options.useCache - 是否使用缓存（默认 true）
 * @returns {Object} { config, loading, error, fetchConfig, clearCache }
 */
export const useAlertConfig = (options = {}) => {
  const { autoFetch = false, useCache = true } = options;
  
  const configRef = useRef(null);
  const loadingRef = useRef(false);
  const errorRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * 获取告警配置
   * @param {boolean} forceRefresh - 是否强制刷新（忽略缓存）
   * @returns {Promise<Object|null>}
   */
  const fetchConfig = useCallback(async (forceRefresh = false) => {
    try {
      // 检查缓存
      if (useCache && !forceRefresh && globalCache.data) {
        const now = Date.now();
        const cacheAge = now - globalCache.timestamp;
        
        if (cacheAge < CACHE_DURATION) {
          console.log('✅ 使用缓存的告警配置（缓存年龄:', Math.floor(cacheAge / 1000), '秒）');
          configRef.current = globalCache.data;
          
          // 同步到 localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('alertConfig', JSON.stringify(globalCache.data));
          }
          
          return globalCache.data;
        } else {
          console.log('⏰ 缓存已过期，重新获取');
        }
      }

      // 如果正在获取中，等待现有请求
      if (globalCache.isFetching && globalCache.promise) {
        console.log('⏳ 告警配置正在获取中，等待现有请求...');
        return await globalCache.promise;
      }

      // 标记开始获取
      loadingRef.current = true;
      globalCache.isFetching = true;
      errorRef.current = null;

      console.log('🔄 开始获取告警配置...');

      // 创建请求 Promise
      globalCache.promise = getAlertConfig();
      const res = await globalCache.promise;

      if (!mountedRef.current) return null;

      if (res?.code === 0) {
        const config = res.data || null;
        
        // 更新全局缓存
        globalCache.data = config;
        globalCache.timestamp = Date.now();
        
        // 更新组件状态
        configRef.current = config;
        
        // 同步到 localStorage
        if (typeof window !== 'undefined') {
          if (config) {
            localStorage.setItem('alertConfig', JSON.stringify(config));
            console.log('✅ 告警配置获取成功并已缓存');
          } else {
            localStorage.removeItem('alertConfig');
            console.log('📝 用户暂未配置告警');
          }
        }
        
        return config;
      } else {
        const error = res?.errorMsg || '获取失败';
        errorRef.current = error;
        console.warn('⚠️ 获取告警配置失败:', error);
        return null;
      }
    } catch (error) {
      if (!mountedRef.current) return null;
      
      errorRef.current = error.message || '网络异常';
      console.error('❌ 获取告警配置异常:', error);
      return null;
    } finally {
      if (mountedRef.current) {
        loadingRef.current = false;
      }
      globalCache.isFetching = false;
      globalCache.promise = null;
    }
  }, [useCache]);

  /**
   * 清除缓存
   */
  const clearCache = useCallback(() => {
    globalCache.data = null;
    globalCache.timestamp = 0;
    configRef.current = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('alertConfig');
    }
    
    console.log('🗑️ 告警配置缓存已清除');
  }, []);

  /**
   * 从 localStorage 恢复配置
   */
  const restoreFromLocalStorage = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem('alertConfig');
      if (stored) {
        const config = JSON.parse(stored);
        configRef.current = config;
        
        // 同步到全局缓存
        if (!globalCache.data) {
          globalCache.data = config;
          globalCache.timestamp = Date.now();
        }
        
        return config;
      }
    } catch (error) {
      console.error('恢复告警配置失败:', error);
    }
    
    return null;
  }, []);

  // 自动获取
  useEffect(() => {
    if (autoFetch) {
      // 先尝试从 localStorage 恢复
      const restored = restoreFromLocalStorage();
      
      // 如果没有恢复到数据，则获取
      if (!restored) {
        fetchConfig();
      }
    }
  }, [autoFetch, fetchConfig, restoreFromLocalStorage]);

  return {
    config: configRef.current,
    loading: loadingRef.current,
    error: errorRef.current,
    fetchConfig,
    clearCache,
    restoreFromLocalStorage,
  };
};

/**
 * 获取告警配置（非 Hook 版本，用于非组件场景）
 * @param {boolean} forceRefresh - 是否强制刷新
 * @returns {Promise<Object|null>}
 */
export const fetchAlertConfig = async (forceRefresh = false) => {
  try {
    // 检查缓存
    if (!forceRefresh && globalCache.data) {
      const now = Date.now();
      const cacheAge = now - globalCache.timestamp;
      
      if (cacheAge < CACHE_DURATION) {
        console.log('✅ 使用缓存的告警配置');
        return globalCache.data;
      }
    }

    // 如果正在获取中，等待现有请求
    if (globalCache.isFetching && globalCache.promise) {
      console.log('⏳ 等待现有请求...');
      const res = await globalCache.promise;
      return res?.code === 0 ? (res.data || null) : null;
    }

    // 开始获取
    globalCache.isFetching = true;
    globalCache.promise = getAlertConfig();
    
    const res = await globalCache.promise;

    if (res?.code === 0) {
      const config = res.data || null;
      globalCache.data = config;
      globalCache.timestamp = Date.now();
      
      // 同步到 localStorage
      if (typeof window !== 'undefined') {
        if (config) {
          localStorage.setItem('alertConfig', JSON.stringify(config));
        } else {
          localStorage.removeItem('alertConfig');
        }
      }
      
      return config;
    }
    
    return null;
  } catch (error) {
    console.error('获取告警配置失败:', error);
    return null;
  } finally {
    globalCache.isFetching = false;
    globalCache.promise = null;
  }
};

/**
 * 清除全局缓存
 */
export const clearAlertConfigCache = () => {
  globalCache.data = null;
  globalCache.timestamp = 0;
  globalCache.promise = null;
  globalCache.isFetching = false;
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem('alertConfig');
  }
};
