import { useState, useEffect } from 'react';
import { request } from '../utils/request';
import { Interface } from '../utils/constants';
import { completeTask } from '@/api/user';

/**
 * 榜单类型映射
 * SELF_SELECT("selfselect", "自选榜")
 * PRICE_CHANGE("pricechange", "涨幅榜")
 * PRICE_CHANGE_ASC("pricechangeasc", "跌幅榜")
 * PRICE_WAVE("pricewave", "波幅榜")
 * TRADE("trade", "成交额榜")
 * NEW_SYMBOL("newsymbol", "新币榜")
 * TRADE_MOVERS("trademovers", "飙升榜")
 * EXCHANGE("exchange", "交易所排行榜")
 */

export const useShareCount = (rankType) => {
  const [shareCount, setShareCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 获取分享次数
  const fetchShareCount = async () => {
    if (!rankType) return;
    
    try {
      const res = await request({
        url: Interface.GET_SHARE_COUNT,
        data: { type: rankType }
      });
      
      if (res?.data !== undefined && res?.data !== null) {
        setShareCount(res.data);
      }
    } catch (error) {
      console.error('获取分享次数失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 增加分享次数
  const incrementShareCount = async () => {
    // 上报分享任务（SHARE）
    try {
      await completeTask('SHARE');
      console.log('🔍 [DEBUG] 分享任务上报成功');
    } catch (taskError) {
      console.error('分享任务上报失败:', taskError);
    }

    if (!rankType) return;
    
    try {
      const res = await request({
        url: Interface.GET_SHARE_COUNT,
        data: { type: rankType, count: 1 }
      });
      
      if (res?.data !== undefined && res?.data !== null) {
        setShareCount(res.data);
      }
    } catch (error) {
      console.error('增加分享次数失败:', error);
    }
  };

  useEffect(() => {
    fetchShareCount();
  }, [rankType]);

  return {
    shareCount,
    loading,
    incrementShareCount,
    refreshShareCount: fetchShareCount
  };
};
