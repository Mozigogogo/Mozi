'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import PCSearchResults from '@/components/PCSearchResults';
import { Loading } from '@/components/Loading';

function PCSearchPageContent() {
  const searchParams = useSearchParams();
  const keyword = (searchParams.get('keyword') || '').trim();

  return <PCSearchResults keyword={keyword} />;
}

export default function PCSearchPage() {
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
          <Loading tip={t('common.loading')} size={32} />
        </div>
      }
    >
      <PCSearchPageContent />
    </Suspense>
  );
}
