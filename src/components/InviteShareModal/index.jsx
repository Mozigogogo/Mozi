'use client';

import { useMemo } from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

export default function InviteShareModal({ open, onClose, inviteCode, inviteLink }) {
  const { t } = useTranslation();

  const resolvedLink = useMemo(() => {
    const code = String(inviteCode || '').trim();
    if (inviteLink) return inviteLink;
    if (typeof window === 'undefined') return '';
    if (!code) return window.location.origin;
    return `${window.location.origin}/?inviteCode=${encodeURIComponent(code)}`;
  }, [inviteCode, inviteLink]);

  const shareText = useMemo(() => {
    return t('points.shareText') || t('user.shareText') || '加入 MoziInnovations，和我一起探索加密市场。';
  }, [t]);

  const copyLink = async () => {
    if (!resolvedLink) return;
    try {
      await navigator.clipboard.writeText(resolvedLink);
      message.success(t('common.copySuccess') || '复制成功');
      onClose?.();
    } catch (error) {
      message.error(t('common.copyFailed') || '复制失败');
    }
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(
      resolvedLink
    )}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareToTelegram = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(resolvedLink)}&text=${encodeURIComponent(
      shareText
    )}`;
    const isTelegram = typeof window !== 'undefined' && localStorage.getItem('appChannel') === 'tg';
    if (isTelegram && window.Telegram?.WebApp?.openTelegramLink) {
      try {
        window.Telegram.WebApp.openTelegramLink(tgUrl);
        return;
      } catch (_) {}
    }
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  const shareMore = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          text: shareText,
          url: resolvedLink || undefined,
        });
        onClose?.();
        return;
      }
    } catch (_) {}
    await copyLink();
  };

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={styles.sheet}>
        <div className={styles.actions}>
          <button type="button" className={styles.actionItem} onClick={copyLink}>
            <span className={styles.iconCircle}>
              <img className={styles.iconImg} src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/link.svg" alt="" />
            </span>
            <span className={styles.actionLabel}>{t('shareChat.copyLink') || '复制链接'}</span>
          </button>
          <button type="button" className={styles.actionItem} onClick={shareToTwitter}>
            <span className={styles.iconCircle}>
              <img className={styles.iconImg} src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/x-logo-45556c.svg" alt="" />
            </span>
            <span className={styles.actionLabel}>{t('shareChat.twitter') || 'Twitter'}</span>
          </button>
          <button type="button" className={styles.actionItem} onClick={shareToTelegram}>
            <span className={styles.iconCircle}>
              <img className={styles.iconImg} src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/tg.svg" alt="" />
            </span>
            <span className={styles.actionLabel}>{t('shareChat.tg') || 'TG'}</span>
          </button>
          <button type="button" className={styles.actionItem} onClick={shareMore}>
            <span className={styles.iconCircle}>
              <span className={styles.moreDots}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </span>
            </span>
            <span className={styles.actionLabel}>{t('shareChat.more') || '更多'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

