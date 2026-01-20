'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './index.module.less';

export default function BottomSheetModal({
  open = false,
  onClose,
  title,
  header,
  footer,
  children,
  closeOnMask = true,
  closeOnEsc = true,
  disableBodyScroll = true,
  zIndex = 9999,
  maxHeight = '85vh',
  className = '',
  sheetClassName = '',
  bodyClassName = '',
}) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
      return;
    }

    if (!rendered) return;

    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setRendered(false);
      setClosing(false);
    }, 220);

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open, rendered]);

  useEffect(() => {
    if (!disableBodyScroll) return;
    if (!rendered) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.setAttribute('data-modal-open', 'true');

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.removeAttribute('data-modal-open');
    };
  }, [disableBodyScroll, rendered]);

  useEffect(() => {
    if (!rendered) return;
    if (!closeOnEsc) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeOnEsc, onClose, rendered]);

  if (!rendered) return null;

  const handleMaskClick = (e) => {
    if (!closeOnMask) return;
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const rootStyle = {
    zIndex,
  };

  const sheetStyle = {
    maxHeight,
  };

  const modalContent = (
    <div
      className={`${styles.overlay} ${closing ? styles.overlayClosing : ''} ${className}`}
      style={rootStyle}
      onClick={handleMaskClick}
      role="presentation"
    >
      <div
        className={`${styles.sheet} ${closing ? styles.sheetClosing : ''} ${sheetClassName}`}
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {(header || title) && (
          <div className={styles.header}>
            {header || <div className={styles.title}>{title}</div>}
          </div>
        )}

        <div className={`${styles.body} ${bodyClassName}`}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
