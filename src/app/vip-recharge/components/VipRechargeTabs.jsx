'use client';

import React, { useMemo } from 'react';
import VipTabs from '@/components/VipTabs';

export default function VipRechargeTabs({ t, onChange }) {
  const tabs = useMemo(
    () => [
      { id: 'monthly', label: t('vip.plan.month') },
      { id: 'yearly', label: t('vip.plan.year'), badge: t('vip.planCard.savingBadge', { percent: 17 }) },
    ],
    [t]
  );

  return (
    <VipTabs
      tabs={tabs}
      defaultActiveId="monthly"
      onChange={onChange}
      variant="highlight"
      size="medium"
      headerOnly={true}
    />
  );
}

