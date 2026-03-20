'use client';

import { createRoot } from 'react-dom/client';
import { ConfirmModal } from './index.jsx';

function canUseDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * 兼容 antd-mobile 的 Dialog.confirm 主要用法：
 * - await confirm({...}) => boolean
 * - confirm({ onConfirm }) 直接回调式
 */
export function confirm(options = {}) {
  if (!canUseDom()) return Promise.resolve(false);

  const {
    title,
    content,
    cancelText,
    confirmText,
    onConfirm,
    onCancel,
    closeOnAction = true,
    className,
    bodyStyle,
    maskClosable = true,
  } = options;

  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);

  let settled = false;
  const cleanup = () => {
    try {
      root.unmount();
    } catch (_) {}
    try {
      host.remove();
    } catch (_) {}
  };

  const resolveOnce = (val) => {
    if (settled) return;
    settled = true;
    cleanup();
    return val;
  };

  return new Promise((resolve) => {
    const handleCancel = async () => {
      try {
        await onCancel?.();
      } finally {
        if (closeOnAction) resolve(resolveOnce(false));
      }
    };

    const handleConfirm = async () => {
      try {
        await onConfirm?.();
      } finally {
        if (closeOnAction) resolve(resolveOnce(true));
      }
    };

    const handleClose = () => {
      resolve(resolveOnce(false));
    };

    root.render(
      <ConfirmModal
        open={true}
        title={title}
        content={content}
        cancelText={cancelText}
        confirmText={confirmText}
        className={className}
        bodyStyle={bodyStyle}
        maskClosable={maskClosable}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    );

    // 兜底：外部强制关闭（如路由切换）时可调用 handleClose
    // 暂不暴露实例，保持 API 简洁
    window.setTimeout(() => {
      if (!settled && !document.body.contains(host)) handleClose();
    }, 0);
  });
}

