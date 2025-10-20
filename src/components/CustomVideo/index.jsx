'use client';

import { useState, useRef, useEffect } from 'react';
import { Toast } from 'antd-mobile';
import styles from './index.module.less';

// 使用 CDN 播放/暂停图标
const PLAY_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/point/play.svg';
const PAUSE_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/point/pause.svg';

/**
 * 自定义视频组件
 * 防作弊机制：不可拖动进度条，必须完整观看
 * 
 * @param {string} videoId - 视频ID（必须唯一）
 * @param {string} src - 视频地址
 * @param {boolean} isCompleted - 是否已完成
 * @param {function} onComplete - 完成回调
 * @param {function} onError - 错误回调
 */
export default function CustomVideo({ 
  videoId = 'custom-video',
  src, 
  isCompleted = false,
  onComplete,
  onError 
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [maxPlayedTime, setMaxPlayedTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef(null);

  // 视频源变化时重置状态
  useEffect(() => {
    setCurrentTime(0);
    setMaxPlayedTime(0);
    setIsPlaying(false);
    setDuration(0);
    
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  }, [src]);

  // 播放/暂停
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  // 全屏/退出全屏
  const handleFullscreen = () => {
    if (isCompleted) {
      // 已完成：使用系统原生全屏
      if (!videoRef.current) return;
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.mozRequestFullScreen) {
        videoRef.current.mozRequestFullScreen();
      }
    } else {
      // 未完成：使用伪全屏（固定定位铺满屏幕）
      setIsFullscreen(!isFullscreen);
      setShowControls(true);
    }
  };

  // 点击视频区域切换控件显示
  const handleVideoClick = () => {
    if (isFullscreen && !isCompleted) {
      setShowControls(!showControls);
    }
  };

  // 监听播放
  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  // 监听时间更新
  const handleTimeUpdate = (e) => {
    const current = e.target.currentTime;
    setCurrentTime(current);
    
    // 记录最大播放位置（用于防止跳过）
    if (current > maxPlayedTime) {
      setMaxPlayedTime(current);
    }
  };

  // 监听元数据加载
  const handleLoadedMetadata = (e) => {
    setDuration(e.target.duration);
  };

  // 监听拖动（防止作弊）
  const handleSeeking = (e) => {
    // 已完成的视频允许拖动
    if (isCompleted) return;

    const seekTime = e.target.currentTime;
    
    // 如果试图跳过未观看的部分，强制跳回
    if (seekTime > maxPlayedTime + 1) {
      if (videoRef.current) {
        setTimeout(() => {
          videoRef.current.currentTime = maxPlayedTime;
        }, 100);
      }
      
      Toast.show({
        content: '请完整观看视频',
        icon: 'fail',
        duration: 1500
      });
    }
  };

  // 播放结束
  const handleEnded = () => {
    setIsPlaying(false);
    
    // 触发完成回调
    if (!isCompleted && onComplete) {
      onComplete();
    }
  };

  // 错误处理
  const handleError = (e) => {
    console.error('视频播放错误:', e);
    if (onError) {
      onError(e);
    }
  };

  return (
    <div className={`${styles.customVideoWrapper} ${isFullscreen ? styles.fullscreenMode : ''}`}>
      {isFullscreen && !isCompleted && (
        <div className={styles.videoMask} onClick={handleVideoClick} />
      )}
      <video
        ref={videoRef}
        className={styles.customVideoPlayer}
        src={src}
        controls={isCompleted}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onSeeking={handleSeeking}
        onEnded={handleEnded}
        onError={handleError}
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
      />
      
      {/* 自定义控制栏 - 仅未完成时显示 */}
      {!isCompleted && (!isFullscreen || (isFullscreen && showControls)) && (
        <div className={styles.customVideoControls}>
          <div className={styles.controlRow}>
            {/* 播放/暂停按钮 - 左侧 */}
            <div className={styles.controlBtn} onClick={handlePlayPause}>
              <img className={styles.btnIcon} src={isPlaying ? PAUSE_ICON : PLAY_ICON} alt={isPlaying ? '暂停' : '播放'} />
            </div>
            
            {/* 中间空白占位 */}
            <div className={styles.progressSection}>
              <div className={styles.progressPlaceholder} />
            </div>
            
            {/* 全屏按钮 - 右侧 */}
            <div className={styles.controlBtn} onClick={handleFullscreen}>
              <span className={styles.btnIcon}>{isFullscreen ? '✕' : '⛶'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

