'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toast } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import styles from './page.module.less';

export default function PointsRank() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [rankData, setRankData] = useState({});

  // 默认头像
  const defaultAvatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face';

  // 获取排行榜数据
  const fetchRankData = useCallback(async (type) => {
    try {
      const res = await request({
        url: Interface.TASK_RANKING,
        method: 'GET',
        params: {
          type: type,
          limit: 50
        }
      });
      
      if (res?.code === 0 && res?.data) {
        const rankings = res.data.rankings || res.data || [];
        // 映射接口数据到组件格式
        return rankings.map((item, index) => ({
          id: item.userId || index + 1,
          name: item.nickname || item.userName || '匿名用户',
          avatar: item.avatar || defaultAvatar,
          points: item.totalPoints || item.dailyPoints || item.monthlyPoints || 0,
          rank: item.rank || index + 1,
          isMe: item.isCurrentUser || false
        }));
      }
      return [];
    } catch (error) {
      console.error(`获取${type}排行榜失败:`, error);
      return [];
    }
  }, []);

  // 加载所有类型的排行榜数据
  const loadRankData = useCallback(async () => {
    setLoading(true);
    try {
      const [dailyList, monthlyList, totalList] = await Promise.all([
        fetchRankData('daily'),
        fetchRankData('monthly'),
        fetchRankData('total')
      ]);
      
      setRankData({
        daily: dailyList,
        monthly: monthlyList,
        total: totalList
      });
    } catch (error) {
      console.error('加载排行榜数据失败:', error);
      Toast.show({
        content: t('points.loadFailed'),
        icon: 'fail'
      });
    } finally {
      setLoading(false);
    }
  }, [fetchRankData, t]);

  useEffect(() => {
    loadRankData();
  }, [loadRankData]);

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
                  alt={t('points.back')}
                />
              </div>
              <div className={styles.miniTitle}>{t('points.title')}</div>
            </div>
            <div className={styles.mainTitle}>{t('points.title')}</div>
            <div className={styles.miniTabs}>
              <div
                className={`${styles.miniTab} ${activeTab === 'daily' ? styles.active : ''}`}
                onClick={() => handleTabChange('daily')}
              >
                {t('points.daily')}
              </div>
              <div
                className={`${styles.miniTab} ${activeTab === 'monthly' ? styles.active : ''}`}
                onClick={() => handleTabChange('monthly')}
              >
                {t('points.monthly')}
              </div>
              <div
                className={`${styles.miniTab} ${activeTab === 'total' ? styles.active : ''}`}
                onClick={() => handleTabChange('total')}
              >
                {t('points.total')}
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
            <div className={styles.loading}>{t('points.loading')}</div>
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
        <div className={styles.inviteFloatBtn} onClick={() => Toast.show(t('points.shareFeatureInDevelopment'))}>
          <div className={styles.inviteIconWrap}>
            <img className={styles.inviteIcon} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/score-invite.png' alt={t('points.inviteChallenge')} />
          </div>
          <span className={styles.inviteText}>{t('points.inviteChallenge')}</span>
        </div>
      </div>
    </Layout>
  );
}

