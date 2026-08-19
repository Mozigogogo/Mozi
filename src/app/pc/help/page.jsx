'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHelpContent } from './useHelpContent';
import styles from './page.module.less';

function ToggleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="6" y1="1" x2="6" y2="11" />
      <line x1="1" y1="6" x2="11" y2="6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function PCHelpPage() {
  const { t } = useTranslation();
  const content = useHelpContent();

  const [openFaqId, setOpenFaqId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hiddenSections, setHiddenSections] = useState(new Set());
  const [hiddenItems, setHiddenItems] = useState(new Set());
  const [highlightedQuestions, setHighlightedQuestions] = useState({});
  const itemRefs = useRef({});

  const toggleFaq = useCallback((id) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  }, []);

  const handleSearchChange = useCallback(
    (e) => {
      const q = e.target.value.trim().toLowerCase();
      setSearchQuery(e.target.value);
      setOpenFaqId(null);

      if (!q) {
        setHiddenSections(new Set());
        setHiddenItems(new Set());
        setHighlightedQuestions({});
        return;
      }

      const nextHiddenSections = new Set();
      const nextHiddenItems = new Set();
      const nextHighlights = {};

      content.sections.forEach((section) => {
        let hasVisible = false;
        section.items.forEach((item) => {
          if (item.question.toLowerCase().includes(q) || item.answerHtml.toLowerCase().includes(q)) {
            hasVisible = true;
            const re = new RegExp(`(${escapeRegExp(q)})`, 'gi');
            nextHighlights[item.id] = item.question.replace(
              re,
              `<mark class="${styles.highlight}">$1</mark>`
            );
          } else {
            nextHiddenItems.add(item.id);
          }
        });
        if (!hasVisible) nextHiddenSections.add(section.id);
      });

      setHiddenSections(nextHiddenSections);
      setHiddenItems(nextHiddenItems);
      setHighlightedQuestions(nextHighlights);
    },
    [content.sections]
  );

  const handleAnswerClick = useCallback((e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (href === '#contact') {
      e.preventDefault();
      document.getElementById('help-contact')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const sendEmail = useCallback(() => {
    const subject = encodeURIComponent(content.mailSubject);
    window.location.href = `mailto:notice@moziinnovations.com?subject=${subject}`;
  }, [content.mailSubject]);

  const visibleSections = content.sections.filter((s) => !hiddenSections.has(s.id));

  return (
    <>
      <div className={styles.pageWrap}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.heroLabel}>{content.heroLabel}</p>
            <h1 className={styles.heroTitle}>
              {content.heroTitle}
              <br />
              <em className={styles.heroTitleEm}>{content.heroTitleEm}</em>
            </h1>
            <p className={styles.heroDesc}>{content.heroDesc}</p>
            <div className={styles.searchWrap}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder={content.searchPlaceholder}
                value={searchQuery}
                onChange={handleSearchChange}
                autoComplete="off"
                aria-label={t('pcHelp.searchPlaceholder')}
              />
              <SearchIcon />
            </div>
          </div>
        </section>

        <main className={styles.main}>
          <div className={styles.divider}>
            <hr />
            <span>{content.dividerLabel}</span>
            <hr />
          </div>

          {visibleSections.map((section) => (
            <section key={section.id} className={styles.faqSection} data-cat={section.id}>
              <div className={styles.sectionHeading}>
                <h2>{section.title}</h2>
                <span className={styles.sectionCount}>{section.count}</span>
              </div>
              <div className={styles.faqList}>
                {section.items
                  .filter((item) => !hiddenItems.has(item.id))
                  .map((item) => (
                    <div
                      key={item.id}
                      id={item.id}
                      ref={(el) => {
                        itemRefs.current[item.id] = el;
                      }}
                      className={`${styles.faqItem} ${openFaqId === item.id ? styles.faqItemOpen : ''}`}
                    >
                      <button
                        type="button"
                        className={styles.faqQ}
                        onClick={() => toggleFaq(item.id)}
                        aria-expanded={openFaqId === item.id}
                      >
                        <span
                          className={styles.faqQText}
                          dangerouslySetInnerHTML={{
                            __html: highlightedQuestions[item.id] || item.question,
                          }}
                        />
                        <span className={styles.faqToggle}>
                          <ToggleIcon />
                        </span>
                      </button>
                      <div className={styles.faqA}>
                        <div
                          className={styles.faqAInner}
                          onClick={handleAnswerClick}
                          dangerouslySetInnerHTML={{ __html: item.answerHtml }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))}

          <section className={styles.contactSection} id="help-contact">
            <div>
              <p className={styles.contactLabel}>{content.contactLabel}</p>
              <h2 className={styles.contactTitle}>{content.contactTitle}</h2>
              <p className={styles.contactDesc}>{content.contactDesc}</p>
            </div>
            <div className={styles.contactButtons}>
              <button type="button" className={styles.btnPrimary} onClick={sendEmail}>
                ✉️ &nbsp;{content.contactEmail}
              </button>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
