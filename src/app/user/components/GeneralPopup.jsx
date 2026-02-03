import React from 'react';
import { Popup, List, Toast } from 'antd-mobile';
import styles from '@/app/user/page.module.less';
import CopyIcon from '@/components/Icons/CopyIcon';
import SocialMediaPopup from '@/components/SocialMediaPopup';
import { EMAIL } from '@/utils/constants';

const GeneralPopup = ({ visible, popType, onClose, t, i18n }) => {
  
  const copyToClipboard = (value) => {
    navigator.clipboard.writeText(value).then(() => {
      Toast.show({ content: t('user.copySuccess'), position: 'bottom' });
    }).catch(() => {
      Toast.show({ content: t('user.copyFailed'), position: 'bottom' });
    });
  };

  const selectLanguage = (lng) => {
    i18n.changeLanguage(lng);
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', lng);
    }
    Toast.show({
      content: lng === 'zh' ? '已切换到中文' : 'Switched to English',
      duration: 1000,
      position: 'bottom'
    });
    onClose();
  };

  const getBodyStyle = () => {
    if (popType === 'social') {
      return { background: 'transparent', padding: 0 };
    }
    return {
      borderTopLeftRadius: '24px',
      borderTopRightRadius: '24px',
      minHeight: '20vh',
      maxHeight: '80vh',
    };
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      onClose={onClose}
      position='bottom'
      bodyStyle={getBodyStyle()}
    >
      {popType === 'social' && <SocialMediaPopup />}

      {popType === 'about' && (
        <div className={`${styles.popContainer} ${styles.aboutContainer}`}>
          <div className={styles.aboutItem}>
            {t('user.aboutMozi.intro')}
          </div>
          <br />
          <div className={`${styles.aboutItem} ${styles.secDesc}`}>
            {t('user.aboutMozi.description')}
          </div>
          <div className={`${styles.aboutItem} ${styles.secCon}`}>
            <strong>{t('user.aboutMozi.mission')}</strong>
            {t('user.aboutMozi.missionText')}
          </div>
          <div className={styles.aboutItem}>
            <strong>{t('user.aboutMozi.vision')}</strong>
            {t('user.aboutMozi.visionText')}
          </div>
          <div className={styles.aboutItem}>
            <strong>{t('user.aboutMozi.values')}</strong>
            {t('user.aboutMozi.valuesText')}
          </div>
        </div>
      )}

      {popType === 'contact' && (
        <div className={`${styles.popContainer} ${styles.contactContainer}`}>
          <div className={styles.contactTitle}>{t('user.welcomeContact')}</div>
          <div className={styles.contactEmail}>
            <span>Email: {EMAIL}</span>
            <div className={styles.contactCopy} onClick={() => copyToClipboard(EMAIL)}>
              <CopyIcon width={20} height={20} color="var(--text-secondary)" />
            </div>
          </div>
        </div>
      )}

      {popType === 'attend' && (
        <div className={styles.popContainer}>
          <div className={styles.contactTitle}>{t('user.welcomeFollowUs')}</div>
          <img className={styles.attendPic} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/wechat_account.jpg' alt='公众号二维码' />
        </div>
      )}

      {popType === 'language' && (
        <div className={styles.popContainer}>
          <div className={styles.contactTitle}>{t('user.selectLanguage')}</div>
          <List className={styles.languageList}>
            <List.Item 
              className={`${styles.languageItem} ${i18n.language === 'zh' ? styles.languageItemActive : ''}`}
              onClick={() => selectLanguage('zh')}
            >
              <div className={styles.languageOption}>
                <span>简体中文</span>
                {i18n.language === 'zh' && <span className={styles.languageCheck}>✓</span>}
              </div>
            </List.Item>
            <List.Item 
              className={`${styles.languageItem} ${i18n.language === 'en' ? styles.languageItemActive : ''}`}
              onClick={() => selectLanguage('en')}
            >
              <div className={styles.languageOption}>
                <span>English</span>
                {i18n.language === 'en' && <span className={styles.languageCheck}>✓</span>}
              </div>
            </List.Item>
          </List>
        </div>
      )}
    </Popup>
  );
};

export default GeneralPopup;
