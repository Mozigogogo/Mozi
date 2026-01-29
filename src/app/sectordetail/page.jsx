'use client';

import { useState, useEffect, useRef } from 'react';
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
    marketCap: '1.2亿',
    volume: '1.5亿'
  });
  
  const [coinList, setCoinList] = useState([
    { id: '1', symbol: 'BTC', name: 'Bitcoin', icon: '/icons/new_sector/btc.svg', price: 102658.7, change24h: 3.58, volume24h: 50000000000, marketCap: 2000000000000, isLiked: false, isMonitored: false },
    { id: '2', symbol: 'ETH', name: 'Ethereum', icon: '/icons/new_sector/btc.svg', price: 3456.89, change24h: -2.15, volume24h: 30000000000, marketCap: 400000000000, isLiked: true, isMonitored: false },
    { id: '3', symbol: 'SEI', name: 'Sei', icon: '/icons/new_sector/btc.svg', price: 0.4523, change24h: 5.67, volume24h: 1000000000, marketCap: 5000000000, isLiked: false, isMonitored: true },
    { id: '4', symbol: 'DOGE', name: 'Dogecoin', icon: '/icons/new_sector/btc.svg', price: 0.0823, change24h: 1.23, volume24h: 800000000, marketCap: 12000000000, isLiked: true, isMonitored: false },
    { id: '5', symbol: 'SOL', name: 'Solana', icon: '/icons/new_sector/btc.svg', price: 145.67, change24h: 4.89, volume24h: 5000000000, marketCap: 60000000000, isLiked: false, isMonitored: true },
    { id: '6', symbol: 'ADA', name: 'Cardano', icon: '/icons/new_sector/btc.svg', price: 0.5234, change24h: -1.45, volume24h: 600000000, marketCap: 18000000000, isLiked: false, isMonitored: false },
    { id: '7', symbol: 'AVAX', name: 'Avalanche', icon: '/icons/new_sector/btc.svg', price: 38.92, change24h: 6.12, volume24h: 900000000, marketCap: 15000000000, isLiked: true, isMonitored: true },
    { id: '8', symbol: 'MATIC', name: 'Polygon', icon: '/icons/new_sector/btc.svg', price: 0.8765, change24h: 2.34, volume24h: 400000000, marketCap: 8000000000, isLiked: false, isMonitored: false },
    { id: '9', symbol: 'DOT', name: 'Polkadot', icon: '/icons/new_sector/btc.svg', price: 7.23, change24h: -3.21, volume24h: 350000000, marketCap: 9000000000, isLiked: false, isMonitored: false },
    { id: '10', symbol: 'LINK', name: 'Chainlink', icon: '/icons/new_sector/btc.svg', price: 15.67, change24h: 8.45, volume24h: 520000000, marketCap: 8500000000, isLiked: true, isMonitored: false },
    { id: '11', symbol: 'UNI', name: 'Uniswap', icon: '/icons/new_sector/btc.svg', price: 6.89, change24h: -0.87, volume24h: 180000000, marketCap: 5200000000, isLiked: false, isMonitored: true },
    { id: '12', symbol: 'ATOM', name: 'Cosmos', icon: '/icons/new_sector/btc.svg', price: 9.45, change24h: 3.67, volume24h: 290000000, marketCap: 3800000000, isLiked: false, isMonitored: false },
    { id: '13', symbol: 'XRP', name: 'Ripple', icon: '/icons/new_sector/btc.svg', price: 0.5678, change24h: -2.34, volume24h: 1200000000, marketCap: 30000000000, isLiked: true, isMonitored: false },
    { id: '14', symbol: 'LTC', name: 'Litecoin', icon: '/icons/new_sector/btc.svg', price: 92.34, change24h: 1.89, volume24h: 450000000, marketCap: 6800000000, isLiked: false, isMonitored: true },
    { id: '15', symbol: 'BCH', name: 'Bitcoin Cash', icon: '/icons/new_sector/btc.svg', price: 234.56, change24h: -4.12, volume24h: 320000000, marketCap: 4600000000, isLiked: false, isMonitored: false },
    { id: '16', symbol: 'ALGO', name: 'Algorand', icon: '/icons/new_sector/btc.svg', price: 0.1823, change24h: 7.23, volume24h: 95000000, marketCap: 1400000000, isLiked: true, isMonitored: false },
    { id: '17', symbol: 'VET', name: 'VeChain', icon: '/icons/new_sector/btc.svg', price: 0.0234, change24h: 5.12, volume24h: 78000000, marketCap: 1700000000, isLiked: false, isMonitored: true },
    { id: '18', symbol: 'FIL', name: 'Filecoin', icon: '/icons/new_sector/btc.svg', price: 4.56, change24h: -1.67, volume24h: 125000000, marketCap: 2100000000, isLiked: false, isMonitored: false },
    { id: '19', symbol: 'AAVE', name: 'Aave', icon: '/icons/new_sector/btc.svg', price: 87.65, change24h: 9.34, volume24h: 210000000, marketCap: 1300000000, isLiked: true, isMonitored: false },
    { id: '20', symbol: 'THETA', name: 'Theta Network', icon: '/icons/new_sector/btc.svg', price: 1.23, change24h: -5.43, volume24h: 67000000, marketCap: 1200000000, isLiked: false, isMonitored: false },
    { id: '21', symbol: 'XLM', name: 'Stellar', icon: '/icons/new_sector/btc.svg', price: 0.1156, change24h: 2.78, volume24h: 145000000, marketCap: 3300000000, isLiked: false, isMonitored: true },
    { id: '22', symbol: 'TRX', name: 'TRON', icon: '/icons/new_sector/btc.svg', price: 0.0987, change24h: 4.56, volume24h: 890000000, marketCap: 8900000000, isLiked: true, isMonitored: false },
    { id: '23', symbol: 'EOS', name: 'EOS', icon: '/icons/new_sector/btc.svg', price: 0.6789, change24h: -3.45, volume24h: 156000000, marketCap: 780000000, isLiked: false, isMonitored: false },
    { id: '24', symbol: 'XMR', name: 'Monero', icon: '/icons/new_sector/btc.svg', price: 156.78, change24h: 1.23, volume24h: 98000000, marketCap: 2800000000, isLiked: false, isMonitored: true },
    { id: '25', symbol: 'NEO', name: 'Neo', icon: '/icons/new_sector/btc.svg', price: 12.34, change24h: 6.78, volume24h: 87000000, marketCap: 870000000, isLiked: true, isMonitored: false },
    { id: '26', symbol: 'IOTA', name: 'IOTA', icon: '/icons/new_sector/btc.svg', price: 0.2345, change24h: -2.89, volume24h: 45000000, marketCap: 650000000, isLiked: false, isMonitored: false },
    { id: '27', symbol: 'DASH', name: 'Dash', icon: '/icons/new_sector/btc.svg', price: 34.56, change24h: 3.21, volume24h: 67000000, marketCap: 390000000, isLiked: false, isMonitored: true },
    { id: '28', symbol: 'ZEC', name: 'Zcash', icon: '/icons/new_sector/btc.svg', price: 45.67, change24h: -1.23, volume24h: 89000000, marketCap: 680000000, isLiked: true, isMonitored: false },
    { id: '29', symbol: 'ETC', name: 'Ethereum Classic', icon: '/icons/new_sector/btc.svg', price: 23.45, change24h: 5.67, volume24h: 234000000, marketCap: 3200000000, isLiked: false, isMonitored: false },
    { id: '30', symbol: 'MKR', name: 'Maker', icon: '/icons/new_sector/btc.svg', price: 1567.89, change24h: -4.56, volume24h: 78000000, marketCap: 1400000000, isLiked: false, isMonitored: true },
    { id: '31', symbol: 'COMP', name: 'Compound', icon: '/icons/new_sector/btc.svg', price: 56.78, change24h: 7.89, volume24h: 123000000, marketCap: 480000000, isLiked: true, isMonitored: false },
    { id: '32', symbol: 'SNX', name: 'Synthetix', icon: '/icons/new_sector/btc.svg', price: 2.34, change24h: -6.12, volume24h: 67000000, marketCap: 720000000, isLiked: false, isMonitored: false },
    { id: '33', symbol: 'YFI', name: 'yearn.finance', icon: '/icons/new_sector/btc.svg', price: 8765.43, change24h: 12.34, volume24h: 145000000, marketCap: 320000000, isLiked: false, isMonitored: true },
    { id: '34', symbol: 'BAT', name: 'Basic Attention', icon: '/icons/new_sector/btc.svg', price: 0.2567, change24h: 3.45, volume24h: 56000000, marketCap: 380000000, isLiked: true, isMonitored: false },
    { id: '35', symbol: 'ZRX', name: '0x', icon: '/icons/new_sector/btc.svg', price: 0.4321, change24h: -2.34, volume24h: 34000000, marketCap: 360000000, isLiked: false, isMonitored: false },
    { id: '36', symbol: 'ENJ', name: 'Enjin Coin', icon: '/icons/new_sector/btc.svg', price: 0.3456, change24h: 8.76, volume24h: 89000000, marketCap: 310000000, isLiked: false, isMonitored: true },
    { id: '37', symbol: 'MANA', name: 'Decentraland', icon: '/icons/new_sector/btc.svg', price: 0.5678, change24h: 4.32, volume24h: 123000000, marketCap: 1100000000, isLiked: true, isMonitored: false },
    { id: '38', symbol: 'SAND', name: 'The Sandbox', icon: '/icons/new_sector/btc.svg', price: 0.4567, change24h: -3.21, volume24h: 167000000, marketCap: 850000000, isLiked: false, isMonitored: false },
    { id: '39', symbol: 'CRV', name: 'Curve DAO', icon: '/icons/new_sector/btc.svg', price: 0.8901, change24h: 6.54, volume24h: 98000000, marketCap: 420000000, isLiked: false, isMonitored: true },
    { id: '40', symbol: 'SUSHI', name: 'SushiSwap', icon: '/icons/new_sector/btc.svg', price: 1.23, change24h: -1.89, volume24h: 87000000, marketCap: 160000000, isLiked: true, isMonitored: false },
    { id: '41', symbol: 'GRT', name: 'The Graph', icon: '/icons/new_sector/btc.svg', price: 0.1567, change24h: 9.12, volume24h: 145000000, marketCap: 1500000000, isLiked: false, isMonitored: false },
    { id: '42', symbol: 'FTM', name: 'Fantom', icon: '/icons/new_sector/btc.svg', price: 0.3421, change24h: 5.43, volume24h: 234000000, marketCap: 960000000, isLiked: false, isMonitored: true },
    { id: '43', symbol: 'NEAR', name: 'NEAR Protocol', icon: '/icons/new_sector/btc.svg', price: 2.34, change24h: -4.67, volume24h: 178000000, marketCap: 2400000000, isLiked: true, isMonitored: false },
    { id: '44', symbol: 'HBAR', name: 'Hedera', icon: '/icons/new_sector/btc.svg', price: 0.0678, change24h: 7.89, volume24h: 123000000, marketCap: 2300000000, isLiked: false, isMonitored: false },
    { id: '45', symbol: 'ICP', name: 'Internet Computer', icon: '/icons/new_sector/btc.svg', price: 5.67, change24h: -5.23, volume24h: 89000000, marketCap: 2600000000, isLiked: false, isMonitored: true },
    { id: '46', symbol: 'APE', name: 'ApeCoin', icon: '/icons/new_sector/btc.svg', price: 1.45, change24h: 11.23, volume24h: 234000000, marketCap: 540000000, isLiked: true, isMonitored: false },
    { id: '47', symbol: 'LDO', name: 'Lido DAO', icon: '/icons/new_sector/btc.svg', price: 1.89, change24h: 3.45, volume24h: 156000000, marketCap: 1700000000, isLiked: false, isMonitored: false },
    { id: '48', symbol: 'ARB', name: 'Arbitrum', icon: '/icons/new_sector/btc.svg', price: 0.7654, change24h: -2.34, volume24h: 345000000, marketCap: 2800000000, isLiked: false, isMonitored: true },
    { id: '49', symbol: 'OP', name: 'Optimism', icon: '/icons/new_sector/btc.svg', price: 1.98, change24h: 6.78, volume24h: 267000000, marketCap: 1900000000, isLiked: true, isMonitored: false },
    { id: '50', symbol: 'IMX', name: 'Immutable X', icon: '/icons/new_sector/btc.svg', price: 1.34, change24h: -3.56, volume24h: 98000000, marketCap: 2100000000, isLiked: false, isMonitored: false }
  ]);
  const [sortBy, setSortBy] = useState('marketCap'); // marketCap, price, change24h, volume
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [loading, setLoading] = useState(false);
  const [showScrollbar, setShowScrollbar] = useState(true);
  const scrollTimeoutRef = useRef(null);

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

  // 页面加载时显示滚动条3秒
  useEffect(() => {
    setShowScrollbar(true);
    scrollTimeoutRef.current = setTimeout(() => {
      setShowScrollbar(false);
    }, 3000);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // 处理滚动事件
  const handleScroll = () => {
    // 清除之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // 显示滚动条
    setShowScrollbar(true);

    // 3秒后隐藏滚动条
    scrollTimeoutRef.current = setTimeout(() => {
      setShowScrollbar(false);
    }, 3000);
  };

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

  // 监控/取消监控 - 跳转到告警配置页面
  const handleMonitor = (coin) => {
    router.push(`/addwarn?symbol=${coin.symbol}`);
  };

  // 跳转到币种详情
  const goToCoinDetail = (symbol) => {
    router.push(`/detail?symbol=${symbol}`);
  };

  // 跳转到板块讨论区
  const handleGoToCommunity = () => {
    router.push(`/rankdiscuss?type=sector&name=${encodeURIComponent(sectorInfo.name)}`);
  };

  // 分享到 Telegram
  const handleShare = () => {
    const shareUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent(`${sectorInfo.name} ${t('sectorDetail.sector') || '板块'} - ${sectorInfo.change}`);
    const telegramUrl = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;
    window.open(telegramUrl, '_blank');
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
              onClick={handleGoToCommunity}
            />
            <img 
              src="/icons/new_sector/share.svg" 
              alt="share" 
              className={styles.iconBtn}
              onClick={handleShare}
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
                <div className={styles.statValue}>
                  <span className={styles.currency}>$</span>
                  {sectorInfo.marketCap}
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>市 值</div>
                <div className={styles.statValue}>
                  <span className={styles.currency}>$</span>
                  {sectorInfo.volume}
                </div>
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
          <div 
            className={`${styles.coinList} ${showScrollbar ? styles.showScrollbar : ''}`}
            onScroll={handleScroll}
          >
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
                    <img 
                      src={coin.isLiked ? '/icons/new_detail/like_actived.svg' : '/icons/new_detail/like_no_actived.svg'}
                      alt="like"
                      className={styles.iconImg}
                    />
                  </div>
                  
                  <div 
                    className={styles.monitorBtn}
                    onClick={() => handleMonitor(coin)}
                  >
                    <img 
                      src="/icons/new_home/monitor-bell.svg"
                      alt="monitor"
                      className={styles.iconImg}
                    />
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
