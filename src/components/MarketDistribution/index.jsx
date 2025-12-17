'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getMarketDistribution, getFearGreedIndex, getAggregationDetail } from '../../api/market';
import DistributionChart from './DistributionChart';
import FearGreedIndex from './FearGreedIndex';
import BTCMarketShare from './BTCMarketShare';
import styles from './index.module.less';

export default function MarketDistribution({ showUpdateTime = true, isPC = false }) {
  const { t } = useTranslation();
  const title = t('market.marketDistribution');
  // 恐慌贪婪指数
  const [fearGreedIndex, setFearGreedIndex] = useState(76);
  const [fearGreedCategory, setFearGreedCategory] = useState(t('market.fearGreed.greed'));
  
  // 涨跌分布数据
  const [distributionData, setDistributionData] = useState({
    updateTime: t('common.loading'),
    chartData: [
      { range: '>10%', value: 0, type: 'up' },
      { range: '10-7', value: 0, type: 'up' },
      { range: '7-5', value: 0, type: 'up' },
      { range: '5-3', value: 0, type: 'up' },
      { range: '3-0', value: 0, type: 'up' },
      { range: '0', value: 0, type: 'neutral' },
      { range: '0-3', value: 0, type: 'down' },
      { range: '3-5', value: 0, type: 'down' },
      { range: '5-7', value: 0, type: 'down' },
      { range: '7-10', value: 0, type: 'down' },
      { range: '>10%', value: 0, type: 'down' }
    ],
    statistics: {
      up: 0,
      neutral: 0,
      down: 0
    },
    btcMarketShare: {
      percentage: '0%',
      change: '0%'
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketDistribution();
    fetchFearGreedIndex();
    fetchAggregationDetail();
    
    // 设置定时刷新（每30秒）
    const interval = setInterval(() => {
      fetchMarketDistribution();
      fetchFearGreedIndex();
      fetchAggregationDetail();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchMarketDistribution = async () => {
    try {
      setLoading(true);
      const response = await getMarketDistribution();
      
      if (response?.data) {
        const apiData = response.data;
        
        // 数据映射：将API返回的数据映射到组件需要的格式
        // API区间：0-3%, 3-5%, 5-10%, 10-20%, 20%+
        // 组件区间：0-3%, 3-5%, 5-7%, 7-10%, 10%+
        const gt5To7Up = Math.round(apiData.gt5To10Up * 0.4) || 0;  // 5-7% 约占 5-10% 的 40%
        const gt7To10Up = apiData.gt5To10Up - gt5To7Up || 0;        // 7-10%
        const gt10PlusUp = (apiData.gt10To20Up || 0) + (apiData.gt20Up || 0); // 10%以上
        
        const gt5To7Down = Math.round(apiData.gt5To10Down * 0.4) || 0;
        const gt7To10Down = apiData.gt5To10Down - gt5To7Down || 0;
        const gt10PlusDown = (apiData.gt10To20Down || 0) + (apiData.gt20Down || 0);
        
        // 计算统计数据
        const totalUp = (apiData.gt0To3Up || 0) + (apiData.gt3To5Up || 0) + (apiData.gt5To10Up || 0) + (apiData.gt10To20Up || 0) + (apiData.gt20Up || 0);
        const totalDown = (apiData.gt0To3Down || 0) + (apiData.gt3To5Down || 0) + (apiData.gt5To10Down || 0) + (apiData.gt10To20Down || 0) + (apiData.gt20Down || 0);
        const totalNeutral = apiData.gt0 || 0;
        
        // 获取当前时间
        const now = new Date();
        const updateTime = `${now.getMonth() + 1}.${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${t('common.updated')}`;
        
        setDistributionData(prev => ({
          updateTime,
          chartData: [
            { range: '>10%', value: gt10PlusUp, type: 'up' },
            { range: '10-7', value: gt7To10Up, type: 'up' },
            { range: '7-5', value: gt5To7Up, type: 'up' },
            { range: '5-3', value: apiData.gt3To5Up || 0, type: 'up' },
            { range: '3-0', value: apiData.gt0To3Up || 0, type: 'up' },
            { range: '0', value: totalNeutral, type: 'neutral' },
            { range: '0-3', value: apiData.gt0To3Down || 0, type: 'down' },
            { range: '3-5', value: apiData.gt3To5Down || 0, type: 'down' },
            { range: '5-7', value: gt5To7Down, type: 'down' },
            { range: '7-10', value: gt7To10Down, type: 'down' },
            { range: '>10%', value: gt10PlusDown, type: 'down' }
          ],
          statistics: {
            up: totalUp,
            neutral: totalNeutral,
            down: totalDown
          },
          btcMarketShare: prev.btcMarketShare // 保持原有的BTC市场占有率数据（使用最新的state）
        }));
      }
    } catch (error) {
      console.error('获取涨跌分布数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取恐慌贪婪指数
  const fetchFearGreedIndex = async () => {
    try {
      const response = await getFearGreedIndex();
      
      if (response?.data) {
        // 使用 value 字段
        const index = response.data.value || 0;
        // 确保指数在 0-100 之间
        const validIndex = Math.min(Math.max(Number(index) || 0, 0), 100);
        setFearGreedIndex(validIndex);
        
        if (response.data.category) {
          const raw = String(response.data.category).toLowerCase();
          let mapped = t('market.fearGreed.neutral');
          if (raw.includes('extreme') && raw.includes('fear') || raw.includes('极度恐惧')) {
            mapped = t('market.fearGreed.extremeFear');
          } else if (raw.includes('fear') || raw.includes('恐惧')) {
            mapped = t('market.fearGreed.fear');
          } else if (raw.includes('neutral') || raw.includes('中性')) {
            mapped = t('market.fearGreed.neutral');
          } else if (raw.includes('extreme') && raw.includes('greed') || raw.includes('极度贪婪')) {
            mapped = t('market.fearGreed.extremeGreed');
          } else if (raw.includes('greed') || raw.includes('贪婪')) {
            mapped = t('market.fearGreed.greed');
          }
          setFearGreedCategory(mapped);
        }
      }
    } catch (error) {
      console.error('获取恐慌贪婪指数失败:', error);
    }
  };

  // 获取市场聚合数据（BTC市场占有率、市值、成交量等）
  const fetchAggregationDetail = async () => {
    try {
      const response = await getAggregationDetail();
      
      if (response?.data) {
        const { btcDominanceFmt, btcDominanceChangeFmt } = response.data;
        
        // 只有当数据有效时才更新（避免设置为 '0%'）
        if (btcDominanceFmt) {
          setDistributionData(prev => ({
            ...prev,
            btcMarketShare: {
              percentage: btcDominanceFmt,
              change: btcDominanceChangeFmt || prev.btcMarketShare.change
            }
          }));
          console.log('✅ 更新BTC市场占有率:', btcDominanceFmt, '变化:', btcDominanceChangeFmt);
        } else {
          console.log('⚠️ BTC市场占有率数据为空，保持旧值:', response.data);
        }
      }
    } catch (error) {
      console.error('❌ 获取市场聚合数据失败:', error);
    }
  };

  const handleFearGreedClick = () => {
    // 可以实现拖拽或点击交互
    console.log('恐慌贪婪指数被点击');
  };

  // PC端布局：左右分布
  if (isPC) {
    return (
      <div className={`${styles.marketDistributionWrapper} ${styles.pcMode}`}>
        {/* 标题区域 */}
        <div className={styles.distributionHeader}>
          <div className={styles.distributionTitle}>{title}</div>
          {showUpdateTime && (
            <div className={styles.distributionUpdateTime}>
              {loading ? t('common.loading') : distributionData.updateTime}
            </div>
          )}
        </div>

        {/* PC端左右布局 */}
        <div className={styles.pcContent}>
          {/* 左侧：涨跌分布柱状图 */}
          <div className={styles.pcLeft}>
            <DistributionChart 
              chartData={distributionData.chartData}
              statistics={distributionData.statistics}
            />
          </div>

          {/* 右侧：恐惧贪婪指数 + BTC市场占有率 */}
          <div className={styles.pcRight}>
            <FearGreedIndex 
              index={fearGreedIndex}
              category={fearGreedCategory}
              onClick={handleFearGreedClick}
              isPC={true}
            />
            <BTCMarketShare 
              percentage={distributionData.btcMarketShare.percentage}
              change={distributionData.btcMarketShare.change}
            />
          </div>
        </div>
      </div>
    );
  }

  // 移动端布局：上下分布
  return (
    <div className={styles.marketDistributionWrapper}>
      {/* 标题区域 - 独立出来 */}
      <div className={styles.distributionHeader}>
        <div className={styles.distributionTitle}>{title}</div>
        {showUpdateTime && (
          <div className={styles.distributionUpdateTime}>
            {loading ? t('common.loading') : distributionData.updateTime}
          </div>
        )}
      </div>

      {/* 内容区域 - 涨跌分布柱状图 */}
      <div className={styles.marketDistributionContainer}>
        <DistributionChart 
          chartData={distributionData.chartData}
          statistics={distributionData.statistics}
        />
      </div>

      {/* 底部指标 */}
      <div className={styles.indicatorsRow}>
        {/* 恐慌贪婪指数 */}
        <FearGreedIndex 
          index={fearGreedIndex}
          category={fearGreedCategory}
          onClick={handleFearGreedClick}
        />

        {/* BTC市场占有率 */}
        <BTCMarketShare 
          percentage={distributionData.btcMarketShare.percentage}
          change={distributionData.btcMarketShare.change}
        />
      </div>
    </div>
  );
}

