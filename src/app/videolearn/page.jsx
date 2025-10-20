'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toast } from 'antd-mobile';
import { LeftOutline } from 'antd-mobile-icons';
import CustomVideo from '../../components/CustomVideo';
import styles from './page.module.less';

export default function VideoLearnPage() {
  const router = useRouter();
  const [currentVideo, setCurrentVideo] = useState(0);
  const [completedVideos, setCompletedVideos] = useState({});
  const COIN_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/point/coin_icon@2x.png';
  
  // 视频列表数据 - 聚焦于 MOZI 平台功能
  const videos = [
    {
      id: 1,
      title: 'MOZI 平台使用教程',
      description: '了解如何使用 MOZI 平台的基本功能',
      url: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/video/Record_2025-10-14-09-14-37_e39d2c7de19156b0683cd93e8735f348.mp4',
      duration: '00:58',
      points: 10
    },
    {
      id: 2,
      title: '如何设置价格告警',
      description: '学习如何设置和管理币种价格告警功能',
      url: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/video/Record_2025-10-14-09-14-37_e39d2c7de19156b0683cd93e8735f348.mp4',
      duration: '00:58',
      points: 15
    },
    {
      id: 3,
      title: '积分系统玩法介绍',
      description: '了解如何通过完成任务、互动获得积分奖励',
      url: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/video/Record_2025-10-14-09-14-37_e39d2c7de19156b0683cd93e8735f348.mp4',
      duration: '00:58',
      points: 20
    }
  ];

  useEffect(() => {
    console.log('视频学习页面加载');
    // 保存视频总数供任务页验证使用
    if (typeof window !== 'undefined') {
      localStorage.setItem('videoLearnTotal', videos.length.toString());
      
      // 从本地存储加载已完成的视频记录
      try {
        const saved = localStorage.getItem('completedVideos');
        if (saved) {
          setCompletedVideos(JSON.parse(saved));
        }
      } catch (e) {
        console.error('加载视频完成记录失败:', e);
      }
    }
  }, []);

  const handleVideoEnd = () => {
    const videoId = videos[currentVideo].id;
    
    // 标记当前视频为已完成
    const newCompleted = { ...completedVideos, [videoId]: true };
    setCompletedVideos(newCompleted);
    
    // 保存到本地存储
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('completedVideos', JSON.stringify(newCompleted));
        localStorage.setItem('videoLearnTotal', videos.length.toString());
      } catch (e) {
        console.error('保存视频完成记录失败:', e);
      }
    }
    
    Toast.show({
      content: `恭喜获得 ${videos[currentVideo].points} 积分！`,
      icon: 'success',
      duration: 2000
    });
  };

  // 视频错误回调
  const handleVideoError = (e) => {
    console.error('视频播放错误:', e);
    Toast.show({
      content: '视频加载失败',
      icon: 'fail',
      duration: 2000
    });
  };

  return (
    <div className={styles.videolearnContainer}>
      {/* 顶部导航 */}
      <div className={styles.topNav}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <LeftOutline />
        </button>
        <div className={styles.navTitle}>视频学习</div>
      </div>

      <div className={styles.videoSection}>
        <CustomVideo
          key={`kv-${videos[currentVideo].id}`}
          videoId={`video-${videos[currentVideo].id}`}
          src={videos[currentVideo].url}
          isCompleted={completedVideos[videos[currentVideo].id] || false}
          onComplete={handleVideoEnd}
          onError={handleVideoError}
        />
        
        <div className={styles.videoInfo}>
          <div className={styles.videoTitle}>{videos[currentVideo].title}</div>
          <div className={styles.videoDesc}>{videos[currentVideo].description}</div>
          <div className={styles.videoMeta}>
            <div className={styles.videoDuration}>时长: {videos[currentVideo].duration}</div>
            <div className={styles.videoPoints}>
              <span>完成可获得</span>
              <span className={styles.pointsNum}>+{videos[currentVideo].points}</span>
              <img className={styles.coinInlineIcon} src={COIN_ICON} alt="积分" />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.videoListSection}>
        <div className={styles.sectionTitle}>学习列表</div>
        <div className={styles.videoList}>
          {videos.map((video, index) => (
            <div
              key={video.id}
              className={`${styles.videoItem} ${currentVideo === index ? styles.active : ''} ${completedVideos[video.id] ? styles.completed : ''}`}
              onClick={() => setCurrentVideo(index)}
            >
              <div className={styles.videoItemNumber}>{index + 1}</div>
              <div className={styles.videoItemInfo}>
                <div className={styles.videoItemTitle}>{video.title}</div>
                <div className={styles.videoItemDuration}>
                  {video.duration}
                  {completedVideos[video.id] && ' ✓'}
                </div>
              </div>
              <div className={styles.videoItemPoints}>
                <span>+{video.points}</span>
                <img className={styles.coinInlineIcon} src={COIN_ICON} alt="积分" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

