'use client';

import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

export default function SocialMediaPopup({ isPC = false }) {
  const { t } = useTranslation();

  const socialLinks = [
    {
      id: 'twitter',
      name: t('socialMedia.twitter'),
      icon: '/icons/x-logo.svg',
      url: 'https://x.com/moziinnovation',
      borderColor: '#000000'
    },
    {
      id: 'telegram-group',
      name: t('socialMedia.telegramGroup'),
      icon: '/icons/telegram-group.svg',
      url: 'https://t.me/MoziInnovations',
      borderColor: '#2AABEE'
    },
    {
      id: 'xiaohongshu',
      name: t('socialMedia.xiaohongshu'),
      icon: '/icons/xiaohongshu.svg',
      url: 'https://xhslink.com/m/60xi0L4Wsea',
      borderColor: '#FF2442'
    }
  ];

  const handleSocialClick = (url) => {
    window.open(url, '_blank');
  };

  return (
    <div className={`${styles.container} ${isPC ? styles.pcMode : ''}`}>
      <div className={styles.title}>{t('socialMedia.title')}</div>
      <div className={styles.socialGrid}>
        {socialLinks.map((social) => (
          <div
            key={social.id}
            className={styles.socialItem}
            onClick={() => handleSocialClick(social.url)}
          >
            <div 
              className={styles.iconWrapper} 
              style={{ 
                backgroundColor: '#fff',
                borderColor: social.borderColor 
              }}
            >
              <img 
                src={social.icon} 
                alt={social.name} 
                className={`${styles.icon} ${
                  social.id === 'twitter' ? styles.iconTwitter : 
                  (social.id === 'telegram-group' || social.id === 'xiaohongshu') ? styles.iconLarge : 
                  styles.iconMedium
                }`}
              />
            </div>
            <div className={styles.name}>{social.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
