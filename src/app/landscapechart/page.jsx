'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as echarts from 'echarts';
import styles from './page.module.less';

export default function LandscapeChart() {
  const chartRef = useRef(null);
  const router = useRouter();

  // 处理图表选项
  const handleOptions = (data, type) => {
    if (type === 'updownbarline') {
      return {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            crossStyle: {
              color: '#999'
            }
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: [
          {
            type: 'category',
            data: data.map(item => item.time),
            axisPointer: {
              type: 'shadow'
            },
            axisLabel: {
              interval: Math.floor(data.length / 10),
              formatter: function(value) {
                return value.substring(5, 16);
              }
            }
          }
        ],
        yAxis: [
          {
            type: 'value',
            name: '资金费率(%)',
            axisLabel: {
              formatter: '{value}%'
            }
          }
        ],
        series: [
          {
            name: '资金费率',
            type: 'line',
            data: data.map(item => parseFloat(item.value)),
            itemStyle: {
              color: function(params) {
                return parseFloat(params.value) >= 0 ? '#ff3333' : '#02c076';
              }
            },
            lineStyle: {
              width: 2
            }
          }
        ]
      };
    }
    return {};
  };

  useEffect(() => {
    // 从 sessionStorage 获取数据
    const chartDataStr = sessionStorage.getItem('chartData');
    if (!chartDataStr) {
      alert('没有图表数据');
      router.push('/');
      return;
    }

    const chartData = JSON.parse(chartDataStr);
    
    // 初始化图表
    if (chartRef.current) {
      const chart = echarts.init(chartRef.current);
      
      // 设置图表选项
      if (chartData.data && chartData.type) {
        chart.setOption(handleOptions(chartData.data, chartData.type));
      }
      
      // 窗口大小变化时重新调整图表大小
      const handleResize = () => {
        chart.resize();
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
      };
    }
  }, [router]);

  // 返回上一页
  const handleBack = () => {
    router.back();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleBack}>返回</button>
        <h1 className={styles.title}>资金费率</h1>
      </div>
      <div ref={chartRef} className={styles.chart}></div>
    </div>
  );
}