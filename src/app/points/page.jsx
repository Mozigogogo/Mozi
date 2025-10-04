'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toast } from 'antd-mobile';
import Layout from '../../components/Layout';
import styles from './page.module.less';

export default function PointsRank() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [rankData, setRankData] = useState({});

  // 模拟数据生成器
  const makeList = (basePoints) => {
    const avatars = [
      'https://images.unsplash.com/photo-1494790108755-2616c5e91d5f?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face'
    ];
    
    return Array.from({ length: 25 }).map((_, idx) => {
      const rank = idx + 1;
      return {
        id: rank,
        name: rank === 25 ? '牛爷爷' : (rank === 3 ? 'GGBond' : rank === 4 ? '超人强' : '张三'),
        avatar: avatars[idx % avatars.length],
        points: basePoints - (rank - 1) * 10,
        rank,
        isMe: rank === 25
      };
    });
  };

  const mockData = {
    daily: makeList(2000),
    monthly: makeList(5200),
    total: makeList(10000)
  };

  useEffect(() => {
    loadRankData();
  }, []);

  const loadRankData = useCallback(async () => {
    setLoading(true);
    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      setRankData(mockData);
    } catch (error) {
      console.error('加载排行榜数据失败:', error);
      Toast.show({
        content: '加载失败',
        icon: 'fail'
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setTimeout(() => loadRankData(), 100);
  };

  const listData = rankData[activeTab] || [];
  const top1 = listData.find((i) => i.rank === 1);
  const top2 = listData.find((i) => i.rank === 2);
  const top3 = listData.find((i) => i.rank === 3);
  const myRank = listData.find((i) => i.isMe);
  const restList = listData.filter((i) => i.rank > 3);

  return (
    <Layout>
      <div className={styles.pointsRankContainer}>
        {/* 头部背景 */}
        <div className={styles.headerBg}>
          <div className={styles.headerContent}>
            <div className={styles.topRow}>
              <div className={styles.backArrow} onClick={() => router.back()}>
                <img 
                  className={styles.backArrowIcon}
                  src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/left-arrow.png'
                  alt="返回"
                />
              </div>
              <div className={styles.miniTitle}>积分榜单</div>
            </div>
            <div className={styles.mainTitle}>积分榜单</div>
            <div className={styles.miniTabs}>
              <div
                className={`${styles.miniTab} ${activeTab === 'daily' ? styles.active : ''}`}
                onClick={() => handleTabChange('daily')}
              >
                日榜
              </div>
              <div
                className={`${styles.miniTab} ${activeTab === 'monthly' ? styles.active : ''}`}
                onClick={() => handleTabChange('monthly')}
              >
                月榜
              </div>
              <div
                className={`${styles.miniTab} ${activeTab === 'total' ? styles.active : ''}`}
                onClick={() => handleTabChange('total')}
              >
                总榜
              </div>
            </div>
          </div>
        </div>

        {/* 前三名展示区 */}
        <div className={styles.transitionTop3}>
          <div className={styles.transitionBg} />
          <div className={styles.top3Overlay}>
            {top2 && (
              <div className={`${styles.overlaySlot} ${styles.second}`}>
                <img className={styles.medalSecond} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/silver.png' alt="银牌" />
                <img src={top2.avatar} className={styles.ovAvatar} alt={top2.name} />
                <div className={styles.ovName}>{top2.name}</div>
                <div className={styles.ovPoints}>
                  <img className={styles.coinIcon} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/score-coin.png' alt="积分" />
                  <span className={styles.ovPointsText}>{top2.points}</span>
                </div>
              </div>
            )}
            {top1 && (
              <div className={`${styles.overlaySlot} ${styles.first}`}>
                <img className={styles.medalFirst} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/gold.png' alt="金牌" />
                <img src={top1.avatar} className={styles.ovAvatar} alt={top1.name} />
                <div className={styles.ovName}>{top1.name}</div>
                <div className={styles.ovPoints}>
                  <img className={styles.coinIcon} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/score-coin.png' alt="积分" />
                  <span className={styles.ovPointsText}>{top1.points}</span>
                </div>
              </div>
            )}
            {top3 && (
              <div className={`${styles.overlaySlot} ${styles.third}`}>
                <img className={styles.medalThird} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/copper.png' alt="铜牌" />
                <img src={top3.avatar} className={styles.ovAvatar} alt={top3.name} />
                <div className={styles.ovName}>{top3.name}</div>
                <div className={styles.ovPoints}>
                  <img className={styles.coinIcon} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/score-coin.png' alt="积分" />
                  <span className={styles.ovPointsText}>{top3.points}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className={styles.contentArea}>
          {loading ? (
            <div className={styles.loading}>加载中...</div>
          ) : (
            <div className={styles.rankList}>
              {restList.map((item) => (
                <div key={item.id} className={styles.rankItem}>
                  <div className={styles.rankNumber}>{item.rank}</div>
                  <img src={item.avatar} className={styles.avatarSmall} alt={item.name} />
                  <div className={styles.userInfo}>
                    <div className={styles.name}>{item.name}</div>
                  </div>
                  <div className={styles.pointsArea}>
                    <img className={styles.coinIcon} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/score-coin.png' alt="积分" />
                    <span className={styles.pointsText}>{item.points}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 我的排名悬浮卡片 */}
        {myRank && (
          <div className={styles.myRankOverlay}>
            <div className={`${styles.rankItem} ${styles.me}`}>
              <div className={styles.rankNumber}>{myRank.rank}</div>
              <img src={myRank.avatar} className={styles.avatarSmall} alt={myRank.name} />
              <div className={styles.userInfo}>
                <div className={styles.name}>{myRank.name}</div>
              </div>
              <div className={styles.pointsArea}>
                <img className={styles.coinIcon} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/score-coin.png' alt="积分" />
                <span className={styles.pointsText}>{myRank.points}</span>
              </div>
            </div>
          </div>
        )}

        {/* 邀请好友悬浮按钮 */}
        <div className={styles.inviteFloatBtn} onClick={() => Toast.show('分享功能开发中')}>
          <div className={styles.inviteIconWrap}>
            <img className={styles.inviteIcon} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/score-invite.png' alt="邀请" />
          </div>
          <span className={styles.inviteText}>邀请朋友来挑战吧</span>
        </div>
      </div>
    </Layout>
  );
}

