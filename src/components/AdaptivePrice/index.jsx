'use client';

import { useMemo } from 'react';
import styles from './index.module.less';

/**
 * 统计价格中的有效数字位数（排除小数点和前导0）
 * @param {string|number} price - 价格
 * @returns {number} 有效数字位数
 */
const countSignificantDigits = (price) => {
  if (!price) return 0;
  
  const priceStr = String(price);
  
  // 移除小数点
  const withoutDot = priceStr.replace('.', '');
  
  // 如果是小数（包含小数点），去除前导0
  if (priceStr.includes('.')) {
    // 例如：0.0187 -> 0187 -> 187，有效数字是3位
    // 例如：0.730076 -> 0730076 -> 730076，有效数字是6位
    const trimmed = withoutDot.replace(/^0+/, '');
    return trimmed.length;
  }
  
  // 整数直接返回长度
  return withoutDot.length;
};

/**
 * 根据价格的有效数字位数计算字号
 * @param {string} price - 价格字符串
 * @returns {string} 字号样式
 */
const getPriceFontSize = (price) => {
  if (!price) return 'clamp(16px, 3.5vw, 20px)';
  
  const significantDigits = countSignificantDigits(price);
  
  // 6位有效数字及以下：大字号
  if (significantDigits <= 6) {
    return 'clamp(16px, 3.5vw, 20px)';
  }
  // 7-9位有效数字：中等字号
  else if (significantDigits <= 9) {
    return 'clamp(14px, 3vw, 17px)';
  }
  // 10位以上有效数字：小字号
  else {
    return 'clamp(12px, 2.5vw, 15px)';
  }
};

/**
 * 自适应字号的价格组件
 * @param {string|number} price - 价格
 * @param {string} className - 自定义类名
 */
const AdaptivePrice = ({ price, className = '' }) => {
  const fontSize = useMemo(() => getPriceFontSize(price), [price]);

  return (
    <span 
      className={`${styles.priceText} ${className}`} 
      style={{ fontSize }}
    >
      {price}
    </span>
  );
};

export default AdaptivePrice;
