'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Layout from '../../components/Layout';
import { MoziWebSocket } from '../../utils/moziWebSocket';
import { WS_URL } from '../../utils/constants';
import { 
  WS_EVENTS, 
  PLATFORMS, 
  createAIChatMessage,
  createAIChatStopMessage,
  createAIChatRegenerateMessage,
  createAIChatHistoryMessage,
  getErrorDescription
} from '../../utils/websocketProtocol';
import styles from './page.module.less';

export default function RobotPage() {
  const router = useRouter();
  const BOT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/AI_Bot.png';

  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([
    { 
      id: 'welcome-1', 
      role: 'assistant', 
      content: '你好，我是你的AI助手！我可以帮你分析币种行情、解答投资问题。有什么可以帮你？', 
      time: Date.now() 
    }
  ]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null); // 用于标记消息列表底部
  const wsRef = useRef(null);
  const conversationIdRef = useRef(null);
  const currentMessageIdRef = useRef(null);
  const currentRequestIdRef = useRef(null);

  // 初始化 WebSocket
  useEffect(() => {
    console.log('🤖 初始化 AI 对话 WebSocket');
    
    const ws = new MoziWebSocket(WS_URL, {
      platform: PLATFORMS.H5,
      version: '1.0.0',
      autoHandshake: true,
      debug: true,
    });

    wsRef.current = ws;

    // 监听认证成功
    ws.on('authenticated', (data) => {
      console.log('✅ AI 对话 WebSocket 认证成功');
      setIsConnecting(false);
    });

    // 监听 AI 开始回复
    ws.on(WS_EVENTS.AI_CHAT_START, (data) => {
      console.log('🤖 AI 开始回复:', data);
      const { conversationId, messageId } = data.data || {};
      
      if (conversationId) {
        conversationIdRef.current = conversationId;
      }
      if (messageId) {
        currentMessageIdRef.current = messageId;
      }
      
      setIsStreaming(true);
      
      // 更新 loading 消息的 ID
      setMessages(prev => prev.map(msg => {
        if (msg.requestId === data.requestId && msg.loading) {
          return { ...msg, messageId: messageId };
        }
        return msg;
      }));
    });

    // 监听 AI 流式响应
    ws.on(WS_EVENTS.AI_CHAT_STREAM, (data) => {
      console.log('📝 AI 流式响应:', data);
      const { content, delta, isComplete, conversationId, messageId } = data.data || {};
      
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        
        // 如果最后一条是 AI 的流式消息，更新它
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.loading) {
          return prev.map((msg, idx) => 
            idx === prev.length - 1 
              ? { 
                  ...msg, 
                  content: content || msg.content, // 使用累积内容
                  loading: !isComplete,
                  messageId: messageId || msg.messageId,
                  conversationId: conversationId || msg.conversationId
                }
              : msg
          );
        }
        
        // 否则添加新的流式消息
        return [...prev, {
          id: `ai-${Date.now()}`,
          messageId: messageId,
          conversationId: conversationId,
          role: 'assistant',
          content: content || '',
          time: Date.now(),
          loading: !isComplete
        }];
      });
    });

    // 监听 AI 回复完成
    ws.on(WS_EVENTS.AI_CHAT_COMPLETE, (data) => {
      console.log('✅ AI 回复完成:', data);
      const { fullContent, tokens, suggestedQuestions: suggested, conversationId, messageId } = data.data || {};
      
      setIsStreaming(false);
      currentMessageIdRef.current = null;
      
      // 更新消息状态
      setMessages(prev => prev.map(msg => {
        if (msg.messageId === messageId || msg.loading) {
          return {
            ...msg,
            content: fullContent || msg.content,
            loading: false,
            tokens: tokens,
            messageId: messageId,
            conversationId: conversationId
          };
        }
        return msg;
      }));
      
      // 更新建议问题
      if (suggested && suggested.length > 0) {
        setSuggestedQuestions(suggested);
      }
    });

    // 监听 AI 对话错误
    ws.on(WS_EVENTS.AI_CHAT_ERROR, (data) => {
      console.error('❌ AI 对话错误:', data);
      const errorCode = data.code;
      const errorMsg = data.message || getErrorDescription(errorCode) || '抱歉，出现了一些问题，请稍后再试';
      
      setIsStreaming(false);
      currentMessageIdRef.current = null;
      
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.loading) {
          return prev.map((msg, idx) => 
            idx === prev.length - 1 
              ? { ...msg, content: errorMsg, loading: false, error: true, errorCode: errorCode }
              : msg
          );
        }
        return [...prev, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: errorMsg,
          time: Date.now(),
          error: true,
          errorCode: errorCode
        }];
      });
    });

    // 监听历史记录响应
    ws.on(WS_EVENTS.AI_CHAT_HISTORY_RESPONSE, (data) => {
      console.log('📜 收到历史记录:', data);
      const { messages: historyMessages } = data.data || {};
      
      if (historyMessages && historyMessages.length > 0) {
        const formattedMessages = historyMessages.map(msg => ({
          id: msg.messageId,
          messageId: msg.messageId,
          role: msg.role,
          content: msg.content,
          time: msg.timestamp,
        }));
        
        setMessages(prev => [...formattedMessages, ...prev]);
      }
    });

    // 连接 WebSocket
    ws.connect();

    return () => {
      console.log('🔴 AI 对话页面卸载，断开 WebSocket');
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, []);

  // 自动滚动到底部 - 使用平滑滚动和 requestAnimationFrame 确保 DOM 更新后滚动
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    };

    // 使用 requestAnimationFrame 确保在 DOM 更新后执行滚动
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBottom);
    });
  }, [messages]);

  // 发送消息
  const handleSend = (text = null) => {
    const message = text || inputValue.trim();
    if (!message || isConnecting || isStreaming) return;

    // 添加用户消息
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      time: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setSuggestedQuestions([]); // 清除建议问题

    // 生成请求 ID
    const requestId = `req-ai-${Date.now()}`;
    currentRequestIdRef.current = requestId;

    // 添加 AI 加载消息
    setMessages(prev => [...prev, {
      id: `ai-loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      time: Date.now(),
      loading: true,
      requestId: requestId
    }]);

    // 通过 WebSocket 发送 AI 对话请求
    if (wsRef.current && wsRef.current.isConnected) {
      try {
        const chatMessage = createAIChatMessage(
          message,
          conversationIdRef.current,
          null, // 可以传入上下文信息，如 { symbols: ['BTC'], userProfile: {...} }
          requestId
        );
        wsRef.current.send(chatMessage);
        console.log('📤 发送 AI 对话请求:', chatMessage);
      } catch (error) {
        console.error('发送消息失败:', error);
        setMessages(prev => prev.map(msg => 
          msg.requestId === requestId 
            ? { ...msg, content: '发送失败，请重试', loading: false, error: true }
            : msg
        ));
      }
    } else {
      setMessages(prev => prev.map(msg => 
        msg.requestId === requestId 
          ? { ...msg, content: 'WebSocket 未连接，请刷新页面重试', loading: false, error: true }
          : msg
      ));
    }
  };

  // 停止生成
  const handleStop = () => {
    if (!isStreaming || !currentMessageIdRef.current) return;
    
    if (wsRef.current && wsRef.current.isConnected) {
      try {
        const stopMessage = createAIChatStopMessage(
          conversationIdRef.current,
          currentMessageIdRef.current
        );
        wsRef.current.send(stopMessage);
        console.log('🛑 停止生成:', stopMessage);
        setIsStreaming(false);
      } catch (error) {
        console.error('停止生成失败:', error);
      }
    }
  };

  // 重新生成
  const handleRegenerate = (messageId) => {
    if (!messageId || isStreaming) return;
    
    if (wsRef.current && wsRef.current.isConnected) {
      try {
        const regenerateMessage = createAIChatRegenerateMessage(
          conversationIdRef.current,
          messageId
        );
        wsRef.current.send(regenerateMessage);
        console.log('🔄 重新生成:', regenerateMessage);
        
        // 添加加载消息
        setMessages(prev => [...prev, {
          id: `ai-regenerate-${Date.now()}`,
          role: 'assistant',
          content: '',
          time: Date.now(),
          loading: true
        }]);
      } catch (error) {
        console.error('重新生成失败:', error);
      }
    }
  };

  // 点击建议问题
  const handleSuggestedQuestion = (question) => {
    handleSend(question);
  };

  // 格式化时间
  const formatTime = (ts) => {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
 
      <div className={styles.robotPage}>
        <div className={styles.chatHeader}>
          <div className={styles.chatTitle}>AI 助手</div>
          <div className={styles.chatSubtitle}>
            智能答疑 · 快速响应
            {isConnecting && <span className={styles.connecting}> (连接中...)</span>}
            {conversationIdRef.current && (
              <span className={styles.conversationId}> | 会话ID: {conversationIdRef.current.slice(-8)}</span>
            )}
          </div>
        </div>

        <div className={styles.chatScroll} ref={scrollRef}>
          <div className={styles.messages}>
            {messages.map((msg, idx) => (
              <div key={msg.id} className={`${styles.msgRow} ${msg.role === 'user' ? styles.right : styles.left}`}>
                {msg.role === 'assistant' && (
                  <div className={styles.avatarCol}>
                    <img className={styles.avatar} src={BOT_AVATAR} alt="AI" />
                    <span className={styles.timeUnder}>{formatTime(msg.time)}</span>
                  </div>
                )}

                <div className={styles.msgContent}>
                  <div className={`${styles.bubble} ${styles[msg.role]} ${msg.error ? styles.error : ''}`}>
                    <div className={styles.text}>
                      {msg.content || (msg.loading ? '正在思考中' : '')}
                      {msg.loading && <span className={styles.loadingDots}>...</span>}
                    </div>
                    
                    {/* Token 消耗信息 */}
                    {msg.tokens && (
                      <div className={styles.tokenInfo}>
                        消耗 {msg.tokens} tokens
                      </div>
                    )}
                  </div>
                  
                  {/* AI 消息操作按钮 */}
                  {msg.role === 'assistant' && !msg.loading && msg.messageId && (
                    <div className={styles.msgActions}>
                      <button 
                        className={styles.actionBtn}
                        onClick={() => handleRegenerate(msg.messageId)}
                        disabled={isStreaming}
                      >
                        <Image 
                          src="/icons/reload.svg" 
                          alt="重新生成" 
                          width={14} 
                          height={14}
                          className={styles.reloadIcon}
                        />
                        重新生成
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className={styles.avatarCol}>
                    <div className={styles.userAvatar}>我</div>
                    <span className={styles.timeUnder}>{formatTime(msg.time)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* 建议问题 */}
          {suggestedQuestions.length > 0 && !isStreaming && (
            <div className={styles.suggestedQuestions}>
              <div className={styles.suggestedTitle}>你可能还想问：</div>
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  className={styles.suggestedBtn}
                  onClick={() => handleSuggestedQuestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          {/* 用于滚动定位的底部元素 */}
          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </div>

        <div className={styles.chatInputBar}>
          <div className={styles.inputBox}>
            <input
              className={styles.input}
              value={inputValue}
              placeholder="输入你的问题..."
              onKeyPress={(e) => e.key === 'Enter' && !isStreaming && handleSend()}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isConnecting || isStreaming}
            />
          </div>
          {isStreaming ? (
            <button 
              className={styles.stopBtn} 
              onClick={handleStop}
            >
              <Image 
                src="/icons/pause.svg" 
                alt="停止生成" 
                width={18} 
                height={18}
                className={styles.pauseIcon}
              />
            </button>
          ) : (
            <button 
              className={styles.sendBtn} 
              onClick={() => handleSend()}
              disabled={isConnecting || !inputValue.trim()}
            >
              发送
            </button>
          )}
        </div>
      </div>
  );
}

