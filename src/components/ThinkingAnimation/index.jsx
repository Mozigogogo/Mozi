'use client';

import { useRef, useEffect } from 'react';
import Lottie from 'lottie-react';
import loadingAnimation from '../../../public/loadding/loadding.json';

// 正在思考的动画组件 - 使用 Lottie 动画
const ThinkingAnimation = ({ size = 40 }) => {
  const lottieRef = useRef(null);
  const dimension = Number(size) > 0 ? Number(size) : 40;

  useEffect(() => {
    // 设置动画速度为 3 倍
    if (lottieRef.current) {
      lottieRef.current.setSpeed(3);
    }
  }, []);

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={loadingAnimation}
      loop={true}
      autoplay={true}
      style={{
        width: dimension,
        height: dimension,
        flexShrink: 0,
      }}
    />
  );
};

export default ThinkingAnimation;
