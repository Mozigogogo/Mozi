'use client';

import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
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

