'use client';

import { useTranslation } from 'react-i18next';
import styles from './index.module.less';
import { updateUserInfo } from '@/api/user';
import { persistLanguage } from '@/i18n/languageStorage';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const changeLanguage = async (lng) => {
    const normalizedLng = persistLanguage(lng);
    i18n.changeLanguage(normalizedLng);
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      try {
        await updateUserInfo({ language: normalizedLng });
      } catch (e) {
        console.error('[LanguageSwitcher] update language failed:', e);
      }
    }
  };

  return (
    <div className={styles.languageSwitcher}>
      <select
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        className={styles.select}
      >
        <option value="zh">{t('language.zh')}</option>
        <option value="en">{t('language.en')}</option>
      </select>
    </div>
  );
}
