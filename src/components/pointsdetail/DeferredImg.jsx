import React, { useEffect, useMemo, useState } from 'react';

// 透明占位：避免某些 WebView/浏览器把透明 GIF 渲染成白块
const TRANSPARENT_1PX_SVG =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"></svg>');

/**
 * 目的：首屏优先渲染布局与文字，把大图片延后到空闲时再加载，减少首次加载阻塞。
 * - 默认使用 lazy + async decoding
 * - 默认延迟到 requestIdleCallback（无则 setTimeout）
 */
export default function DeferredImg({
  src,
  alt = '',
  className,
  style,
  width,
  height,
  delayMs = 0,
  loading = 'lazy',
  decoding = 'async',
  onError,
  ...rest
}) {
  const [realSrc, setRealSrc] = useState(null);

  const resolvedSrc = useMemo(() => {
    // 防御：避免传空导致浏览器请求当前页面
    return typeof src === 'string' && src.trim() ? src : null;
  }, [src]);

  useEffect(() => {
    if (!resolvedSrc) {
      setRealSrc(null);
      return;
    }

    let cancelled = false;
    const commit = () => {
      if (!cancelled) setRealSrc(resolvedSrc);
    };

    const schedule = () => {
      if (typeof window === 'undefined') return commit();

      const ric = window.requestIdleCallback;
      if (typeof ric === 'function') {
        ric(() => {
          if (delayMs > 0) {
            window.setTimeout(commit, delayMs);
          } else {
            commit();
          }
        });
      } else {
        window.setTimeout(commit, Math.max(0, delayMs));
      }
    };

    schedule();
    return () => {
      cancelled = true;
    };
  }, [resolvedSrc, delayMs]);

  return (
    <img
      src={realSrc || TRANSPARENT_1PX_SVG}
      alt={alt}
      className={className}
      style={{
        ...style,
        backgroundColor: 'transparent',
        // 仅占位不显示“白块”，等真实资源开始加载/设置后再显示
        opacity: realSrc ? 1 : 0,
      }}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      onError={onError}
      {...rest}
    />
  );
}

