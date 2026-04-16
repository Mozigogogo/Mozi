'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from './index.module.less';

function buildShareText({ question, answer }) {
  const q = (question || '').trim();
  const a = (answer || '').trim();
  if (q && a) return `${q}\n\n${a}`;
  return q || a || '';
}

export default function ShareAiChatModal({
  open,
  onClose,
  question,
  answer,
  brandLabel = 'Mozi问答',
  shareUrl,
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const resolvedUrl = useMemo(() => {
    if (shareUrl) return shareUrl;
    if (typeof window === 'undefined') return '';
    return window.location.href;
  }, [shareUrl]);

  const shareText = useMemo(() => buildShareText({ question, answer }), [question, answer]);

  const copyLink = async () => {
    try {
      if (!resolvedUrl) return;
      await navigator.clipboard.writeText(resolvedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // ignore
    }
  };

  const shareToTwitter = () => {
    if (!resolvedUrl && !shareText) return;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(resolvedUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareToTelegram = () => {
    if (!resolvedUrl && !shareText) return;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(resolvedUrl)}&text=${encodeURIComponent(
      shareText
    )}`;

    const isTelegram = typeof window !== 'undefined' && localStorage.getItem('appChannel') === 'tg';
    if (isTelegram && window.Telegram?.WebApp?.openTelegramLink) {
      try {
        window.Telegram.WebApp.openTelegramLink(tgUrl);
        return;
      } catch (e) {
        // fallback below
      }
    }
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  const shareMore = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          text: shareText || undefined,
          url: resolvedUrl || undefined,
        });
        return;
      }
    } catch (e) {
      // ignore then fallback
    }
    await copyLink();
  };

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="分享对话"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={styles.modal}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="close">
          ×
        </button>

        <div className={styles.header}>
          <div className={styles.title}>分享对话</div>
        </div>

        <div className={styles.previewOuter}>
          <div className={styles.previewInner}>
            {question ? <div className={styles.userBubble}>{question}</div> : null}
            {answer ? <div className={styles.aiBubble}>{answer}</div> : null}
            <div className={styles.brand}>{brandLabel}</div>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.actionItem} onClick={copyLink}>
            <span className={styles.actionIconCircle}>
              <img className={styles.actionIconImg} src="/icons/link.svg" alt="" aria-hidden />
            </span>
            <span className={styles.actionLabel}>{copied ? '已复制' : '复制链接'}</span>
          </button>

          <button type="button" className={styles.actionItem} onClick={shareToTwitter}>
            <span className={styles.actionIconCircle}>
              <img className={styles.actionIconImg} src="/icons/twitter.svg" alt="" aria-hidden />
            </span>
            <span className={styles.actionLabel}>Twitter</span>
          </button>

          <button type="button" className={styles.actionItem} onClick={shareToTelegram}>
            <span className={styles.actionIconCircle}>
              <img className={styles.actionIconImg} src="/icons/telegram-group.svg" alt="" aria-hidden />
            </span>
            <span className={styles.actionLabel}>TG</span>
          </button>

          <button type="button" className={styles.actionItem} onClick={shareMore}>
            <span className={styles.actionIconCircle}>
              <span className={styles.moreDots} aria-hidden>
                …
              </span>
            </span>
            <span className={styles.actionLabel}>更多</span>
          </button>
        </div>
      </div>
    </div>
  );
}

