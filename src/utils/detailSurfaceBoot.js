/** 会话内详情页 surface boot 是否已完成（首屏遮罩只做一次） */
export const DETAIL_SURFACE_BOOT_KEY = 'mozi_detail_surface_boot_done_v1';

export function peekDetailSurfaceBootDone() {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(DETAIL_SURFACE_BOOT_KEY) === '1';
  } catch {
    return false;
  }
}

export function markDetailSurfaceBootDone() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(DETAIL_SURFACE_BOOT_KEY, '1');
  } catch (_) {}
}

function waitFrames(count = 2) {
  return new Promise((resolve) => {
    let left = Math.max(1, count);
    const step = () => {
      left -= 1;
      if (left <= 0) resolve();
      else window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  });
}

function waitFontsReady(timeoutMs = 360) {
  if (typeof document === 'undefined' || !document.fonts?.ready) {
    return Promise.resolve();
  }
  return Promise.race([
    document.fonts.ready.then(() => undefined).catch(() => undefined),
    new Promise((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}

/**
 * 等到详情页根节点布局/样式落稳（尺寸连续稳定），避免揭盖时闪一下。
 * @param {() => (Element | null | undefined)} getRootEl
 * @param {{ isPC?: boolean, timeoutMs?: number, minWidth?: number, minHeight?: number, stableFrames?: number, signal?: AbortSignal }} [options]
 */
export async function waitForDetailSurfaceSettled(getRootEl, options = {}) {
  if (typeof window === 'undefined') return;

  const {
    isPC = false,
    timeoutMs = 2800,
    minWidth = isPC ? 320 : 160,
    minHeight = isPC ? 180 : 120,
    stableFrames = isPC ? 3 : 2,
    skipFonts = false,
    signal,
  } = options;

  if (signal?.aborted) return;

  if (!skipFonts) {
    await waitFontsReady(isPC ? 420 : 280);
    if (signal?.aborted) return;
  }
  await waitFrames(2);
  if (signal?.aborted) return;

  const startedAt = performance.now();
  let lastKey = '';
  let stableCount = 0;

  await new Promise((resolve) => {
    let raf = 0;

    const finish = () => {
      window.cancelAnimationFrame(raf);
      resolve();
    };

    const onAbort = () => finish();
    signal?.addEventListener?.('abort', onAbort, { once: true });

    const tick = () => {
      if (signal?.aborted) {
        finish();
        return;
      }
      if (performance.now() - startedAt >= timeoutMs) {
        finish();
        return;
      }

      const el = typeof getRootEl === 'function' ? getRootEl() : getRootEl;
      if (!el) {
        raf = window.requestAnimationFrame(tick);
        return;
      }

      const rect = el.getBoundingClientRect();
      const sized = rect.width >= minWidth && rect.height >= minHeight;
      // visibility:hidden 仍占布局；这里只确认样式表已生效（有盒模型）
      const cs = window.getComputedStyle(el);
      const boxReady =
        cs.display !== 'none' &&
        cs.position !== '' &&
        Number.parseFloat(cs.width || '0') > 0;

      let structureReady = true;
      if (isPC) {
        // PC：至少一侧栏或图表行已有宽度，说明 CSS module / 布局已应用
        const probe =
          el.querySelector('[class*="chartOrderRow"]') ||
          el.querySelector('[class*="roiPane"]') ||
          el.querySelector('[class*="pcContentColLeft"]') ||
          el;
        const probeRect = probe.getBoundingClientRect();
        structureReady = probeRect.width >= Math.min(240, minWidth * 0.5);
      }

      if (sized && boxReady && structureReady) {
        const key = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
        if (key === lastKey) stableCount += 1;
        else {
          lastKey = key;
          stableCount = 1;
        }
        if (stableCount >= stableFrames) {
          finish();
          return;
        }
      } else {
        lastKey = '';
        stableCount = 0;
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
  });

  // 再空一帧，确保揭盖前最后一次 paint 已提交
  if (!signal?.aborted) await waitFrames(1);
}

export function waitAnimationFrames(count = 2) {
  if (typeof window === 'undefined') return Promise.resolve();
  return waitFrames(count);
}
