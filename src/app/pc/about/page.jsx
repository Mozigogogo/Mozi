'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './page.module.less';

const LOGO_URL = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/logo.svg';

function useTranslationList(key) {
  const { t } = useTranslation();
  return useMemo(() => {
    const value = t(key, { returnObjects: true });
    return Array.isArray(value) ? value : [];
  }, [key, t]);
}

function parseIdentity(str) {
  const match = String(str || '').match(/^([^:：]+)[：:]\s*(.+)$/);
  if (!match) return { label: '', text: str || '' };
  return { label: match[1].trim(), text: match[2].trim() };
}

function GridIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
      <rect x="22" y="4" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <rect x="4" y="22" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <rect x="22" y="22" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    </svg>
  );
}

export default function PCAboutPage() {
  const { t } = useTranslation();
  const coreFunctionItems = useTranslationList('pcAbout.coreFunctionItems');
  const advantageItems = useTranslationList('pcAbout.advantageItems');
  const [joinExpanded, setJoinExpanded] = useState(false);
  const [joinOverflowing, setJoinOverflowing] = useState(false);
  const joinTextRef = useRef(null);

  const mission = parseIdentity(t('pcAbout.mission'));
  const vision = parseIdentity(t('pcAbout.vision'));
  const values = parseIdentity(t('pcAbout.values'));
  const year = new Date().getFullYear();
  const joinText = t('pcAbout.joinText');

  useEffect(() => {
    const el = joinTextRef.current;
    if (!el) return undefined;

    const checkOverflow = () => {
      if (joinExpanded) {
        setJoinOverflowing(false);
        return;
      }
      setJoinOverflowing(el.scrollHeight > el.clientHeight + 1);
    };

    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [joinExpanded, joinText]);

  return (
    <div className={styles.pageWrap}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <img src={LOGO_URL} alt="MoziInnovations Mozi" className={styles.heroLogo} />
          <h1 className={styles.heroBrand}>{t('pcAbout.brandName')}</h1>
          <p className={styles.heroLead}>{t('pcAbout.lead')}</p>
        </div>
      </section>

      <section className={styles.identitySection}>
        <div className={styles.sectionInner}>
          <div className={styles.identityGrid}>
            <article className={styles.identityCard}>
              <div className={styles.identityIcon}>
                <GridIcon />
              </div>
              <h2 className={styles.identityLabel}>{mission.label}</h2>
              <p className={styles.identityText}>{mission.text}</p>
            </article>
            <article className={styles.identityCard}>
              <div className={styles.identityIcon}>
                <GridIcon />
              </div>
              <h2 className={styles.identityLabel}>{vision.label}</h2>
              <p className={styles.identityText}>{vision.text}</p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.featureSection}>
        <div className={styles.featureInner}>
          <div className={styles.featureContent}>
            <h2 className={styles.sectionHeading}>{t('pcAbout.coreFunctionsTitle')}</h2>
            <p className={styles.sectionIntro}>{t('pcAbout.coreFunctionsIntro')}</p>
            <ul className={styles.featureList}>
              {coreFunctionItems.map((item, index) => (
                <li key={item.label} className={styles.featureItem}>
                  <span className={styles.featureIndex}>{String(index + 1).padStart(2, '0')}</span>
                  <div className={styles.featureBody}>
                    <strong className={styles.featureLabel}>{item.label}</strong>
                    <span>{item.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.featureVisual} aria-hidden="true">
            <div className={styles.visualCardMain}>
              <span className={styles.visualTag}>Mozi</span>
              <span className={styles.visualTitle}>{t('pcAbout.visualTitle')}</span>
              <span className={styles.visualDesc}>{t('pcAbout.visualDesc')}</span>
            </div>
            <div className={styles.visualCoin}>₿</div>
            <div className={styles.visualCoinAlt}>Ξ</div>
          </div>
        </div>
      </section>

      <section className={styles.advantageSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionHeadingDark}>{t('pcAbout.advantagesTitle')}</h2>
          <div className={styles.advantageGrid}>
            {advantageItems.map((item) => (
              <article key={item.label} className={styles.advantageCard}>
                <h3 className={styles.advantageLabel}>{item.label}</h3>
                <p className={styles.advantageText}>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.valuesSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.valuesHeading}>{t('pcAbout.cultureTitle')}</h2>
          <p className={styles.valuesLabel}>{values.label}</p>
          <p className={styles.valuesText}>{values.text}</p>
        </div>
      </section>

      <section className={styles.joinSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionHeadingDark}>{t('pcAbout.joinTitle')}</h2>
          <p
            ref={joinTextRef}
            className={`${styles.joinText} ${joinExpanded ? styles.joinTextExpanded : ''}`}
          >
            {joinText}
          </p>
          {(joinOverflowing || joinExpanded) ? (
            <button
              type="button"
              className={styles.expandBtn}
              onClick={() => setJoinExpanded((prev) => !prev)}
            >
              {joinExpanded ? t('pcAbout.showLess') : t('pcAbout.showMore')}
              <span className={styles.expandArrow}>{joinExpanded ? '∧' : '>'}</span>
            </button>
          ) : null}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <img src={LOGO_URL} alt="Mozi" className={styles.footerLogo} />
            <span className={styles.footerName}>{t('pcAbout.brandName')}</span>
          </div>
          <p className={styles.copyright}>{t('pcAbout.copyright', { year })}</p>
        </div>
      </footer>
    </div>
  );
}
