'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { getAgentConversations } from '@/api/ai';
import { MOZI_AI_CONVERSATIONS_CHANGED } from '@/utils/aiConversationEvents';
import AiConversationRowMenu from './AiConversationRowMenu';
import styles from './MobileAiHistoryDrawer.module.less';

const AI_CONVERSATIONS_PAGE_SIZE = 5;
const AI_CHAT_ICON =
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_home/ai_chat.svg';

function getConversationId(item) {
  return item?.conversationId || item?.conversation_id || item?.id || '';
}

function getConversationTitle(item, fallback) {
  const raw =
    item?.title ||
    item?.name ||
    item?.topic ||
    item?.summary ||
    item?.firstMessage ||
    item?.lastMessage ||
    '';
  const text = String(raw).trim();
  return text || fallback;
}

function normalizeConversationsResponse(res) {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.conversations)) return data.conversations;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function AiChatMaskIcon({ color = '#333333', className = '' }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: 16,
        height: 16,
        flexShrink: 0,
        backgroundColor: color,
        WebkitMaskImage: `url(${AI_CHAT_ICON})`,
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskImage: `url(${AI_CHAT_ICON})`,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
      }}
      aria-hidden
    />
  );
}

export default function MobileAiHistoryDrawer({ open, onClose, activeConversationId }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(AI_CONVERSATIONS_PAGE_SIZE);
  const [bodyOverflows, setBodyOverflows] = useState(false);
  const bodyRef = useRef(null);

  const fallbackTitle = t('pcLayout.menu.dialogueItem', { defaultValue: '对话' });

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setConversations([]);
        setVisibleCount(AI_CONVERSATIONS_PAGE_SIZE);
        return;
      }
      const res = await getAgentConversations();
      if (res?.data?.isLogin === false) {
        setConversations([]);
        setVisibleCount(AI_CONVERSATIONS_PAGE_SIZE);
        return;
      }
      const items = normalizeConversationsResponse(res);
      setConversations(items);
      setVisibleCount(Math.min(items.length, AI_CONVERSATIONS_PAGE_SIZE));
    } catch (e) {
      console.error('Mobile AI history drawer:', e);
      setConversations([]);
      setVisibleCount(AI_CONVERSATIONS_PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    fetchConversations();
    return undefined;
  }, [open, fetchConversations]);

  useEffect(() => {
    const onChanged = () => {
      if (open) fetchConversations();
    };
    window.addEventListener(MOZI_AI_CONVERSATIONS_CHANGED, onChanged);
    return () => window.removeEventListener(MOZI_AI_CONVERSATIONS_CHANGED, onChanged);
  }, [open, fetchConversations]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const visibleConversations = useMemo(
    () => conversations.slice(0, visibleCount),
    [conversations, visibleCount],
  );
  const hasMore = conversations.length > visibleCount;
  const showLoadMore = hasMore && bodyOverflows;

  const syncBodyOverflow = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return false;
    const overflows = el.scrollHeight > el.clientHeight + 1;
    setBodyOverflows((prev) => (prev === overflows ? prev : overflows));
    return overflows;
  }, []);

  useLayoutEffect(() => {
    if (!open || loading || conversations.length === 0) return;
    const overflows = syncBodyOverflow();
    if (
      overflows &&
      conversations.length > AI_CONVERSATIONS_PAGE_SIZE &&
      visibleCount >= conversations.length
    ) {
      setVisibleCount((prev) =>
        prev === AI_CONVERSATIONS_PAGE_SIZE ? prev : AI_CONVERSATIONS_PAGE_SIZE,
      );
    }
  }, [open, loading, conversations.length, visibleCount, syncBodyOverflow]);

  useEffect(() => {
    if (!open) return undefined;
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      syncBodyOverflow();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, syncBodyOverflow]);

  const handleSelect = (conversationId) => {
    onClose();
    router.push(`/ai/${conversationId}`);
  };

  const handleDeleteConversation = useCallback(
    (conversationId) => {
      setConversations((prev) =>
        prev.filter((item) => getConversationId(item) !== conversationId),
      );
      if (activeConversationId === conversationId) {
        onClose();
        router.push('/ai');
      }
    },
    [activeConversationId, onClose, router],
  );

  if (!open) return null;

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.mask}
        aria-label={t('common.close', { defaultValue: '关闭' })}
        onClick={onClose}
      />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={t('pcLayout.menu.myQA')}>
        <header className={styles.header}>
          <span className={styles.headerTitle}>{t('pcLayout.menu.myQA')}</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t('common.close', { defaultValue: '关闭' })}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className={styles.body} ref={bodyRef}>
          {loading && conversations.length === 0 ? (
            <div className={styles.hint}>{t('common.loading')}</div>
          ) : conversations.length === 0 ? (
            <div className={styles.hint}>
              {t('pcLayout.menu.noAiConversations', {
                defaultValue: (i18n?.language || '').startsWith('en')
                  ? 'No conversations yet'
                  : '暂无对话',
              })}
            </div>
          ) : (
            visibleConversations.map((item) => {
              const conversationId = getConversationId(item);
              if (!conversationId) return null;
              const isActive = activeConversationId === conversationId;
              const title = getConversationTitle(item, fallbackTitle);
              return (
                <div
                  key={conversationId}
                  className={`${styles.row} ${isActive ? styles.rowActive : ''}`}
                >
                  <button
                    type="button"
                    className={styles.rowMain}
                    onClick={() => handleSelect(conversationId)}
                  >
                    <span className={styles.rowIcon} aria-hidden>
                      <AiChatMaskIcon color={isActive ? '#11b787' : '#94a3b8'} />
                    </span>
                    <span className={styles.rowLabel}>{title}</span>
                  </button>
                  <AiConversationRowMenu
                    conversationId={conversationId}
                    onDeleted={handleDeleteConversation}
                    variant="mobile"
                    wrapClassName={styles.rowMenuWrap}
                    buttonClassName={styles.rowMenuBtn}
                    iconSize={16}
                  />
                </div>
              );
            })
          )}
        </div>
        {showLoadMore ? (
          <button
            type="button"
            className={styles.loadMore}
            onClick={() => setVisibleCount((prev) => prev + AI_CONVERSATIONS_PAGE_SIZE)}
          >
            {t('common.loadMore')}
          </button>
        ) : null}
      </aside>
    </div>
  );
}
