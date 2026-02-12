import React from 'react';
import styles from './index.module.less';
import { useTranslation } from 'react-i18next';

const GetPointsModal = ({ visible, points = 10, onClose }) => {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';

  if (!visible) return null;

  return (
    <div className={styles.mask} onClick={onClose}>
      <div className={styles.container} onClick={e => e.stopPropagation()}>
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
