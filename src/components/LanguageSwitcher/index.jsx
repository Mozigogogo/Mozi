'use client';

import { useTranslation } from 'react-i18next';
import { usePathname } from 'next/navigation';
import styles from './index.module.less';
import { editLanguage, isEditLanguageAllowedPath } from '@/api/user';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const pathname = usePathname();
  const pathForPolicy =
    pathname ||
    (typeof window !== 'undefined' ? window.location?.pathname : '') ||
    '';
  const canSyncLanguage = isEditLanguageAllowedPath(pathForPolicy);

  const changeLanguage = async (lng) => {
    i18n.changeLanguage(lng);
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', lng);
      const token = localStorage.getItem('token');
      // 仅首页与 /user 下允许调用后端语言同步接口
      if (token && canSyncLanguage) {
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

