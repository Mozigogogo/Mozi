'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Markdown from 'markdown-to-jsx';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

function buildShareText({ question, answer }) {
  const q = (question || '').trim();
  const a = (answer || '').trim();
  if (q && a) return `${q}\n\n${a}`;
  return q || a || '';
}

/** t.me/share/url 经 nginx 限制请求行长度，过长会 400 Bad Request */
const TELEGRAM_SHARE_TEXT_MAX = 200;

function truncateForTelegramShare(text) {
  const s = (text || '').trim();
  if (!s) return '';
  if (s.length <= TELEGRAM_SHARE_TEXT_MAX) return s;
  return `${s.slice(0, TELEGRAM_SHARE_TEXT_MAX - 1)}…`;
}

export default function ShareAiChatModal({
  open,
  onClose,
  title,
  question,
  answer,
  preview,
  previewVariant,
  hidePreview = false,
  brandLabel = 'Mozi问答',
  shareUrl,
}) {
  const isDailyCardPreview = Boolean(preview) && previewVariant === 'dailyCard';
  const showPreviewSection = !hidePreview;
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();
  const resolvedTitle = title || t('shareChat.title');

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
    // 仅带短文案 + 链接；勿把整段回答塞进 text=，否则会触发 t.me 400
    const questionOnly = (question || '').trim();
    const telegramText = truncateForTelegramShare(
      questionOnly || shareText.split('\n')[0] || shareText
    );
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(resolvedUrl)}&text=${encodeURIComponent(
      telegramText
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
      aria-label={resolvedTitle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`${styles.modal} ${isDailyCardPreview ? styles.modalDailyCard : ''} ${
          hidePreview ? styles.modalActionsOnly : ''
        }`}
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label={t('shareChat.close')}
        >
          ×
        </button>

        <div className={styles.header}>
          <div className={styles.title}>{resolvedTitle}</div>
        </div>

        {showPreviewSection ? (
        <div
          className={`${styles.previewOuter} ${isDailyCardPreview ? styles.previewOuterDailyCard : ''}`}
        >
          <div
            className={`${styles.previewInner} ${preview ? styles.previewInnerCard : ''} ${
              isDailyCardPreview ? styles.previewInnerDailyCard : ''
            }`}
          >
            <div
              className={`${styles.previewScroll} ${preview ? styles.previewScrollCard : ''} ${
                isDailyCardPreview ? styles.previewScrollDailyCard : ''
              }`}
            >
              {preview ? (
                preview
              ) : (
                <>
                  {question ? (
                    <div className={`${styles.previewMsgRow} ${styles.previewMsgRight}`}>
                      <div className={`${styles.previewBubble} ${styles.previewBubbleUser}`}>{question}</div>
                    </div>
                  ) : null}
                  {answer ? (
                    <div className={`${styles.previewMsgRow} ${styles.previewMsgLeft}`}>
                      <div className={`${styles.previewBubble} ${styles.previewBubbleAssistant}`}>
                        <Markdown
                          options={{
                            overrides: {
                              p: {
                                props: { className: styles.mdParagraph },
                              },
                              ul: {
                                props: { className: styles.mdList },
                              },
                              ol: {
                                props: { className: styles.mdList },
                              },
                              li: {
                                props: { className: styles.mdListItem },
                              },
                            },
                          }}
                        >
                          {answer}
                        </Markdown>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
            {brandLabel ? <div className={styles.brand}>{brandLabel}</div> : null}
          </div>
        </div>
        ) : null}

        <div className={styles.actions}>
          <button type="button" className={styles.actionItem} onClick={copyLink}>
            <span className={styles.actionIconCircle}>
              <img className={styles.actionIconImg} src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/link.svg" alt="" aria-hidden />
            </span>
            <span className={styles.actionLabel}>
              {copied ? t('shareChat.copied') : t('shareChat.copyLink')}
            </span>
          </button>

          <button type="button" className={styles.actionItem} onClick={shareToTwitter}>
            <span className={styles.actionIconCircle}>
              <img className={styles.actionIconImg} src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/x-logo-45556c.svg" alt="" aria-hidden />
            </span>
            <span className={styles.actionLabel}>{t('shareChat.twitter')}</span>
          </button>

          <button type="button" className={styles.actionItem} onClick={shareToTelegram}>
            <span className={styles.actionIconCircle}>
              <img className={styles.actionIconImg} src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/tg.svg" alt="" aria-hidden />
            </span>
            <span className={styles.actionLabel}>{t('shareChat.tg')}</span>
          </button>

          <button type="button" className={styles.actionItem} onClick={shareMore}>
            <span className={styles.actionIconCircle}>
              <span className={styles.moreDots} aria-hidden>
                <span className={styles.moreDot} />
                <span className={styles.moreDot} />
                <span className={styles.moreDot} />
              </span>
            </span>
            <span className={styles.actionLabel}>{t('shareChat.more')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

