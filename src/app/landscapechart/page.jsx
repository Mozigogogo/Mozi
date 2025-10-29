'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as echarts from 'echarts';
import { handleOptions } from '@/utils/chartUtils';
import styles from './page.module.less';

const LandscapeChart = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    // 获取传递过来的数据
    const chartDataStr = searchParams.get('data');
    if (!chartDataStr) {
      console.warn('没有图表数据');
      return;
    }

    let chartData;
    try {
      chartData = JSON.parse(decodeURIComponent(chartDataStr));
    } catch (e) {
      console.error('解析图表数据失败:', e);
      return;
    }

    // 初始化图表
    if (chartContainerRef.current && !chartRef.current) {
      const chart = echarts.init(chartContainerRef.current);
      chartRef.current = chart;

      // 设置图表配置
      if (chartData?.data && chartData?.type) {
        const option = handleOptions(chartData.data, chartData.type, chartData.msg);
        
        // 针对横屏页面，调整 dataZoom 位置
        if (option.dataZoom && Array.isArray(option.dataZoom)) {
          option.dataZoom.forEach(zoom => {
            if (zoom.type === 'slider') {
              zoom.bottom = '15%';  // 横屏页面的 dataZoom 位置
            }
          });
        }
        
        chart.setOption(option);
      }

      // 监听窗口大小变化
      const handleResize = () => {
        chart.resize();
      };
      window.addEventListener('resize', handleResize);

      // 强制横屏提示（移动端）
      if (typeof window !== 'undefined' && window.screen?.orientation) {
        try {
          // 尝试锁定为横屏模式
          window.screen.orientation.lock?.('landscape').catch(() => {
            console.log('无法锁定横屏模式');
          });
        } catch (e) {
          console.log('浏览器不支持屏幕方向锁定');
        }
      }

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.dispose();
          chartRef.current = null;
        }
      };
    }
  }, [searchParams]);

  const handleClose = () => {
    router.back();
  };

  return (
    <div className={styles.chartBox}>
      <div className={styles.chartHeader}>
        <div className={styles.chartClose} onClick={handleClose}>
          <span>✕</span>
        </div>
      </div>
      <div className={styles.mychart}>
        <div ref={chartContainerRef} className={styles.chart}></div>
      </div>
    </div>
  );
};

export default LandscapeChart;
