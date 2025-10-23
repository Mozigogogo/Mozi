/**
 * 恐慌贪婪指数组件
 */
'use client';

import { Popover } from 'antd-mobile';
import styles from './index.module.less';
import './popover-global.css';

const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';
const warnIcon = `${CDN_PREFIX}/icon/warn.png`;

// Tooltip 提示内容
const TooltipContent = () => (
  <div className={styles.tooltipContent}>
    <h4 className={styles.tooltipTitle}>恐惧贪婪指数</h4>
    <ul className={styles.tooltipList}>
      <li><strong>数值越低（接近0）：</strong>投资者越恐惧，市场可能被低估；</li>
      <li><strong>数值越高（接近100）：</strong>投资者越贪婪，市场可能过热。</li>
    </ul>
  </div>
);

export default function FearGreedIndex({ 
  index = 0, 
  category = '加载中...', 
  onClick,
  // CSS 调试参数（可选，用于覆盖默认值）
  ballTop,
  ballLeft
}) {
  // 计算圆球旋转角度
  // index 从 0-100，对应圆弧从 -90度（左端）到 90度（右端）
  // 0 = 极度恐慌（绿色左端）= -90度
  // 50 = 中性（黄色中间）= 0度
  // 100 = 极度贪婪（红色右端）= 90度
  const rotation = -90 + (index / 145) * 180;
  
  // 根据 index 值自动匹配最佳的圆球位置参数
  const getBallPosition = (indexValue) => {
    // 如果传入了自定义参数，则使用自定义参数
    if (ballTop !== undefined && ballLeft !== undefined) {
      return {
        top: ballTop,
        left: ballLeft
      };
    }
    
    // 确保 indexValue 是整数
    const value = Math.round(indexValue);
    
    // 每个数字单独匹配（0-100）
    // 这些值需要通过测试页面调试后填入
    switch (value) {
      case 0: return { top: -8, left: 49 };
      case 1: return { top: -8, left: 49 };
      case 2: return { top: -9, left: 49 };
      case 3: return { top: -9, left: 49 };
      case 4: return { top: -9, left: 49 };
      case 5: return { top: -9, left: 49 };
      case 6: return { top: -9, left: 49 };
      case 7: return { top: -9, left: 49 };
      case 8: return { top: -9, left: 49 };
      case 9: return { top: -9, left: 49 };
      case 10: return { top: -9, left: 50 };
      case 11: return { top: -9, left: 50 };
      case 12: return { top: -9, left: 50 };
      case 13: return { top: -9, left: 50 };
      case 14: return { top: -9, left: 50 };
      case 15: return { top: -9, left: 50 };
      case 16: return { top: -9, left: 51 };
      case 17: return { top: -9, left: 51 };
      case 18: return { top: -9, left: 51 };
      case 19: return { top: -9, left: 51 };
      case 20: return { top: -9, left: 51 };
      case 21: return { top: -9, left: 51 };
      case 22: return { top: -9, left: 51 };
      case 23: return { top: -9, left: 51 };
      case 24: return { top: -9, left: 52 };
      case 25: return { top: -9, left: 52 };
      case 26: return { top: -9, left: 52 };
      case 27: return { top: -9, left: 52 };
      case 28: return { top: -9, left: 52 };
      case 29: return { top: -9, left: 52 };
      case 30: return { top: -9, left: 53 };
      case 31: return { top: -9, left: 53 };
      case 32: return { top: -9, left: 54 };
      case 33: return { top: -9, left: 54 };
      case 34: return { top: -9, left: 54 };
      case 35: return { top: -9, left: 54 };
      case 36: return { top: -9, left: 54 };
      case 37: return { top: -8, left: 54 };
      case 38: return { top: -8, left: 54 };
      case 39: return { top: -8, left: 55 };
      case 40: return { top: -8, left: 55 };
      case 41: return { top: -8, left: 55 };
      case 42: return { top: -7, left: 55 };
      case 43: return { top: -7, left: 55 };
      case 44: return { top: -7, left: 55 };
      case 45: return { top: -7, left: 55 };
      case 46: return { top: -7, left: 56 };
      case 47: return { top: -7, left: 56 };
      case 48: return { top: -7, left: 58 };
      case 49: return { top: -7, left: 60 };
      case 50: return { top: -7, left: 68 };
      case 51: return { top: -7, left: 68 };
      case 52: return { top: -7, left: 68 };
      case 53: return { top: -6, left: 68 };
      case 54: return { top: -6, left: 69 };
      case 55: return { top: -5, left: 69 };
      case 56: return { top: -4, left: 70 };
      case 57: return { top: -4, left: 70 };
      case 58: return { top: -3, left: 71 };
      case 59: return { top: -2, left: 71 };
      case 60: return { top: -1, left: 72 };
      case 61: return { top: -1, left: 72 };
      case 62: return { top: 0, left: 73 };
      case 63: return { top: 1, left: 73 };
      case 64: return { top: 2, left: 74 };
      case 65: return { top: 2, left: 74 };
      case 66: return { top: 3, left: 75 };
      case 67: return { top: 4, left: 75 };
      case 68: return { top: 6, left: 76 };
      case 69: return { top: 7, left: 76 };
      case 70: return { top: 8, left: 77 };
      case 71: return { top: 9, left: 77 };
      case 72: return { top: 10, left: 77 };
      case 73: return { top: 12, left: 78 };
      case 74: return { top: 15, left: 79 };
      case 75: return { top: 16, left: 79 };
      case 76: return { top: 18, left: 80 };
      case 77: return { top: 19, left: 79 };
      case 78: return { top: 20, left: 79 };
      case 79: return { top: 21, left: 78 };
      case 80: return { top: 22, left: 78 };
      case 81: return { top: 23, left: 78 };
      case 82: return { top: 24, left: 78 };
      case 83: return { top: 25, left: 76 };
      case 84: return { top: 26, left: 76 };
      case 85: return { top: 27, left: 76 };
      case 86: return { top: 28, left: 75 };
      case 87: return { top: 29, left: 75 };
      case 88: return { top: 30, left: 73 };
      case 89: return { top: 30, left: 72 };
      case 90: return { top: 30, left: 72 };
      case 91: return { top: 29, left: 71 };
      case 92: return { top: 28, left: 70 };
      case 93: return { top: 28, left: 69 };
      case 94: return { top: 28, left: 68 };
      case 95: return { top: 28, left: 67 };
      case 96: return { top: 28, left: 66 };
      case 97: return { top: 28, left: 65 };
      case 98: return { top: 28, left: 64 };
      case 99: return { top: 28, left: 64 };
      case 100: return { top: 33, left: 63 };
      
      default:
        // 默认值（处理超出范围的情况）
        return { top: 0, left: 50 };
    }
  };
  
  const ballPosition = getBallPosition(index);
  
  return (
    <div className={styles.indicatorItem}>
      <div className={styles.indicatorHeader}>
        <span className={styles.indicatorTitle}>恐慌贪婪指数</span>
        <Popover
          content={<TooltipContent />}
          trigger="click"
          placement="bottom"
        >
          <img className={styles.infoIcon} src={warnIcon} alt="info" />
        </Popover>
      </div>
      <div className={styles.fearGreedContainer}>
        <div className={styles.fearGreedChart}>
          <div 
            className={styles.fearGreedSemicircle}
            onClick={onClick}
          >
            <div className={styles.fearGreedInner}>
              <div className={styles.fearGreedValue}>{index}</div>
              <div className={styles.fearGreedText}>{category}</div>
            </div>
            <div 
              className={styles.fearGreedBall}
              style={{
                top: `${ballPosition.top}px`,
                left: `${ballPosition.left}px`,
                transform: `rotate(${rotation}deg)`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

