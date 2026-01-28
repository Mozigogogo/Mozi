'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { NavBar, PullToRefresh, Toast } from 'antd-mobile';
import { getSectorDetail, addOwnCoin, cancelOwnCoin } from '@/api/market';
import SortButton from '@/components/SortButton';
import styles from './page.module.less';

export default function SectorDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  
  const sectorName = searchParams.get('name') || 'Meme';
  
  const [sectorInfo, setSectorInfo] = useState({
    name: sectorName,
    change: '2.25%',
    marketCap: '$1.2亿',
    volume: '$1.5亿'
  });
  
  const [coinList, setCoinList] = useState([]);
  const [sortBy, setSortBy] = useState('marketCap'); // marketCap, price, change24h, volume
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [loading, setLoading] = useState(false);

  // 排序处理
  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    
    // 执行排序
    const sorted = [...coinList].sort((a, b) => {
      const aVal = a[field] || 0;
      const bVal = b[field] || 0;
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    setCoinList(sorted);
  };
  // 获取板块详情数据
  const fetchSectorDetail = async () => {
    setLoading(true);
    try {
      const result = await getSectorDetail(sectorName);
      
      if (result?.code === 0 && result?.data) {
        const data = result.data;
        
        // 更新板块信息
        setSectorInfo({
          name: data.sectionName || sectorName,
          change: data.change24h ? `${data.change24h.toFixed(2)}%` : '0.00%',
          marketCap: data.totalMarketCap || '$0',
          volume: data.totalVolume || '$0'
        });
        
        // 更新币种列表
        if (data.coins && Array.isArray(data.coins)) {
          setCoinList(data.coins.map(coin => ({
            id: coin.id || coin.symbol,
            symbol: coin.symbol,
            name: coin.name,
            icon: coin.icon || coin.logo,
            price: coin.price || 0,
            change24h: coin.change24h || 0,
            volume24h: coin.volume24h || 0,
            marketCap: coin.marketCap || 0,
            isLiked: coin.isSelfSelected || false,
            isMonitored: coin.isMonitored || false
          })));
        }
      }
    } catch (error) {
      console.error('获取板块详情失败:', error);
      Toast.show({
        content: t('common.loadFailed') || '加载失败',
        position: 'top'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSectorDetail();
  }, [sectorName]);

  // 收藏/取消收藏
  const handleLike = async (coin) => {
    try {
      if (coin.isLiked) {
        await cancelOwnCoin(coin.symbol);
        Toast.show({
          content: t('common.cancelSuccess') || '取消成功',
          position: 'top'
        });
      } else {
        await addOwnCoin(coin.symbol);
        Toast.show({
          content: t('common.addSuccess') || '添加成功',
          position: 'top'
        });
      }
      
      setCoinList(prev => prev.map(c => 
        c.id === coin.id ? { ...c, isLiked: !c.isLiked } : c
      ));
    } catch (error) {
      console.error('操作失败:', error);
      Toast.show({
        content: t('common.operationFailed') || '操作失败',
        position: 'top'
      });
    }
  };

  // 监控/取消监控
  const handleMonitor = (coinId) => {
    // TODO: 调用监控 API
    setCoinList(prev => prev.map(coin => 
      coin.id === coinId ? { ...coin, isMonitored: !coin.isMonitored } : coin
    ));
    
    Toast.show({
      content: t('common.success') || '操作成功',
      position: 'top'
    });
  };

  // 跳转到币种详情
  const goToCoinDetail = (symbol) => {
    router.push(`/detail?symbol=${symbol}`);
  };

  return (
    <div className={styles.container}>
      <NavBar
        onBack={() => router.back()}
        right={
          <div className={styles.navRight}>
            <img 
              src="/icons/new_sector/group.svg" 
              alt="group" 
              className={styles.iconBtn}
            />
            <img 
              src="/icons/new_sector/share.svg" 
              alt="share" 
              className={styles.iconBtn}
            />
          </div>
        }
        className={styles.navbar}
      >
        {sectorInfo.name}
      </NavBar>

      <PullToRefresh onRefresh={fetchSectorDetail}>
        <div className={styles.content}>
          {/* 板块信息卡片 */}
          <div className={styles.sectorCard}>
            <div className={styles.cardHeader}>
              <span className={styles.sectorName}>{sectorInfo.name}</span>
              <span className={`${styles.sectorChange} ${parseFloat(sectorInfo.change) >= 0 ? styles.positive : styles.negative}`}>
                {sectorInfo.change}
              </span>
            </div>
            <div className={styles.cardStats}>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>总价值</div>
                <div className={styles.statValue}>{sectorInfo.marketCap}</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>市 值</div>
                <div className={styles.statValue}>{sectorInfo.volume}</div>
              </div>
            </div>
          </div>

          {/* 排序栏 */}
          <div className={styles.sortBar}>
            <SortButton
              label="成分币种"
              value="marketCap"
              onChange={handleSortChange}
            />
            <SortButton
              label="最新价"
              value="price"
              onChange={handleSortChange}
            />
            <SortButton
              label="24h涨跌"
              value="change24h"
              onChange={handleSortChange}
            />
            <div className={styles.sortItem}>自加选</div>
            <div className={styles.sortItem}>加监控</div>
          </div>

          {/* 币种列表 */}
          <div className={styles.coinList}>
            {coinList.length === 0 && !loading ? (
              <div className={styles.empty}>暂无数据</div>
            ) : (
              coinList.map(coin => (
                <div key={coin.id} className={styles.coinItem}>
                  <div 
                    className={styles.coinInfo}
                    onClick={() => goToCoinDetail(coin.symbol)}
                  >
                    {coin.icon ? (
                      <img src={coin.icon} alt={coin.symbol} className={styles.coinIcon} />
                    ) : (
                      <div className={styles.coinIconPlaceholder}>
                        {coin.symbol?.charAt(0) || '?'}
                      </div>
                    )}
                    <span className={styles.coinSymbol}>{coin.symbol}</span>
                  </div>
                  
                  <div className={styles.coinPrice}>
                    {coin.price >= 1 
                      ? coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : coin.price.toFixed(6)
                    }
                  </div>
                  
                  <div className={`${styles.coinChange} ${coin.change24h >= 0 ? styles.positive : styles.negative}`}>
                    {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                  </div>
                  
                  <div 
                    className={styles.likeBtn}
                    onClick={() => handleLike(coin)}
                  >
                    {coin.isLiked ? '❤️' : '🤍'}
                  </div>
                  
                  <div 
                    className={styles.monitorBtn}
                    onClick={() => handleMonitor(coin.id)}
                  >
                    {coin.isMonitored ? '🔔' : '🔕'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}
