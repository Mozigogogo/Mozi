'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './index.module.less';

function canUseDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function Modal({
  open,
  onClose,
  maskClosable = true,
  children,
  className,
  panelStyle,
  zIndex,
}) {
  const [leaving, setLeaving] = useState(false);
  const shouldRender = open || leaving;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!canUseDom()) return;
    if (open) {
      document.body.dataset.modalOpen = 'true';
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
        delete document.body.dataset.modalOpen;
      };
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setLeaving(false);
      return;
    }
    if (!shouldRender) return;
    setLeaving(true);
    const t = setTimeout(() => setLeaving(false), 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const content = useMemo(() => {
    if (!shouldRender) return null;

    const maskCls = `${styles.mask} ${open && !leaving ? styles.fadeEnter : styles.fadeLeave}`;
    const panelCls = `${styles.panel} ${open && !leaving ? styles.panelEnter : styles.panelLeave} ${className || ''}`;

    return (
      <div
        className={maskCls}
        style={zIndex ? { zIndex } : undefined}
        onMouseDown={(e) => {
          if (!maskClosable) return;
          if (e.target === e.currentTarget) onClose?.();
        }}
        onTouchStart={(e) => {
          if (!maskClosable) return;
          if (e.target === e.currentTarget) onClose?.();
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className={panelCls} style={panelStyle}>
          {children}
        </div>
      </div>
    );
  }, [shouldRender, open, leaving, className, panelStyle, maskClosable, onClose, zIndex, children]);

  if (!canUseDom()) return null;
  return createPortal(content, document.body);
}

export function ConfirmModal({
  open,
  title,
  content,
  cancelText = '取消',
  confirmText = '确定',
  onCancel,
  onConfirm,
  className,
  bodyStyle,
  maskClosable = true,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      maskClosable={maskClosable}
      className={className}
      panelStyle={bodyStyle}
    >
      {title ? <div className={styles.header}>{title}</div> : null}
      <div className={styles.content}>{content}</div>
      <div className={styles.footer}>
        <button type="button" className={`${styles.btn} ${styles.cancel}`} onClick={onCancel}>
          {cancelText}
        </button>
        <button type="button" className={`${styles.btn} ${styles.confirm}`} onClick={onConfirm}>
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

