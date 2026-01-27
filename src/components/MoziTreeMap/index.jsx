'use client';

import React, { useState, useEffect } from 'react';
import { Grid } from 'antd-mobile';
import styles from './index.module.less';

const MoziTreeMap = ({ list = [], name, desc }) => {
  const [newList, setList] = useState([]);

  // 交换数组元素
  const swapElements = (arr, index1, index2) => {
    const temp = arr[index1];
    arr[index1] = arr[index2];
    arr[index2] = temp;
  };

  useEffect(() => {
    if (list && list.length > 0) {
      const handledArr = handleArr(list);
      setList(handledArr);
    }
  }, [list]);

  // 处理数组，计算 span 和调整布局
  const handleArr = (arr) => {
    // 按绝对值排序，找出最大的两个
    let sortedArr = arr.slice().sort((a, b) => {
      const aVal = Math.abs(parseFloat(String(a[desc]).replace('%', '')));
      const bVal = Math.abs(parseFloat(String(b[desc]).replace('%', '')));
      return bVal - aVal;
    });
    
    let maxValue1 = sortedArr[0][desc];
    let maxValue2 = sortedArr[1] ? sortedArr[1][desc] : maxValue1;

    const tempArr = arr.slice();

    // 给前两个最大值设置 span=2，其他为 span=1
    let bigSpanNum = 0;
    tempArr.forEach(item => {
      if (bigSpanNum === 2) {
        item.span = 1;
      } else {
        if (item[desc] === maxValue1 || item[desc] === maxValue2) {
          item.span = 2;
          bigSpanNum++;
        } else {
          item.span = 1;
        }
      }
    });

    // 调整布局，确保 span=2 的项不会出现在奇数位置
    let sumSpan = 0;
    tempArr.forEach((item, index) => {
      if (item.span === 2) {
        if ((sumSpan + item.span) % 4 === 1) {
          if (tempArr[index - 1].span === 2) {
            swapElements(tempArr, index, index - 2);
          } else {
            swapElements(tempArr, index, index - 1);
          }
        }
      }
      sumSpan += item.span;
    });

    return tempArr;
  };

  if (!list || list.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyText}>暂无数据</div>
      </div>
    );
  }

  return (
    <Grid className={styles.treemapContainer} columns={4} gap={4}>
      {newList.map((item, index) => {
        // 判断是涨还是跌
        const value = String(item[desc]);
        const numericValue = parseFloat(value.replace('%', ''));
        
        // 根据百分比范围设置颜色，与底部图例对齐
        let backgroundColor = '#B3B3B3'; // 默认灰色 (0.0%)
        
        if (numericValue > 5.0) {
          backgroundColor = '#11B787'; // >+5.0%
        } else if (numericValue > 2.0) {
          backgroundColor = 'rgba(17, 183, 135, 0.8)'; // +2.0% ~ +5.0%
        } else if (numericValue > 0.5) {
          backgroundColor = 'rgba(17, 183, 135, 0.6)'; // +0.5% ~ +2.0%
        } else if (numericValue > 0) {
          backgroundColor = 'rgba(17, 183, 135, 0.4)'; // 0.0% ~ +0.5%
        } else if (numericValue < -5.0) {
          backgroundColor = '#F04A4A'; // <-5.0%
        } else if (numericValue < -2.0) {
          backgroundColor = 'rgba(240, 74, 74, 0.8)'; // -5.0% ~ -2.0%
        } else if (numericValue < -0.5) {
          backgroundColor = 'rgba(240, 74, 74, 0.6)'; // -2.0% ~ -0.5%
        } else if (numericValue < 0) {
          backgroundColor = 'rgba(240, 74, 74, 0.4)'; // -0.5% ~ 0.0%
        }
        
        return (
          <Grid.Item 
            key={index} 
            className={styles.treemapItem}
            span={item.span}
            style={{ backgroundColor }}
          >
            <div className={styles.itemName}>{item[name]}</div>
            <div className={styles.itemValue}>{item[desc]}</div>
          </Grid.Item>
        );
      })}
    </Grid>
  );
};

export default MoziTreeMap;
