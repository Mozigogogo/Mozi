import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import ArrowRightIcon from './ArrowRightIcon';
import styles from './index.module.less';

export default function WelcomePopup({ visible, onClose, onConfirm }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  
  // 判断当前语言是否为英文
  const isEnglish = i18n.language?.startsWith('en');
  
  // 根据语言选择图片资源
  const bgImage = isEnglish ? '/point/point_en_modal_bg.png' : '/point/point_modal_bg.png';
  const rightImage = isEnglish ? '/point/ponit_en_modal_right_text.png' : '/point/ponit_modal_right_text.png';

  const handleJoinClick = () => {
    // 保存状态并跳转到积分中心页面
    if (onConfirm) onConfirm();
    router.push('/pointsdetail');
  };

  const handleClose = () => {
    // 保存状态并关闭弹窗
    if (onConfirm) onConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div 
          className={styles.popupOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
      <div className={styles.container}>
        {/* 主卡片 */}
        <div 
          className={styles.card}
          style={{
            background: `url('${bgImage}') center center / 100% 100% no-repeat`
          }}
        >
          {/* 顶部品牌标识 */}
          <Image 
            src="/point/ponit_modal_logo.png" 
            alt="Mozi Logo" 
            width={140} 
            height={40}
            className={styles.brandLogo}
            priority
            unoptimized
          />

          {/* 获取积分提示卡片 */}
          <Image 
            src={rightImage}
            alt="Earn Points" 
            width={173} 
            height={125}
            className={styles.pointsCard}
            priority
            unoptimized
          />

          {/* 加入按钮 */}
          <button className={styles.joinButton} onClick={handleJoinClick}>
            <span>{t('welcomePopup.joinNow')}</span>
            <ArrowRightIcon />
          </button>
        </div>

        {/* 关闭按钮 */}
        <div className={styles.closeBtn} onClick={handleClose}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="11" fill="rgba(189,189,189,0.5)" />
            <path d="M8 8L16 16M16 8L8 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
