'use client';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

/**
 * 看涨看跌指示器组件（带投票功能）
 * @param {number} upCount - 看涨数量
 * @param {number} downCount - 看跌数量
 * @param {string} bullLabel - 看涨标签（可选，默认使用国际化）
 * @param {string} bearLabel - 看跌标签（可选，默认使用国际化）
 * @param {boolean} showPercentage - 是否显示百分比，默认true
 * @param {string} selected - 当前选中的选项 'bull' | 'bear' | null
 * @param {boolean} disabled - 是否禁用投票
 * @param {function} onSelect - 选择回调函数
 * @param {number} participants - 参与人数（可选）
 * @param {boolean} showParticipants - 是否显示参与人数，默认true
 */
const BullBearIndicator = ({ 
  upCount = 0, 
  downCount = 0,
  bullLabel,
  bearLabel,
  showPercentage = true,
  selected = null,
  disabled = false,
  onSelect,
  participants = 0,
  showParticipants = true
}) => {
  const { t } = useTranslation();
  
  // 使用传入的标签或默认国际化标签
  const bullText = bullLabel || t('community.voting.bullish');
  const bearText = bearLabel || t('community.voting.bearish');
  
  // 计算百分比
  const total = upCount + downCount;
  const bullPercentage = total > 0 ? (upCount / total) * 100 : 50;
  const bearPercentage = total > 0 ? (downCount / total) * 100 : 50;

  // 参与人数显示
  const displayCount = useMemo(() => {
    return t('community.voting.participants', { count: participants });
  }, [participants, t]);

  // 处理点击
  const handleSelect = (type) => {
    if (onSelect) {
      onSelect(type);
    }
  };

  return (
    <div className={styles.container}>
      {/* 参与人数 */}
      {showParticipants && participants > 0 && (
        <div className={styles.participantsCount}>{displayCount}</div>
      )}
      
      {/* 指示器 */}
      <div className={`${styles.indicator} ${disabled ? styles.disabled : ''}`}>
        <div 
          className={`${styles.bullSide} ${selected === 'bull' ? styles.selected : ''} ${onSelect ? styles.clickable : ''}`}
          style={{ width: `${bullPercentage}%` }}
          onClick={() => handleSelect('bull')}
        >
          <span className={styles.label}>{bullText}</span>
        </div>
        {/* 中间分隔间隙 */}
        <div className={styles.divider} />
        <div 
          className={`${styles.bearSide} ${selected === 'bear' ? styles.selected : ''} ${onSelect ? styles.clickable : ''}`}
          style={{ width: `${bearPercentage}%` }}
          onClick={() => handleSelect('bear')}
        >
          <span className={styles.label}>{bearText}</span>
        </div>
      </div>
      
      {/* 百分比 */}
      {showPercentage && (
        <div className={styles.percentages}>
          <span className={styles.bullPercent}>{bullPercentage.toFixed(0)}%</span>
          <span className={styles.bearPercent}>{bearPercentage.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
};

export default BullBearIndicator;
