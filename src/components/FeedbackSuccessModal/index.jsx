'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';
import pcStyles from './pc.module.less';

export default function FeedbackSuccessModal({ visible, onClose }) {
  const { t } = useTranslation();
  const isPC = typeof window !== 'undefined' && window.innerWidth >= 1024;
  const s = isPC ? pcStyles : styles;

  const handleJoinCommunity = () => {
    console.log('🔵 [FeedbackSuccessModal] 点击加入社区按钮');
    window.open('https://t.me/MoziInnovations', '_blank');
    onClose?.();
  };

  const handleOverlayClick = (e) => {
    // 只有点击遮罩层本身（不是内容区域）时才关闭
    if (e.target === e.currentTarget) {
      console.log('🟡 [FeedbackSuccessModal] 点击遮罩层，准备关闭弹窗');
      onClose?.();
    }
  };

  // 禁止背景滚动
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);


  if (!visible) return null;

  return (
    <div className={s.modalOverlay} onClick={handleOverlayClick}>
      <div className={s.modalContent}>
        <div className={s.imageContainer}>
          <img 
            src="/images/activity/toast_modal.png" 
            alt="Success"
            className={s.successImage}
          />
          
          <div className={s.mainWrapper}>
            <div className={s.titleWrapper}>
              <div className={s.mainTitle}>
                {t('feedbackSuccess.title')}
              </div>
            </div>
            
            <div className={s.contentWrapper}>
              <div className={s.subText}>
                {t('feedbackSuccess.successMessage')}
              </div>
              <div className={s.subText2}>
                {t('feedbackSuccess.joinPrompt')}
              </div>
              
              <button 
                className={s.joinButton}
                onClick={handleJoinCommunity}
              >
                {t('feedbackSuccess.joinButton')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
