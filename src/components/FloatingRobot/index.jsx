'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { trackEvent, HomeEvents } from '@/utils/amplitude';
import styles from './index.module.less';

// 简单文本组件
function BubbleText({ text }) {
  return (
    <div className={styles.bubbleText}>
      {text}
    </div>
  );
}

export default function FloatingRobot({
  message,
  targetPath = '/ai',
  startDelay = 500,
  showDuration = 5000,
  autoPlay = true,
  enableMagnet = true
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const robotRef = useRef(null);
  
  // 机器人交互状态
  const [showRobotBubble, setShowRobotBubble] = useState(false);
  
  // 鼠标位置用于磁吸效果
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // 机器人位置弹簧动画
  const springConfig = { damping: 25, stiffness: 150 };
  const robotX = useSpring(useTransform(mouseX, [0, 1], [0, 0]), springConfig);
  const robotY = useSpring(useTransform(mouseY, [0, 1], [0, 0]), springConfig);
  
  // 机器人动画状态
  const [robotAnimState, setRobotAnimState] = useState(autoPlay ? 'hidden' : 'resting');
  
  // 动态计算的滚动距离（使用null表示未计算）
  const [calculatedScrollX, setCalculatedScrollX] = useState(null);
  
  // 在动画开始前测量文字宽度并计算滚动距离
  const measureAndCalculateScroll = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= 768;
    
    // 创建临时测量元素
    const measureDiv = document.createElement('div');
    measureDiv.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      visibility: hidden;
      white-space: nowrap;
      font-size: ${isMobile ? '12px' : '14px'};
      font-weight: 500;
      padding-left: ${isMobile ? '10px' : '12px'};
    `;
    measureDiv.textContent = message || t('home.robotBubble');
    document.body.appendChild(measureDiv);
    
    // 测量文字宽度
    const textWidth = measureDiv.offsetWidth;
    document.body.removeChild(measureDiv);
    
    // 计算总宽度
    const robotIconWidth = isMobile ? 50 : 64;
    const containerPadding = isMobile ? 12 : 16; // 右侧padding
    const totalContainerWidth = robotIconWidth + textWidth + containerPadding;
    
    // 计算滚动距离的关键参数
    const floatBtnRight = isMobile ? 16 : 24; // 按钮距离屏幕右侧的距离
    const targetRightMargin = 10; // 容器右侧距离屏幕右侧的目标距离
    
    // 重新理解布局：
    // 1. CSS中设置 right: floatBtnRight，这是容器右边缘的初始位置
    // 2. 当translateX = 0时，容器右边缘距离屏幕右侧 = floatBtnRight
    // 3. 容器左边缘 = 屏幕宽度 - floatBtnRight - totalContainerWidth
    // 4. 如果容器左边缘 < 0，说明超出屏幕左侧，需要向右移动
    // 5. 如果容器右边缘 > targetRightMargin，需要向左移动
    
    // 当前状态（translateX = 0）：
    const currentRightPosition = floatBtnRight; // 容器右边缘距离屏幕右侧
    const currentLeftPosition = screenWidth - floatBtnRight - totalContainerWidth; // 容器左边缘距离屏幕左侧
    
    // 方案1：让容器右侧边缘距离屏幕 = targetRightMargin
    let scrollX = -(floatBtnRight - targetRightMargin);
    
    // 检查：确保容器左侧不会超出屏幕
    const finalLeftPosition = currentLeftPosition + scrollX; // 移动后的左边缘位置
    if (finalLeftPosition < 0) {
      // 如果容器太宽，左侧会超出，则向右调整，让左侧对齐屏幕边缘
      scrollX = -currentLeftPosition;
    }
    
    
    setCalculatedScrollX(scrollX);
  }, [message, t]);
  
  // 页面加载时先计算滚动距离，再触发动画
  useEffect(() => {
    if (!autoPlay) return;
    
    // 先测量并计算滚动距离
    measureAndCalculateScroll();
    
    const timer1 = setTimeout(() => {
      setRobotAnimState('rolling-in');
      setShowRobotBubble(true);
      
    }, startDelay);
    
    const timer2 = setTimeout(() => {
      setRobotAnimState('showing');
    }, startDelay + 1800);
    
    const timer3 = setTimeout(() => {
      setShowRobotBubble(false);
      setRobotAnimState('rolling-out');
    }, startDelay + 1800 + showDuration);
    
    const timer4 = setTimeout(() => {
      setRobotAnimState('resting');
    }, startDelay + 1800 + showDuration + 1100);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [autoPlay, startDelay, showDuration, measureAndCalculateScroll]);

  // 鼠标磁吸效果
  useEffect(() => {
    if (!enableMagnet) return;
    
    const handleMouseMove = (e) => {
      if (!robotRef.current) return;
      
      const rect = robotRef.current.getBoundingClientRect();
      const robotCenterX = rect.left + rect.width / 2;
      const robotCenterY = rect.top + rect.height / 2;
      
      const distanceX = e.clientX - robotCenterX;
      const distanceY = e.clientY - robotCenterY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      
      const magnetRange = 150;
      if (distance < magnetRange) {
        const magnetStrength = (magnetRange - distance) / magnetRange;
        const moveX = (distanceX / distance) * magnetStrength * 15;
        const moveY = (distanceY / distance) * magnetStrength * 15;
        
        mouseX.set(moveX);
        mouseY.set(moveY);
      } else {
        mouseX.set(0);
        mouseY.set(0);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY, enableMagnet]);

  const displayMessage = message || t('home.robotBubble');

  // AI 按钮点击处理
  const handleRobotClick = () => {
    // 埋点：点击AI按钮
    trackEvent(HomeEvents.AI_CLICKED, {
      targetPath,
      robotState: robotAnimState
    });
    
    // 跳转到目标页面
    router.push(targetPath);
  };

  return (
    <motion.div 
      ref={robotRef}
      className={styles.floatRobotBtn} 
      onClick={handleRobotClick}
      style={{
        x: robotX,
        y: robotY,
      }}
      initial={{ 
        x: typeof window !== 'undefined' ? window.innerWidth : 500,
        opacity: autoPlay ? 0 : 1
      }}
      animate={
        robotAnimState === 'hidden' ? { 
          x: typeof window !== 'undefined' ? window.innerWidth : 500,
          opacity: 0 
        } :
        robotAnimState === 'rolling-in' ? { 
          x: calculatedScrollX !== null ? calculatedScrollX : (typeof window !== 'undefined' ? (window.innerWidth <= 768 ? -window.innerWidth * 0.5 : -window.innerWidth * 0.4) : -200),
          opacity: 1 
        } :
        robotAnimState === 'showing' ? { 
          x: calculatedScrollX !== null ? calculatedScrollX : (typeof window !== 'undefined' ? (window.innerWidth <= 768 ? -window.innerWidth * 0.5 : -window.innerWidth * 0.4) : -200),
          opacity: 1 
        } :
        robotAnimState === 'rolling-out' ? { 
          x: typeof window !== 'undefined' ? window.innerWidth : 500,
          opacity: 1 
        } :
        robotAnimState === 'resting' ? { 
          x: 0,
          opacity: 1 
        } :
        { 
          x: 0,
          opacity: 1 
        }
      }
      transition={
        robotAnimState === 'rolling-out' ? {
          x: { duration: 1.1, ease: "easeInOut" },
          opacity: { duration: 0.4 }
        } :
        robotAnimState === 'resting' ? {
          x: { duration: 0.3, ease: "easeOut" },
          opacity: { duration: 0.2 }
        } : {
          x: { duration: 1.8, ease: "easeInOut" },
          opacity: { duration: 0.6 }
        }
      }
    >
      {/* 椭圆容器 */}
      <motion.div
        className={styles.robotContainer}
        initial={{ width: 64 }}
        animate={{
          width: robotAnimState === 'rolling-in' || robotAnimState === 'showing' ? 'auto' : 64
        }}
        transition={{
          duration: robotAnimState === 'rolling-in' ? 1.2 : 
                     robotAnimState === 'rolling-out' ? 0.3 : 0.4,
          ease: [0.4, 0, 0.2, 1],
          delay: robotAnimState === 'rolling-in' ? 0.4 : 
                 robotAnimState === 'rolling-out' ? 0.8 : 0
        }}
      >
        {/* 背景层 */}
        <motion.div
          className={styles.robotContainerBg}
          initial={{ opacity: 0 }}
          animate={{
            opacity: robotAnimState === 'rolling-in' || robotAnimState === 'showing' ? 1 : 0
          }}
          transition={{
            duration: 0.6,
            ease: "easeInOut",
            delay: robotAnimState === 'rolling-in' ? 0.6 : 0
          }}
        />
      
        {/* 机器人图标容器 */}
        <div className={styles.robotIconWrapper}>
          {/* 光晕效果 */}
          <motion.div 
            className={styles.robotGlow}
            animate={
              robotAnimState === 'showing' || robotAnimState === 'resting' ? {
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              } : {
                scale: 1,
                opacity: 0.5
              }
            }
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* 机器人图标 */}
          <motion.img 
          className={styles.robotIcon} 
          src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/AI_Bot.png" 
          alt="AI助手"
            initial={{ rotate: 0 }}
            animate={
              robotAnimState === 'showing' || robotAnimState === 'resting' ? {
                y: [0, -5, 0],
                rotate: -720
              } :
              robotAnimState === 'rolling-in' ? {
                rotate: -720
              } :
              robotAnimState === 'rolling-out' ? {
                rotate: 0
              } : {
                rotate: 0
              }
            }
            transition={
              robotAnimState === 'rolling-in' ? {
                rotate: { duration: 1.8, ease: "linear" }
              } :
              robotAnimState === 'rolling-out' ? {
                rotate: { duration: 1.1, ease: "linear" }
              } :
              robotAnimState === 'showing' || robotAnimState === 'resting' ? {
                y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 0 }
              } : {
                duration: 0
              }
            }
          />
        </div>
        
        {/* 欢迎消息文字 */}
        <AnimatePresence>
          {(robotAnimState === 'rolling-in' || robotAnimState === 'showing') && (
            <motion.div 
              className={styles.robotMessage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <BubbleText text={displayMessage} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
