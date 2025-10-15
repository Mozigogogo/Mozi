'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LeftOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import styles from './page.module.less';

export default function PointsHistoryPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);

  // CDN 图片资源
  const CDN_BASE = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/point';

  // 模拟数据（实际应该从接口获取）
  const mockHistory = [
    {
      id: 1,
      type: 'task',
      typeName: '任务奖励',
      title: '完成视频学习',
      points: 50,
      status: 'add',
      createTime: '2025-10-14 10:30:25'
    },
    {
      id: 2,
      type: 'task',
      typeName: '任务奖励',
      title: '设置报警功能',
      points: 100,
      status: 'add',
      createTime: '2025-10-14 09:15:10'
    },
    {
      id: 3,
      type: 'daily',
      typeName: '每日任务',
      title: '每日点赞',
      points: 4,
      status: 'add',
      createTime: '2025-10-14 08:20:00'
    },
    {
      id: 4,
      type: 'daily',
      typeName: '每日任务',
      title: '发帖',
      points: 10,
      status: 'add',
      createTime: '2025-10-13 20:45:30'
    },
    {
      id: 5,
      type: 'invite',
      typeName: '邀请奖励',
      title: '邀请好友成功',
      points: 500,
      status: 'add',
      createTime: '2025-10-13 16:30:00'
    },
    {
      id: 6,
      type: 'daily',
      typeName: '每日任务',
      title: '收到赞',
      points: 4,
      status: 'add',
      createTime: '2025-10-13 14:25:15'
    },
    {
      id: 7,
      type: 'task',
      typeName: '任务奖励',
      title: '加入社群',
      points: 50,
      status: 'add',
      createTime: '2025-10-12 11:10:20'
    },
    {
      id: 8,
      type: 'task',
      typeName: '任务奖励',
      title: '首次注册账号',
      points: 50,
      status: 'add',
      createTime: '2025-10-12 10:00:00'
    }
  ];

  useEffect(() => {
    loadHistoryData();
  }, []);

  // 加载历史数据
  const loadHistoryData = async () => {
    try {
      setLoading(true);
      
      // TODO: 调用真实接口
      // const { data } = await request({
      //   url: '/api/points/history',
      //   method: 'GET'
      // })
      
      // 模拟数据加载
      setTimeout(() => {
        setHistoryList(mockHistory);
        setLoading(false);
      }, 500);
      
    } catch (error) {
      console.error('加载积分历史失败:', error);
      setLoading(false);
    }
  };

  // 格式化时间
  const formatTime = (timeStr) => {
    const now = new Date();
    const time = new Date(timeStr);
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return timeStr.split(' ')[0];
  };

  // 获取类型图标
  const getTypeIcon = (type) => {
    const icons = {
      task: '/point/set_alert@2x.png',
      daily: '/point/glove_praise@2x.png',
      invite: '/point/invite@2x.png'
    };
    return icons[type] || icons.task;
  };

  return (
      <div className={styles.pointsHistoryContainer}>
        {/* 顶部导航 */}
        <div className={styles.topNav}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <LeftOutline />
          </button>
          <div className={styles.navTitle}>积分历史</div>
        </div>

        {/* 历史记录列表 */}
        <div className={styles.historyScroll}>
          {historyList.length === 0 && !loading && (
            <div className={styles.emptyState}>
              <div className={styles.emptyText}>暂无积分记录</div>
            </div>
          )}

          {historyList.map(item => (
            <div key={item.id} className={styles.historyItem}>
              <div className={styles.itemIcon}>
                <img src={getTypeIcon(item.type)} className={styles.iconImg} alt={item.typeName} />
              </div>
              
              <div className={styles.itemContent}>
                <div className={styles.itemHeader}>
                  <div className={styles.itemTitle}>{item.title}</div>
                  <div className={styles.itemPoints}>
                    <span className={`${styles.pointsText} ${item.status === 'add' ? styles.add : styles.sub}`}>
                      {item.status === 'add' ? '+' : '-'}{item.points}
                    </span>
                    <img src="/point/coin_icon@2x.png" className={styles.coinIcon} alt="积分" />
                  </div>
                </div>
                
                <div className={styles.itemFooter}>
                  <span className={styles.itemType}>{item.typeName}</span>
                  <span className={styles.itemTime}>{formatTime(item.createTime)}</span>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className={styles.loadingMore}>
              <span>加载中...</span>
            </div>
          )}

          {!loading && historyList.length > 0 && (
            <div className={styles.noMore}>
              <span>没有更多了</span>
            </div>
          )}
        </div>
      </div>
  );
}

