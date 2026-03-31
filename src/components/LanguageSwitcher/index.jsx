'use client';

import { useTranslation } from 'react-i18next';
import { usePathname } from 'next/navigation';
import styles from './index.module.less';
import { editLanguage } from '@/api/user';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const pathname = usePathname();
  const isDailyRoute =
    pathname?.startsWith('/daily') ||
    (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/daily'));

  const changeLanguage = async (lng) => {
    i18n.changeLanguage(lng);
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', lng);
      const token = localStorage.getItem('token');
      // daily 页面明确不允许调用后端语言同步接口
      if (token && !isDailyRoute) {
        try {
          await editLanguage(lng);
        } catch (e) {
          console.error('[LanguageSwitcher] editLanguage failed:', e);
        }
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

