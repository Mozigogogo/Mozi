'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { allCountries } from 'country-telephone-data';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

export default function CountryPickerOverlay({
  open = false,
  onClose,
  onSelect,
  title,
  searchPlaceholder,
}) {
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const listRef = useRef(null);

  const resolvedTitle = title || t('countryPicker.title');
  const resolvedSearchPlaceholder = searchPlaceholder || t('countryPicker.searchPlaceholder');
  const resolvedBackText = t('countryPicker.back');

  useEffect(() => {
    setMounted(true);
  }, []);

  const isZh = ((i18n?.language || '').toLowerCase().startsWith('zh'));
  const zhDisplayNames = useMemo(() => {
    if (typeof Intl === 'undefined' || typeof Intl.DisplayNames === 'undefined') return null;
    try {
      return new Intl.DisplayNames(['zh-CN'], { type: 'region' });
    } catch {
      return null;
    }
  }, []);

  const countries = useMemo(
    () =>
      allCountries
        .map((c) => {
          // Some versions export each country as an array:
          // [name, iso2, dialCode, priority, areaCodes]
          if (Array.isArray(c)) {
            const nameEn = c[0];
            const iso2 = c[1];
            const dialCode = c[2];
            const nameZh = (zhDisplayNames && iso2) ? (zhDisplayNames.of(String(iso2).toUpperCase()) || '') : '';
            return {
              iso2,
              nameEn,
              nameZh,
              name: isZh ? (nameZh || nameEn) : nameEn,
              dialCode: dialCode ? `+${dialCode}` : '',
            };
          }

          const nameEn = c?.name || '';
          const iso2 = c?.iso2 || c?.iso || '';
          const nameZh = (zhDisplayNames && iso2) ? (zhDisplayNames.of(String(iso2).toUpperCase()) || '') : '';

          return {
            iso2,
            nameEn,
            nameZh,
            name: isZh ? (nameZh || nameEn) : nameEn,
            dialCode: c?.dialCode ? `+${c.dialCode}` : '',
          };
        })
        .filter((c) => c.name && c.dialCode)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [isZh, zhDisplayNames]
  );

  const filteredCountries = useMemo(() => {
    const qRaw = query.trim();
    if (!qRaw) return countries;
    const qLower = qRaw.toLowerCase();
    return countries.filter((c) => {
      const nameEnLower = (c.nameEn || '').toLowerCase();
      const displayLower = (c.name || '').toLowerCase();
      const matchEn = nameEnLower.includes(qLower) || displayLower.includes(qLower);
      const matchZh = (c.nameZh || '').includes(qRaw) || (c.name || '').includes(qRaw);
      const matchCode = (c.dialCode || '').includes(qRaw);
      return matchEn || matchZh || matchCode;
    });
  }, [countries, query]);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setQuery('');

    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = 0;
    });

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.mask} onClick={() => onClose?.()} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <button type="button" className={styles.back} onClick={() => onClose?.()}>
            {resolvedBackText}
          </button>
          <div className={styles.title}>{resolvedTitle}</div>
          <div className={styles.headerRight} />
        </div>

        <div className={styles.searchWrap}>
          <input
            className={styles.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={resolvedSearchPlaceholder}
          />
        </div>

        <div className={styles.body}>
          <div className={styles.list} ref={listRef}>
            {filteredCountries.map((c) => (
              <button
                key={`${c.name}-${c.dialCode}`}
                type="button"
                className={styles.item}
                onClick={() => {
                  onSelect?.(c);
                  onClose?.();
                }}
              >
                <span className={styles.itemName}>{c.name}</span>
                <span className={styles.itemCode}>{c.dialCode}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
