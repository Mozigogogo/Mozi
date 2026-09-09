'use client';

import React from 'react';
import { Spin } from 'antd';
import PlanCard from '@/components/PlanCard';

const SKELETON_COUNT = 3;

function PlanCardSkeleton({ fullWidth = false, compact = false }) {
  const radius = compact ? 16 : 27;
  return (
    <div
      aria-hidden
      style={{
        width: '100%',
        maxWidth: fullWidth ? 'none' : 260,
        height: '100%',
        minHeight: 0,
        borderRadius: radius,
        border: '1.7px solid #e5e7eb',
        background: 'linear-gradient(180deg, #f9fafb 0%, #ffffff 48%, #f3f4f6 100%)',
        boxSizing: 'border-box',
        padding: compact ? '20px 16px' : '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 10 : 14,
      }}
    >
      <div style={{ height: 22, width: '38%', borderRadius: 8, background: '#e5e7eb', flexShrink: 0 }} />
      <div style={{ height: 36, width: '55%', borderRadius: 8, background: '#eceff3', flexShrink: 0 }} />
      <div style={{ height: 64, width: '100%', borderRadius: 12, background: '#f0f2f5', flexShrink: 0 }} />
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: compact ? 10 : 14, minHeight: 0 }}>
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              height: 16,
              width: `${78 - idx * 5}%`,
              borderRadius: 6,
              background: '#eceff3',
              flexShrink: 0,
            }}
          />
        ))}
      </div>
      <div
        style={{
          marginTop: 'auto',
          height: compact ? 40 : 48,
          width: '100%',
          borderRadius: 999,
          background: '#e5e7eb',
          flexShrink: 0,
        }}
      />
    </div>
  );
}

export default function VipRechargePlanCards({ plans = [], loading = false, fullWidth = false, compact = false }) {
  const showSkeleton = loading && (!plans || plans.length === 0);
  const columnCount = showSkeleton ? SKELETON_COUNT : Math.max(plans.length, 1);

  const wrapperStyle = fullWidth
    ? {
        display: 'grid',
        width: '100%',
        height: '100%',
        flex: '1 1 auto',
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        gap: compact ? '12px' : '16px',
        alignItems: 'stretch',
        minHeight: '100%',
      }
    : {
        display: 'inline-flex',
        gap: '16px',
        minWidth: 'max-content',
        alignItems: 'stretch',
        minHeight: 0,
      };

  return (
    <Spin spinning={loading} style={{ height: '100%', width: '100%' }}>
      <div style={wrapperStyle}>
        {showSkeleton
          ? Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
              <PlanCardSkeleton key={`skeleton-${idx}`} fullWidth={fullWidth} compact={compact} />
            ))
          : plans.map((plan) => (
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
