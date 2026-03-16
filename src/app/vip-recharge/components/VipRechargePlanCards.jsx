'use client';

import React from 'react';
import PlanCard from '@/components/PlanCard';

export default function VipRechargePlanCards({ plans = [] }) {
  return (
    <>
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
        />
      ))}
    </>
  );
}

