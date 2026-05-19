'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PCLayout from '@/components/PCLayout';
import styles from './page.module.less';

function useTranslationList(key) {
  const { t } = useTranslation();
  return useMemo(() => {
    const value = t(key, { returnObjects: true });
    return Array.isArray(value) ? value : [];
  }, [key, t]);
}

export default function PCAboutPage() {
  const { t } = useTranslation();
  const coreFunctionItems = useTranslationList('pcAbout.coreFunctionItems');
  const advantageItems = useTranslationList('pcAbout.advantageItems');

  return (
    <PCLayout>
      <div className={styles.pageWrap}>
        <article className={styles.article}>
          <h1 className={styles.mainTitle}>{t('pcAbout.title')}</h1>
          <p className={styles.lead}>{t('pcAbout.lead')}</p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('pcAbout.coreFunctionsTitle')}</h2>
            <p className={styles.bodyText}>{t('pcAbout.coreFunctionsIntro')}</p>
            <ul className={styles.itemList}>
              {coreFunctionItems.map((item) => (
                <li key={item.label} className={styles.item}>
                  <span className={styles.itemLabel}>{item.label}</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('pcAbout.advantagesTitle')}</h2>
            <ul className={styles.itemList}>
              {advantageItems.map((item) => (
                <li key={item.label} className={styles.item}>
                  <span className={styles.itemLabel}>{item.label}</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('pcAbout.cultureTitle')}</h2>
            <ul className={styles.identityList}>
              <li className={styles.identityItem}>{t('pcAbout.mission')}</li>
              <li className={styles.identityItem}>{t('pcAbout.vision')}</li>
              <li className={styles.identityItem}>{t('pcAbout.values')}</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('pcAbout.joinTitle')}</h2>
            <p className={styles.bodyText}>{t('pcAbout.joinText')}</p>
          </section>
        </article>
      </div>
    </PCLayout>
  );
}
