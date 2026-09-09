'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getHubSeoCopy } from '@/utils/seoI18n';

/** 营销首页 `/` 与 `/home` 共用同一套 SEO title，并随语言切换更新 */
export default function SiteHomeTitleSync() {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const nextTitle = getHubSeoCopy('home', i18n.language).title;
    if (document.title !== nextTitle) {
      document.title = nextTitle;
    }
    return undefined;
  }, [i18n.language]);

  return null;
}
