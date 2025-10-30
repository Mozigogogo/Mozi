'use client';

import { motion } from 'framer-motion';

// 正在思考的动画组件 - 波浪式跳动
const ThinkingAnimation = () => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <span>正在思考中</span>
      <div style={{ 
        display: 'flex', 
        gap: '4px',
        alignItems: 'center'
      }}>
        <motion.span
          animate={{ 
            y: [0, -4, 0]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0
          }}
          style={{ 
            display: 'inline-block',
            fontSize: '20px',
            lineHeight: '1',
            color: '#999'
          }}
        >
          •
        </motion.span>
        <motion.span
          animate={{ 
            y: [0, -4, 0]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3
          }}
          style={{ 
            display: 'inline-block',
            fontSize: '20px',
            lineHeight: '1',
            color: '#999'
          }}
        >
          •
        </motion.span>
        <motion.span
          animate={{ 
            y: [0, -4, 0]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.6
          }}
          style={{ 
            display: 'inline-block',
            fontSize: '20px',
            lineHeight: '1',
            color: '#999'
          }}
        >
          •
        </motion.span>
      </div>
    </div>
  );
};

export default ThinkingAnimation;

