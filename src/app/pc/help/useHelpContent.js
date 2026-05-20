import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export function useHelpContent() {
  const { t, i18n } = useTranslation();

  return useMemo(() => {
    const sections = t('pcHelp.sections', { returnObjects: true });

    return {
      heroLabel: t('pcHelp.heroLabel'),
      heroTitle: t('pcHelp.heroTitle'),
      heroTitleEm: t('pcHelp.heroTitleEm'),
      heroDesc: t('pcHelp.heroDesc'),
      searchPlaceholder: t('pcHelp.searchPlaceholder'),
      dividerLabel: t('pcHelp.dividerLabel'),
      contactLabel: t('pcHelp.contactLabel'),
      contactTitle: t('pcHelp.contactTitle'),
      contactDesc: t('pcHelp.contactDesc'),
      contactEmail: t('pcHelp.contactEmail'),
      mailSubject: t('pcHelp.mailSubject'),
      sections: Array.isArray(sections) ? sections : [],
    };
  }, [t, i18n.language]);
}
