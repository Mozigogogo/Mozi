'use client';

import { useMemo } from 'react';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import styles from './index.module.less';

/**
 * 计算文本显示长度（用于字号调整）
 * 特殊处理 0.0{n}xx 格式：0.0{2}22 算作基准长度 8
 * @param {string|number} price - 价格
 * @returns {number} 显示长度
 */
const calculateDisplayLength = (price) => {
  if (!price) return 0;
  
  const priceStr = String(price);
  
  // 检查是否是 0.0{n}xx 格式
  const smallDecimalMatch = priceStr.match(/^0\.0\{(\d+)\}(\d+)$/);
  
  if (smallDecimalMatch) {
    // 例如：0.0{2}22 -> n=2, digits=22
    // 显示长度 = "0.0{".length + n的位数 + "}".length + digits.length
    // = 4 + 1 + 1 + 2 = 8
    const n = smallDecimalMatch[1];
    const digits = smallDecimalMatch[2];
    return 4 + n.length + 1 + digits.length;
  }
  
  // 普通数字，直接返回字符串长度
  return priceStr.length;
};

/**
 * 根据价格文本长度计算字号
 * 基准：0.0{2}22 长度为 8，使用默认字号
 * 每多一个字符，缩小一个档次，最小不低于 10px
 * @param {string} price - 价格字符串
 * @returns {string} 字号样式
 */
const getPriceFontSize = (price) => {
  if (!price) return 'clamp(16px, 3.5vw, 20px)';
  
  const displayLength = calculateDisplayLength(price);
  const baseLength = 8; // 0.0{2}22 的长度
  
  // 计算超出基准长度的字符数
  const extraChars = Math.max(0, displayLength - baseLength);
  
  // 根据超出字符数调整字号（最小 10px）
  if (extraChars === 0) {
    // 基准字号：长度 <= 8
    return 'clamp(16px, 3.5vw, 20px)';
  } else if (extraChars === 1) {
    // 多1个字符：缩小一档
    return 'clamp(14px, 3vw, 17px)';
  } else if (extraChars === 2) {
    // 多2个字符：缩小两档
    return 'clamp(12px, 2.5vw, 15px)';
  } else {
    // 多3个或更多字符：最小字号（不低于 10px）
    return 'clamp(10px, 2vw, 10px)';
  }
};

/**
 * 自适应字号的价格组件
 * @param {string|number} price - 价格
 * @param {string} className - 自定义类名
 */
const AdaptivePrice = ({ price, className = '', formatSmallDecimal = false, maxDecimals = 2 }) => {
  const { formatSmallDecimal: formatSmallDecimalFn } = useFormatNumber();

  const displayPrice = useMemo(() => {
    if (!formatSmallDecimal) return price;
    if (typeof price !== 'string' && typeof price !== 'number') return price;
    return formatSmallDecimalFn(price, maxDecimals);
  }, [formatSmallDecimal, formatSmallDecimalFn, maxDecimals, price]);

  const fontSize = useMemo(() => getPriceFontSize(displayPrice), [displayPrice]);

  return (
    <span 
      className={`${styles.priceText} ${className}`} 
      style={{ fontSize }}
    >
      {displayPrice}
    </span>
  );
};

export default AdaptivePrice;
