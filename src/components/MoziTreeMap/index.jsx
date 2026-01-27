'use client';

import React, { useState, useEffect } from 'react';
import styles from './index.module.less';

const MoziTreeMap = ({ list = [], name, desc }) => {
  const [processedList, setProcessedList] = useState([]);

  useEffect(() => {
    if (list && list.length > 0) {
      const processed = processData(list);
      setProcessedList(processed);
    }
  }, [list]);

  // 处理数据，根据数值大小分配权重
  const processData = (data) => {
    // 计算所有项的绝对值
    const withAbsValues = data.map(item => {
      const value = parseFloat(String(item[desc]).replace('%', ''));
      const absValue = Math.abs(value);
      return {
        ...item,
        absValue,
        originalValue: value
      };
    });

    // 按绝对值降序排序
    withAbsValues.sort((a, b) => b.absValue - a.absValue);

    // 计算总值用于归一化
    const totalAbsValue = withAbsValues.reduce((sum, item) => sum + item.absValue, 0);

    // 为每个项分配面积比例（面积与数值成正比）
    return withAbsValues.map((item) => {
      // 计算该项占总面积的百分比
      const areaPercent = (item.absValue / totalAbsValue) * 100;
      
      // 将面积百分比映射到宽度
      // 使用平方根让宽度更接近面积的视觉比例
      // 设置最小宽度为 15%，最大宽度为 50%
      const widthPercent = Math.max(15, Math.min(50, Math.sqrt(areaPercent) * 15));
      
      // 计算 flexBasis
      const flexBasis = `calc(${widthPercent.toFixed(2)}% - 2px)`;
      
      // 根据面积百分比计算合适的高度
      let minHeight;
      if (areaPercent > 15) {
        minHeight = '100px';
      } else if (areaPercent > 10) {
        minHeight = '85px';
      } else if (areaPercent > 5) {
        minHeight = '75px';
      } else {
        minHeight = '65px';
      }

      return {
        ...item,
        flexBasis,
        minHeight,
        areaPercent
      };
    });
  };

  // 根据数值获取颜色
  const getColor = (value) => {
    const numericValue = parseFloat(String(value).replace('%', ''));
    
    if (numericValue > 5.0) {
      return 'rgba(6, 194, 112, 1)';
    } else if (numericValue > 2.0) {
      return 'rgba(6, 194, 112, 0.8)';
    } else if (numericValue > 0.5) {
      return 'rgba(6, 194, 112, 0.6)';
    } else if (numericValue > 0) {
      return 'rgba(6, 194, 112, 0.4)';
    } else if (numericValue < -5.0) {
      return 'rgba(255, 91, 91, 1)';
    } else if (numericValue < -2.0) {
      return 'rgba(255, 91, 91, 0.8)';
    } else if (numericValue < -0.5) {
      return 'rgba(255, 91, 91, 0.6)';
    } else if (numericValue < 0) {
      return 'rgba(255, 91, 91, 0.4)';
    }
    
    return '#B3B3B3';
  };

  if (!list || list.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyText}>暂无数据</div>
      </div>
    );
  }

  return (
    <div className={styles.treemapContainer}>
      {processedList.map((item, index) => (
        <div
          key={index}
          className={styles.treemapItem}
          style={{
            backgroundColor: getColor(item[desc]),
            flexBasis: item.flexBasis,
            minHeight: item.minHeight
          }}
        >
          <div className={styles.itemName}>{item[name]}</div>
          <div className={styles.itemValue}>{item[desc]}</div>
        </div>
      ))}
    </div>
  );
};

export default MoziTreeMap;
