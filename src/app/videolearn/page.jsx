'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { safeBack } from '@/utils/navigation';
import { Toast } from 'antd-mobile';
import { LeftOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import CustomVideo from '../../components/CustomVideo';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import styles from './page.module.less';

export default function VideoLearnPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentVideo, setCurrentVideo] = useState(0);
  const [completedVideos, setCompletedVideos] = useState({});
  const COIN_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/point/coin_icon@2x.png';
  
  // 视频列表数据 - 聚焦于 MOZI 平台功能
  const videos = [
    {
      id: 1,
      titleKey: 'videoLearn.videos.platformTutorial.title',
      descriptionKey: 'videoLearn.videos.platformTutorial.description',
      url: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/video/Record_2025-10-14-09-14-37_e39d2c7de19156b0683cd93e8735f348.mp4',
      duration: '00:58',
      points: 10
    },
    {
      id: 2,
      titleKey: 'videoLearn.videos.priceAlert.title',
      descriptionKey: 'videoLearn.videos.priceAlert.description',
      url: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/video/Record_2025-10-14-09-14-37_e39d2c7de19156b0683cd93e8735f348.mp4',
      duration: '00:58',
      points: 15
    },
    {
      id: 3,
      titleKey: 'videoLearn.videos.pointsSystem.title',
      descriptionKey: 'videoLearn.videos.pointsSystem.description',
      url: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/video/Record_2025-10-14-09-14-37_e39d2c7de19156b0683cd93e8735f348.mp4',
      duration: '00:58',
      points: 20
    }
  ];

  useEffect(() => {
    console.log('Video learning page loaded');
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
        console.error(t('videoLearn.messages.loadRecordFailed'), e);
      }
    }
  }, []);

  // 调用视频任务完成接口
  const completeVideoTask = useCallback(async () => {
    try {
      console.log('🔍 [DEBUG] 所有视频已看完，调用任务完成接口');
      const res = await request({
        url: Interface.TASK_COMPLETE,
        method: 'POST',
        data: { taskCode: 'VIDEO' }
      });
      console.log('🔍 [DEBUG] 视频任务完成结果:', res);
      
      if (res?.code === 0) {
        Toast.show({
          content: t('videoLearn.messages.allCompleted') || '恭喜！已完成所有视频学习任务',
          icon: 'success',
          duration: 3000
        });
        // 标记任务已完成
        localStorage.setItem('videoTaskCompleted', 'true');
      }
    } catch (error) {
      console.error('视频任务完成接口调用失败:', error);
    }
  }, [t]);

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
        console.error(t('videoLearn.messages.saveRecordFailed'), e);
      }
    }
    
    Toast.show({
      content: t('videoLearn.messages.pointsEarned', { points: videos[currentVideo].points }),
      icon: 'success',
      duration: 2000
    });

    // 检查是否所有视频都已完成
    const allCompleted = videos.every(v => newCompleted[v.id]);
    if (allCompleted) {
      // 检查是否已经调用过完成接口
      const taskCompleted = localStorage.getItem('videoTaskCompleted');
      if (!taskCompleted) {
        completeVideoTask();
      }
    }
  };

  // 视频错误回调
  const handleVideoError = (e) => {
    console.error('Video playback error:', e);
    Toast.show({
      content: t('videoLearn.messages.videoLoadFailed'),
      icon: 'fail',
      duration: 2000
    });
  };

  return (
    <div className={styles.videolearnContainer}>
      {/* 顶部导航 */}
      <div className={styles.topNav}>
        <button className={styles.backBtn} onClick={() => safeBack(router, { fallback: '/' })}>
          <LeftOutline />
        </button>
        <div className={styles.navTitle}>{t('videoLearn.title')}</div>
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
          <div className={styles.videoTitle}>{t(videos[currentVideo].titleKey)}</div>
          <div className={styles.videoDesc}>{t(videos[currentVideo].descriptionKey)}</div>
          <div className={styles.videoMeta}>
            <div className={styles.videoDuration}>{t('videoLearn.duration')}: {videos[currentVideo].duration}</div>
            <div className={styles.videoPoints}>
              <span>{t('videoLearn.complete')}</span>
              <span className={styles.pointsNum}>+{videos[currentVideo].points}</span>
              <img className={styles.coinInlineIcon} src={COIN_ICON} alt="Points" />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.videoListSection}>
        <div className={styles.sectionTitle}>{t('videoLearn.listTitle')}</div>
        <div className={styles.videoList}>
          {videos.map((video, index) => (
            <div
              key={video.id}
              className={`${styles.videoItem} ${currentVideo === index ? styles.active : ''} ${completedVideos[video.id] ? styles.completed : ''}`}
              onClick={() => setCurrentVideo(index)}
            >
              <div className={styles.videoItemNumber}>{index + 1}</div>
              <div className={styles.videoItemInfo}>
                <div className={styles.videoItemTitle}>{t(video.titleKey)}</div>
                <div className={styles.videoItemDuration}>
                  {video.duration}
                  {completedVideos[video.id] && ' ✓'}
                </div>
              </div>
              <div className={styles.videoItemPoints}>
                <span>+{video.points}</span>
                <img className={styles.coinInlineIcon} src={COIN_ICON} alt="Points" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

