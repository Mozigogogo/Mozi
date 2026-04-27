'use client';

import { LeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import PCLayout from '@/components/PCLayout';
import { BenefitsPageContent } from '@/app/benefits/page';
import { safeBack } from '@/utils/navigation';
import styles from './page.module.less';

export default function PCBenefitsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <PCLayout>
      <div className={styles.pcWrap}>
        <header className={styles.pcHeader}>
          <div className={styles.pcHeaderLeft}>
            <button
              type="button"
              className={styles.pcBackBtn}
              onClick={() => safeBack(router, { fallback: '/' })}
              aria-label={t('common.back', { defaultValue: '返回' })}
              style={{
                width: '43px',
                height: '43px',
                maxWidth: '43px',
                maxHeight: '43px',
                fontSize: '14px'
              }}
            >
              <LeftOutlined />
            </button>
            <h1
              className={styles.pcTitle}
              style={{
                fontSize: '24px',
                lineHeight: '31px'
              }}
            >
              {t('benefitsPage.title', { defaultValue: '我的权益' })}
            </h1>
          </div>
        </header>

        <BenefitsPageContent showNavBar={false} className={styles.pcBenefitsContainer} isPc />
      </div>
    </PCLayout>
  );
}
