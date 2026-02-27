'use client';

import React from 'react';
import PointsPoolCard from '@/components/PointsPoolCard';
import { useTranslation } from 'react-i18next';

export default function PointsPoolPage() {
  const { t } = useTranslation();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <PointsPoolCard />
    </div>
  );
}
