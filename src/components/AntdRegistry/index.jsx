'use client';

import React, { useMemo, useRef } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import { pcFlashDebug } from '@/utils/pcFlashDebug';

/**
 * Ant Design CSS-in-JS SSR 注入：避免首屏 Row/Col/Table 无样式闪成全宽竖排。
 * 对齐官方 @ant-design/nextjs-registry 行为。
 */
export default function AntdRegistry({ children }) {
  const cache = useMemo(() => createCache(), []);
  const insertedRef = useRef(false);

  useServerInsertedHTML(() => {
    if (insertedRef.current) return null;
    insertedRef.current = true;
    const css = extractStyle(cache, true);
    if (typeof window === 'undefined') {
      // server only log path via debug util is noop
    }
    return (
      <style
        id="antd-cssinjs"
        data-antd-ssr="1"
        dangerouslySetInnerHTML={{ __html: css }}
      />
    );
  });

  if (typeof window !== 'undefined') {
    pcFlashDebug('AntdRegistry client render');
  }

  return <StyleProvider cache={cache}>{children}</StyleProvider>;
}
