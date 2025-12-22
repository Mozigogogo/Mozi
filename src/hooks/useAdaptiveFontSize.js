import { useMemo } from 'react';

/**
 * 根据文本长度自动调整字号的 Hook
 * @param {string} text - 要显示的文本
 * @param {Object} options - 配置选项
 * @param {number} options.maxLength - 触发缩小的最大长度（默认：7）
 * @param {string} options.baseFontSize - 基础字号（默认：'clamp(14px, 3.5vw, 18px)'）
 * @param {string} options.minFontSize - 最小字号（默认：'clamp(11px, 2.5vw, 14px)'）
 * @param {number} options.scaleThreshold - 开始缩放的阈值长度（默认：8）
 * @returns {string} 计算后的字号
 */
export const useAdaptiveFontSize = (text, options = {}) => {
  const {
    maxLength = 7,
    baseFontSize = 'clamp(14px, 3.5vw, 18px)',
    minFontSize = 'clamp(11px, 2.5vw, 14px)',
    scaleThreshold = 8,
  } = options;

  const fontSize = useMemo(() => {
    if (!text) return baseFontSize;
    
    const length = text.length;
    
    // 如果文本长度小于等于最大长度，使用基础字号
    if (length <= maxLength) {
      return baseFontSize;
    }
    
    // 如果文本长度超过缩放阈值，使用最小字号
    if (length >= scaleThreshold) {
      return minFontSize;
    }
    
    // 在 maxLength 和 scaleThreshold 之间，线性插值
    // 例如：maxLength=6, scaleThreshold=8
    // length=7 时，返回中间值
    const ratio = (length - maxLength) / (scaleThreshold - maxLength);
    
    // 简单的线性插值：根据比例返回中间字号
    // 这里返回一个介于基础字号和最小字号之间的值
    if (ratio <= 0.5) {
      // 前半段：使用稍小的字号
      return 'clamp(12px, 3vw, 16px)';
    } else {
      // 后半段：使用更小的字号
      return minFontSize;
    }
  }, [text, maxLength, baseFontSize, minFontSize, scaleThreshold]);

  return fontSize;
};

/**
 * 简化版：根据文本长度返回预设的字号级别
 * @param {string} text - 要显示的文本
 * @returns {string} 字号样式
 */
export const useSimpleAdaptiveFontSize = (text) => {
  return useMemo(() => {
    if (!text) return 'clamp(14px, 3.5vw, 18px)';
    
    const length = text.length;
    
    // 短文本（1-6个字符）：大字号
    if (length <= 6) {
      return 'clamp(14px, 3.5vw, 18px)';
    }
    // 中等文本（7-9个字符）：中等字号
    else if (length <= 9) {
      return 'clamp(12px, 3vw, 16px)';
    }
    // 长文本（10+个字符）：小字号
    else {
      return 'clamp(11px, 2.5vw, 14px)';
    }
  }, [text]);
};

export default useAdaptiveFontSize;
