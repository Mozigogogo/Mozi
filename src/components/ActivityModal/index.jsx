'use client';

import styles from './index.module.less';

export default function ActivityModal({ visible, onClose, onConfirm }) {
  if (!visible) return null;

  const handleMaskClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const handleButtonClick = () => {
    onConfirm?.();
  };

  return (
    <div className={styles.modalMask} onClick={handleMaskClick}>
      <div className={styles.modalContent}>
        {/* 底部背景图 */}
        <div className={styles.backgroundImage}>
          <img src="/images/activity/Mask group@2x.png" alt="background" />
        </div>

        {/* 星星背景层 */}
        <div className={styles.starBackground}>
          <img src="/images/activity/star_bg.svg" alt="stars" />
        </div>

        {/* Frame 图片 */}
        <div className={styles.frameImage}>
          <img src="/images/activity/frame.svg" alt="frame" />
          
          <div className={styles.logoImage}>
            <img src="/images/activity/logo.svg" alt="logo" />
          </div>
          
          {/* IP图片 - 相对于 Frame 定位在右上角 */}
          <div className={styles.ipImage}>
            <img src="/images/activity/ip.svg" alt="ip" />
          </div>
          
          {/* 毛玻璃背景 - 相对于 Frame 定位在底部 */}
          <div className={styles.glassBackground}>
            <img src="/images/activity/modal_bg_glass.png" alt="glass background" />
            
            {/* 活动标题文字 */}
            <div className={styles.activityTitle}>
              <div>MOZI</div>
              <div>限量体验官招募中</div>
            </div>
            
            {/* 副标题文字 */}
            <div className={styles.activitySubtitle}>
              行体验产品  反馈拿奖！！
            </div>
            
            {/* 参与体验按钮 */}
            <button className={styles.participateButton} onClick={handleButtonClick}>
              参与体验
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
