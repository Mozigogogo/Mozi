'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'markdown-to-jsx';
import { useRobotTestSSE } from '@/hooks/useRobotTestSSE';
import styles from './index.module.less';

function StreamingMarkdown({ content, isStreaming }) {
  if (!content) return null;

  const lines = content.split('\n');

  if (!isStreaming) {
    return <Markdown>{content}</Markdown>;
  }

  if (lines.length === 1) {
    return <div className={styles.streamingText}>{content}</div>;
  }

  const completedLines = lines.slice(0, -1).join('\n');
  const currentLine = lines[lines.length - 1];

  return (
    <div>
      {completedLines ? <Markdown>{completedLines}</Markdown> : null}
      {currentLine ? <div className={styles.streamingText}>{currentLine}</div> : null}
    </div>
  );
}

export default function AiChatModalPc({
  open,
  onClose,
  autoSendText = '',
  autoSendToken = '',
  symbol = 'BTC',
}) {
  const [messages, setMessages] = useState([
    {
      id: 'sys-1',
      role: 'assistant',
      text: '系统已启动。正在分析最新加密货币市场数据…请问有什么可以帮您？',
    },
  ]);
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const currentAiMsgIdRef = useRef(null);

  const { sendMessage: sendStreamMessage, isStreaming, abort } = useRobotTestSSE(
    '/api/robot_proxy/api/v1/analyze/stream',
    {
      headers: () => {
        const lang = typeof window !== 'undefined'
          ? (localStorage.getItem('i18nextLng') || 'zh')
          : 'zh';
        return {
          language: lang,
        };
      },
      getToken: () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null),
      onChunk: (_chunk, accumulated) => {
        if (!currentAiMsgIdRef.current) return;
        const msgId = currentAiMsgIdRef.current;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === msgId ? { ...msg, text: accumulated, loading: true } : msg
          )
        );
      },
      onComplete: (fullContent) => {
        if (!currentAiMsgIdRef.current) return;
        const msgId = currentAiMsgIdRef.current;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === msgId ? { ...msg, text: fullContent || '', loading: false } : msg
          )
        );
        currentAiMsgIdRef.current = null;
      },
      onError: () => {
        if (!currentAiMsgIdRef.current) return;
        const msgId = currentAiMsgIdRef.current;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === msgId
              ? { ...msg, text: '发送失败，请稍后重试。', loading: false, error: true }
              : msg
          )
        );
        currentAiMsgIdRef.current = null;
      },
    }
  );
  const isAiResponding = isStreaming || messages.some((msg) => msg.loading);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);

    // 维持弹窗打开时不影响背景滚动（不使用遮罩层）
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const sendMessage = async (rawText) => {
    const text = String(rawText || '').trim();
    if (!text || isStreaming) return;
    const userMsg = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    const aiMsgId = `a-loading-${Date.now() + 1}`;
    currentAiMsgIdRef.current = aiMsgId;
    setMessages((prev) => [...prev, { id: aiMsgId, role: 'assistant', text: '', loading: true }]);

    const lang = typeof window !== 'undefined'
      ? (localStorage.getItem('i18nextLng') || 'zh')
      : 'zh';
    const normalizedSymbol = String(symbol || 'BTC').toUpperCase();

    await sendStreamMessage({
      symbol: normalizedSymbol,
      question: text,
      lang,
    });
  };

  const handleSend = async () => {
    await sendMessage(input);
    setInput('');
  };

  const handleActionClick = () => {
    if (isAiResponding) {
      abort();
      if (currentAiMsgIdRef.current) {
        const msgId = currentAiMsgIdRef.current;
        setMessages((prev) =>
          prev.map((msg) => (msg.id === msgId ? { ...msg, loading: false } : msg))
        );
        currentAiMsgIdRef.current = null;
      }
      return;
    }
    handleSend();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (!open) return;
    const text = String(autoSendText || '').trim();
    if (!text || !autoSendToken) return;
    sendMessage(text);
    setInput('');
  }, [open, autoSendText, autoSendToken]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={styles.root}
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <div className={styles.wrapper}>
            <div className={styles.wrapperInner}>
              <header className={styles.header}>
                <span className={styles.logo}>Mozi</span>
                <div className={styles.headerIcons}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label="关闭"
                    onClick={onClose}
                  >
                    ×
                  </button>
                </div>
              </header>

              <div className={styles.topBorder} />

              <div className={styles.contentOuter}>
                <div className={styles.contentInner}>
                  <div ref={listRef} className={styles.messageList}>
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={
                          msg.role === 'assistant'
                            ? styles.bubbleRowAssistant
                            : styles.bubbleRowUser
                        }
                      >
                        <div
                          className={
                            msg.role === 'assistant'
                              ? styles.bubbleAssistant
                              : styles.bubbleUser
                          }
                        >
                          {msg.role === 'assistant' && msg.loading && !msg.text ? (
                            <div className={styles.thinkingDots} aria-label="AI 正在思考">
                              <span />
                              <span />
                              <span />
                            </div>
                          ) : msg.role === 'assistant' && msg.loading ? (
                            <div className={styles.markdownContent}>
                              <StreamingMarkdown content={msg.text || ''} isStreaming={true} />
                            </div>
                          ) : msg.role === 'assistant' ? (
                            <div className={styles.markdownContent}>
                              <StreamingMarkdown content={msg.text || ''} isStreaming={false} />
                            </div>
                          ) : (
                            msg.text
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <footer className={styles.footer}>
                    <div className={styles.inputBar}>
                      <textarea
                        className={styles.input}
                        rows={1}
                        placeholder="随便问…"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      <button
                        type="button"
                        className={styles.sendButton}
                        onClick={handleActionClick}
                        disabled={!isAiResponding && !input.trim()}
                        aria-label={isAiResponding ? '暂停输出' : '发送'}
                      >
                        {isAiResponding ? (
                          <span className={styles.pauseIcon} aria-hidden />
                        ) : (
                          <img
                            className={styles.sendIcon}
                            src="/icons/new_home/send_messages.svg"
                            alt=""
                          />
                        )}
                      </button>
                    </div>
                  </footer>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

