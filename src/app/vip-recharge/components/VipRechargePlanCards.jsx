'use client';

import React from 'react';
import { Spin } from 'antd';
import PlanCard from '@/components/PlanCard';

export default function VipRechargePlanCards({ plans = [], loading = false, fullWidth = false, compact = false }) {
  const wrapperStyle = fullWidth
    ? {
        display: 'grid',
        width: '100%',
        gridTemplateColumns: `repeat(${Math.max(plans.length, 1)}, minmax(0, 1fr))`,
        gap: compact ? '12px' : '16px',
        alignItems: 'stretch',
      }
    : {
        display: 'inline-flex',
        gap: '16px',
        minWidth: 'max-content',
        alignItems: 'stretch',
      };

  return (
    <Spin spinning={loading}>
      <div style={wrapperStyle}>
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            title={plan.title}
            price={plan.price}
            currency={plan.currency}
            period={plan.period}
            description={plan.description}
            features={plan.features}
            highlightFeature={plan.highlightFeature}
            tierSelect={plan.tierSelect}
            accentColor={plan.accentColor}
            buttonText={plan.buttonText}
            isPopular={plan.isPopular}
            badge={plan.badge}
            disabled={plan.disabled}
            onSubscribe={plan.onSubscribe}
            fullWidth={fullWidth}
            compact={compact}
          />
        ))}
      </div>
    </Spin>
  );
}

