'use client';

import { Suspense, useEffect, useState } from 'react';
import { Empty } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import PCSearchResults from '@/components/PCSearchResults';
import { Loading } from '@/components/Loading';
import { getPcSearchRoute, validateSearchSymbol } from '@/utils/searchValidate';
import styles from '@/components/PCSearchResults/index.module.less';

function PCSearchPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyword = (searchParams.get('keyword') || '').trim();
  const [status, setStatus] = useState(keyword ? 'loading' : 'invalid');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!keyword) {
        setStatus('invalid');
        return;
      }

      setStatus('loading');
      const type = await validateSearchSymbol(keyword);
      if (cancelled) return;

      if (type === 'stock') {
        router.replace(getPcSearchRoute('stock', keyword));
        return;
      }

      if (type === 'crypto') {
        setStatus('crypto');
        return;
      }

      setStatus('invalid');
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [keyword, router]);

  if (status === 'loading') {
    return (
      <div className={`${styles.searchResults} ${styles.searchResultsLoading}`}>
        <div className={styles.loadingWrapper}>
          <Loading tip={t('common.loading')} size={32} />
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className={styles.searchResults}>
        <Empty description={t('search.invalidCoin')} />
      </div>
    );
  }

  return <PCSearchResults keyword={keyword} />;
}

export default function PCSearchPage() {
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={
        <div className={`${styles.searchResults} ${styles.searchResultsLoading}`}>
          <div className={styles.loadingWrapper}>
            <Loading tip={t('common.loading')} size={32} />
          </div>
        </div>
      }
    >
      <PCSearchPageContent />
    </Suspense>
  );
}
