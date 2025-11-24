/**
 * Amplitude Hook
 * 在 React 组件中使用 Amplitude 埋点
 */

import { useEffect, useCallback } from 'react';
import { initAmplitude, trackEvent, trackPageView, trackButtonClick, isAmplitudeEnabled } from '@/utils/amplitude';

/**
 * 使用 Amplitude 的 Hook
 * @param {string} pageName - 页面名称
 * @param {Object} options - 配置选项
 */
export const useAmplitude = (pageName, options = {}) => {
  const {
    autoTrackPageView = true,
    sampleRate = 1,
    autocapture = true
  } = options;

  // 初始化 Amplitude（仅生产环境）
  useEffect(() => {
    if (isAmplitudeEnabled()) {
      initAmplitude({ sampleRate, autocapture }).catch((error) => {
        console.error('Failed to initialize Amplitude:', error);
      });
    }
  }, [sampleRate, autocapture]);

  // 自动追踪页面浏览
  useEffect(() => {
    if (autoTrackPageView && pageName) {
      const timer = setTimeout(() => {
        trackPageView(pageName);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pageName, autoTrackPageView]);

  // 返回追踪函数
  const track = useCallback((eventName, properties = {}) => {
    trackEvent(eventName, properties);
  }, []);

  const trackClick = useCallback((buttonName, properties = {}) => {
    trackButtonClick(buttonName, properties);
  }, []);

  return {
    track,
    trackClick,
    trackPageView: (properties = {}) => trackPageView(pageName, properties)
  };
};

export default useAmplitude;
