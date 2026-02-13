'use client';

import React, { useState, useEffect } from 'react';
import styles from './index.module.less';
import { useTranslation } from 'react-i18next';

const GetPointsModal = ({ visible: propVisible, points: propPoints = 10, onClose: propOnClose }) => {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  
  // 内部状态，用于全局事件触发
  const [stateVisible, setStateVisible] = useState(false);
  const [statePoints, setStatePoints] = useState(10);

  // 判断是否为受控模式 (传入了 visible 属性则视为受控)
  const isControlled = typeof propVisible !== 'undefined';
  
  const visible = isControlled ? propVisible : stateVisible;
  const points = isControlled ? propPoints : statePoints;
  const onClose = isControlled ? propOnClose : () => setStateVisible(false);

  useEffect(() => {
    // 如果是受控组件，不监听全局事件，或者也可以同时监听？
    // 这里选择如果不是受控组件，则监听全局事件
    if (!isControlled) {
      const handleShowPointsModal = (event) => {
        const { points: earnedPoints } = event.detail || {};
        if (earnedPoints) {
          setStatePoints(earnedPoints);
        }
        setStateVisible(true);
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('SHOW_POINTS_MODAL', handleShowPointsModal);
      }

      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('SHOW_POINTS_MODAL', handleShowPointsModal);
        }
      };
    }
  }, [isControlled]);

  if (!visible) return null;

  return (
    <div className={styles.mask} onClick={onClose}>
      <div className={`${styles.container} ${isEnglish ? styles.enContainer : ''}`} onClick={e => e.stopPropagation()}>
        <img 
          src={isEnglish ? "/icons/new_home/get_point_en.png" : "/icons/new_home/get_ponit.png"}
          alt="Get Points" 
          className={styles.mainImage}
        />
        <div className={styles.pointsText}>
          <span className={styles.label}>{t('points.points') || '积分'}</span>
          <span className={styles.pointsValue}>+{points}</span>
        </div>
      </div>
    </div>
  );
};

export default GetPointsModal;
