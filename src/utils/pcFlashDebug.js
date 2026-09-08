'use client';

/**
 * PC 刷新/布局调试
 * 开启：localStorage.setItem('DEBUG_PC_FLASH','1'); location.reload()
 * 关闭：localStorage.removeItem('DEBUG_PC_FLASH')
 * 控制台过滤：[PCFlashDebug]
 */

function isDebugEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('DEBUG_PC_FLASH') === '1';
  } catch {
    return false;
  }
}

export function pcFlashDebug(...args) {
  if (!isDebugEnabled()) return;
  const ts = typeof performance !== 'undefined' ? performance.now().toFixed(1) : Date.now();
  console.log(`[PCFlashDebug +${ts}ms]`, ...args);
}

function rectInfo(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = window.getComputedStyle(el);
  return {
    tag: el.tagName,
    className: String(el.className || '').slice(0, 120),
    x: Math.round(r.x),
    y: Math.round(r.y),
    w: Math.round(r.width),
    h: Math.round(r.height),
    left: Math.round(r.left),
    right: Math.round(r.right),
    position: cs.position,
    display: cs.display,
    flex: cs.flex,
    width: cs.width,
    maxWidth: cs.maxWidth,
    minWidth: cs.minWidth,
    marginLeft: cs.marginLeft,
    marginTop: cs.marginTop,
    background: cs.backgroundColor,
    transform: cs.transform,
  };
}

/**
 * 测量 PC 壳几何：侧栏 right 与内容 left 的空隙 = 双倍偏移的直接证据。
 * 正常：gap≈0（允许 ±2）；异常：gap≈200（侧栏占流 + margin-left 叠加）。
 */
export function pcFlashDebugMeasureShell(label = 'shell') {
  if (!isDebugEnabled()) return null;

  const run = () => {
    const header =
      document.querySelector('.ant-layout-header') ||
      document.querySelector('[class*="header"]');
    const sider = document.querySelector('.ant-layout-sider');
    const content =
      document.querySelector('.ant-layout-content') ||
      document.querySelector('main.ant-layout-content');
    const shellFallback = document.querySelector('[data-pc-layout-shell="1"]');
    const chunkLoading = document.querySelector('[data-pc-layout-loading="1"]');
    const antdSsr = document.querySelector('style#antd-cssinjs, style[data-antd-ssr="1"]');
    const antdCssinjsTags = document.querySelectorAll(
      'style[data-css-hash], style[rc-util-key], style#antd-cssinjs'
    );

    const headerInfo = rectInfo(header);
    const siderInfo = rectInfo(sider);
    const contentInfo = rectInfo(content);

    const gap =
      siderInfo && contentInfo ? contentInfo.left - siderInfo.right : null;

    const report = {
      label,
      pathname: window.location.pathname,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      dataTheme: document.documentElement.getAttribute('data-theme'),
      colorScheme: document.documentElement.style.colorScheme || null,
      shellFallbackInDom: !!shellFallback,
      chunkLoadingInDom: !!chunkLoading,
      antdSsrStyle: !!antdSsr,
      antdCssinjsTagCount: antdCssinjsTags.length,
      header: headerInfo,
      sider: siderInfo,
      content: contentInfo,
      gapPx: gap,
      /** > 40 基本可判定为「侧栏占文档流 + content margin-left」双偏移 */
      doubleOffsetSuspect: typeof gap === 'number' && gap > 40,
      siderNotFixed: siderInfo ? siderInfo.position !== 'fixed' : null,
      headerNotFixed: headerInfo ? headerInfo.position !== 'fixed' : null,
    };

    pcFlashDebug(label, report);

    if (report.doubleOffsetSuspect || report.siderNotFixed || report.headerNotFixed) {
      console.warn('[PCFlashDebug] LAYOUT ANOMALY', {
        gapPx: report.gapPx,
        siderPosition: siderInfo?.position,
        headerPosition: headerInfo?.position,
        contentMarginLeft: contentInfo?.marginLeft,
        hint:
          '若 gap≈200 且 sider.position!=fixed：AntdRegistry/css-in-js 盖掉了 PCLayout 的 position:fixed，导致侧栏占流 + margin-left 双倍空隙',
      });
    }

    return report;
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => run());
  } else {
    run();
  }
  return null;
}

export function pcFlashDebugMeasureAntdGrid(label = 'grid') {
  if (!isDebugEnabled()) return;
  requestAnimationFrame(() => {
    const cols = document.querySelectorAll('.ant-col-6, [class*="ant-col-6"]');
    const sample = cols[0];
    const cs = sample ? window.getComputedStyle(sample) : null;
    pcFlashDebug(label, {
      antCol6Count: cols.length,
      sampleWidth: cs?.width || null,
      sampleFlex: cs?.flex || null,
      sampleDisplay: cs?.display || null,
      hasAntdStyleTag: !!document.querySelector('style[data-css-hash], style[rc-util-key]'),
    });
  });
}

/** 在 t=0/50/200/800ms 连续采样，抓闪屏过程 */
export function pcFlashDebugWatchShell(label = 'shell-watch') {
  if (!isDebugEnabled()) return () => {};
  const times = [0, 50, 200, 800, 1600];
  const timers = times.map((ms) =>
    window.setTimeout(() => pcFlashDebugMeasureShell(`${label}@${ms}ms`), ms)
  );
  return () => timers.forEach((id) => window.clearTimeout(id));
}
