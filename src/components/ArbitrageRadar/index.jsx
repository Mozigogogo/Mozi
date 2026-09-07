'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { mountArbitrageRadar } from './runtime';
import './radar.css';
import styles from './index.module.less';

/**
 * 套利专区雷达
 * @param {{
 *   embedded?: boolean;
 *   initialTab?: 'funding'|'spread'|'basis'|'oi';
 *   detailOnly?: boolean;
 *   detailType?: 'funding'|'spread'|'basis'|'oi';
 *   detailSymbol?: string;
 *   detailExchange?: string;
 *   detailMinExchange?: string;
 *   detailMaxExchange?: string;
 *   detailLogoUrl?: string;
 *   onNavigateDetail?: (op: object, type: string) => void;
 *   onBackToList?: () => void;
 *   onSwitchToAutoArb?: () => void;
 * }} props
 */
export default function ArbitrageRadar({
  embedded = false,
  initialTab = 'funding',
  detailOnly = false,
  detailType = 'funding',
  detailSymbol = '',
  detailExchange = '',
  detailMinExchange = '',
  detailMaxExchange = '',
  detailLogoUrl = '',
  onNavigateDetail,
  onBackToList,
  onSwitchToAutoArb,
}) {
  // 展示「自动套利」入口（跳转 /arbitrage/auto）
  const [showAutoArbTab] = useState(true);

  const rootRef = useRef(null);
  const navRef = useRef({ onNavigateDetail, onBackToList, onSwitchToAutoArb });
  navRef.current = { onNavigateDetail, onBackToList, onSwitchToAutoArb };

  // layout 阶段挂载，避免先画空白/骨架再切到内容造成闪一下
  // StrictMode 会 mount→cleanup→mount：推迟 cleanup，同参数二次挂载直接复用实例，避免双请求
  useLayoutEffect(() => {
    if (!rootRef.current) return undefined;
    const root = rootRef.current;
    const cleanup = mountArbitrageRadar(root, {
      embedded,
      initialTab,
      detailOnly,
      detailType,
      detailSymbol,
      detailExchange,
      detailMinExchange,
      detailMaxExchange,
      detailLogoUrl,
      onNavigateDetail: (op, type) => navRef.current.onNavigateDetail?.(op, type),
      onBackToList: () => navRef.current.onBackToList?.(),
      onSwitchToAutoArb: () => navRef.current.onSwitchToAutoArb?.(),
      showAutoArbTab: showAutoArbTab,
    });
    return () => {
      const token = (root.__arbCleanupToken || 0) + 1;
      root.__arbCleanupToken = token;
      queueMicrotask(() => {
        if (root.__arbCleanupToken !== token) return;
        if (typeof cleanup === 'function') cleanup();
      });
    };
  }, [
    embedded,
    initialTab,
    detailOnly,
    detailType,
    detailSymbol,
    detailExchange,
    detailMinExchange,
    detailMaxExchange,
    detailLogoUrl,
    showAutoArbTab,
  ]);

  return (
    <div className={styles.page}>
      <div
        id="mozi-arbitrage-radar"
        ref={rootRef}
        className={[
          styles.radar,
          embedded ? 'is-embedded' : '',
          detailOnly ? 'is-detail-only' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </div>
  );
}
