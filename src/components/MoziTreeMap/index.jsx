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
        const isNegative = value.includes('-');
        
        return (
          <Grid.Item 
            key={index} 
            className={`${styles.treemapItem} ${isNegative ? styles.red : styles.green}`}
            span={item.span}
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
