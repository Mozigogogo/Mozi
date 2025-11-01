'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Markdown from 'markdown-to-jsx';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import NavBar from '../../components/NavBar';
import ThinkingAnimation from '../../components/ThinkingAnimation';
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

// 代码块组件 - 带复制按钮
const CodeBlock = ({ language, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    const code = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute',
          right: '8px',
          top: '8px',
          padding: '4px 8px',
          background: copied ? '#11B787' : 'rgba(255, 255, 255, 0.1)',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          zIndex: 10,
          transition: 'all 0.2s',
          backdropFilter: 'blur(4px)',
        }}
        onMouseEnter={(e) => {
          if (!copied) {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!copied) {
            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
          }
        }}
      >
        {copied ? '已复制' : '复制'}
      </button>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{ margin: '0.5em 0', borderRadius: '4px', paddingTop: '40px' }}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
};

// 流式 Markdown 渲染组件 - 逐行渲染
const StreamingMarkdown = ({ content, isStreaming }) => {
  if (!content) return null;
  
  // 按换行符分割内容
  const lines = content.split('\n');
  
  if (!isStreaming) {
    // 完成后，整体渲染
    return (
      <Markdown
        options={{
          overrides: {
            p: {
              props: {
                style: { margin: '0.3em 0', lineHeight: '1.6' }
              }
            },
            code: {
              component: ({ className, children, ...props }) => {
                const match = /lang-(\w+)/.exec(className || '');
                const isBlock = className?.includes('lang-');
                
                return isBlock && match ? (
                  <CodeBlock language={match[1]} {...props}>
                    {children}
                  </CodeBlock>
                ) : (
                  <code style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '2px 6px', 
                    borderRadius: '3px',
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: '0.9em'
                  }} {...props}>
                    {children}
                  </code>
                );
              }
            },
            ul: {
              props: {
                style: { margin: '0.3em 0', paddingLeft: '1.5em' }
              }
            },
            ol: {
              props: {
                style: { margin: '0.3em 0', paddingLeft: '1.5em' }
              }
            },
            li: {
              props: {
                style: { margin: '0.2em 0' }
              }
            },
            blockquote: {
              props: {
                style: { 
                  margin: '0.3em 0', 
                  paddingLeft: '1em', 
                  borderLeft: '3px solid #ccc',
                  color: '#666'
                }
              }
            },
            h1: {
              props: {
                style: { margin: '0.6em 0 0.3em', fontSize: '1.5em', fontWeight: 600 }
              }
            },
            h2: {
              props: {
                style: { margin: '0.6em 0 0.3em', fontSize: '1.3em', fontWeight: 600 }
              }
            },
            h3: {
              props: {
                style: { margin: '0.6em 0 0.3em', fontSize: '1.1em', fontWeight: 600 }
              }
            },
            table: {
              props: {
                style: { borderCollapse: 'collapse', margin: '0.5em 0', width: '100%' }
              }
            },
            th: {
              props: {
                style: { 
                  border: '1px solid #ddd', 
                  padding: '0.4em 0.6em',
                  backgroundColor: '#f5f5f5',
                  fontWeight: 600
                }
              }
            },
            td: {
              props: {
                style: { border: '1px solid #ddd', padding: '0.4em 0.6em' }
              }
            }
          }
        }}
      >
        {content}
      </Markdown>
    );
  }
  
  // 流式输出时，逐行渲染
  if (lines.length === 1) {
    // 只有一行且还在输入中，显示纯文本
    return (
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
        {content}
      </div>
    );
  }
  
  // 多行内容：前面完整的行用 markdown 渲染，最后一行用纯文本
  const completedLines = lines.slice(0, -1).join('\n');
  const currentLine = lines[lines.length - 1];
  
  return (
    <div>
      {completedLines && (
        <Markdown
          options={{
            overrides: {
              p: {
                props: {
                  style: { margin: '0.3em 0', lineHeight: '1.6' }
                }
              },
              code: {
                component: ({ className, children, ...props }) => {
                  const match = /lang-(\w+)/.exec(className || '');
                  const isBlock = className?.includes('lang-');
                  
                  return isBlock && match ? (
                    <CodeBlock language={match[1]} {...props}>
                      {children}
                    </CodeBlock>
                  ) : (
                    <code style={{ 
                      backgroundColor: '#f5f5f5', 
                      padding: '2px 6px', 
                      borderRadius: '3px',
                      fontFamily: 'Consolas, Monaco, monospace',
                      fontSize: '0.9em'
                    }} {...props}>
                      {children}
                    </code>
                  );
                }
              },
              ul: {
                props: {
                  style: { margin: '0.3em 0', paddingLeft: '1.5em' }
                }
              },
              ol: {
                props: {
                  style: { margin: '0.3em 0', paddingLeft: '1.5em' }
                }
              },
              li: {
                props: {
                  style: { margin: '0.2em 0' }
                }
              },
              blockquote: {
                props: {
                  style: { 
                    margin: '0.3em 0', 
                    paddingLeft: '1em', 
                    borderLeft: '3px solid #ccc',
                    color: '#666'
                  }
                }
              },
              h1: {
                props: {
                  style: { margin: '0.6em 0 0.3em', fontSize: '1.5em', fontWeight: 600 }
                }
              },
              h2: {
                props: {
                  style: { margin: '0.6em 0 0.3em', fontSize: '1.3em', fontWeight: 600 }
                }
              },
              h3: {
                props: {
                  style: { margin: '0.6em 0 0.3em', fontSize: '1.1em', fontWeight: 600 }
                }
              },
              table: {
                props: {
                  style: { borderCollapse: 'collapse', margin: '0.5em 0', width: '100%' }
                }
              },
              th: {
                props: {
                  style: { 
                    border: '1px solid #ddd', 
                    padding: '0.4em 0.6em',
                    backgroundColor: '#f5f5f5',
                    fontWeight: 600
                  }
                }
              },
              td: {
                props: {
                  style: { border: '1px solid #ddd', padding: '0.4em 0.6em' }
                }
              }
            }
          }}
        >
          {completedLines}
        </Markdown>
      )}
      {currentLine && (
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
          {currentLine}
        </div>
      )}
    </div>
  );
};

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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false); // 是否正在加载历史记录
  
  const scrollRef = useRef(null);
  const wsRef = useRef(null);
  const conversationIdRef = useRef(null);
  const currentMessageIdRef = useRef(null);
  const currentRequestIdRef = useRef(null);
  const hasLoadedHistoryRef = useRef(false); // 标记是否已加载过历史记录

  // 初始化 WebSocket
  useEffect(() => {
    console.log('🤖 初始化 AI 对话 WebSocket');
    
    // 尝试从 localStorage 读取上次的 conversationId
    const savedConversationId = typeof window !== 'undefined' 
      ? localStorage.getItem('ai_conversation_id') 
      : null;
    
    if (savedConversationId) {
      conversationIdRef.current = savedConversationId;
      console.log('📌 从本地读取会话 ID:', savedConversationId);
    }
    
    // 从 localStorage 读取用户 token
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('token') 
      : null;
    
    if (token) {
      console.log('🔑 找到用户 token，将通过 Sec-WebSocket-Protocol 传递');
    } else {
      console.log('⚠️ 未找到用户 token，将以匿名方式连接');
    }
    
    const ws = new MoziWebSocket(WS_URL, {
      platform: PLATFORMS.H5,
      version: '1.0.0',
      autoHandshake: true,
      debug: true,
      token: token,  // 通过 Sec-WebSocket-Protocol 子协议传递 token
    });

    wsRef.current = ws;

    // 监听认证成功
    ws.on('authenticated', (data) => {
      console.log('✅ AI 对话 WebSocket 认证成功');
      setIsConnecting(false);
      
      // 认证成功后，立即请求历史记录
      if (!hasLoadedHistoryRef.current && ws.isConnected) {
        const conversationId = conversationIdRef.current;
        console.log(`📜 请求历史对话记录... (会话ID: ${conversationId || '无'})`);
        setIsLoadingHistory(true);
        try {
          // 使用保存的 conversationId 查询历史记录
          const historyMessage = createAIChatHistoryMessage(conversationId, 50);
          ws.send(historyMessage);
          hasLoadedHistoryRef.current = true;
        } catch (error) {
          console.error('❌ 请求历史记录失败:', error);
          setIsLoadingHistory(false);
        }
      }
    });

    // 监听 AI 开始回复
    ws.on(WS_EVENTS.AI_CHAT_START, (data) => {
      console.log('🤖 AI 开始回复:', data);
      const { conversationId, messageId } = data.data || {};
      
      if (conversationId) {
        conversationIdRef.current = conversationId;
        // 保存到 localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('ai_conversation_id', conversationId);
        }
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
      
      // AI 回复完成后，确保滚动到最底部
      setTimeout(() => {
        if (scrollRef.current) {
          const container = scrollRef.current;
          const maxScroll = container.scrollHeight - container.clientHeight;
          console.log('🎯 AI 回复完成，强制滚动到底部', {
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight,
            maxScroll: maxScroll,
            canScroll: maxScroll > 0,
            scrollTopBefore: container.scrollTop
          });
          
          container.scrollTop = container.scrollHeight;
          
          console.log('✅ 滚动后 scrollTop:', container.scrollTop);
        }
      }, 200);
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
      setIsLoadingHistory(false);
      
      const { messages: historyMessages, conversationId } = data.data || {};
      
      if (historyMessages && historyMessages.length > 0) {
        console.log(`✅ 加载了 ${historyMessages.length} 条历史消息`);
        
        // 如果有历史记录，保存 conversationId
        if (conversationId) {
          conversationIdRef.current = conversationId;
          // 保存到 localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('ai_conversation_id', conversationId);
          }
          console.log('📌 设置并保存会话 ID:', conversationId);
        }
        
        // 格式化历史消息
        const formattedMessages = historyMessages.map(msg => ({
          id: msg.messageId || `history-${msg.timestamp}`,
          messageId: msg.messageId,
          role: msg.role === 'system' ? 'assistant' : msg.role, // 将 system 映射为 assistant
          content: msg.content,
          time: msg.timestamp || Date.now(),
        }));
        
        // 如果有历史记录，替换掉默认的欢迎消息
        setMessages(formattedMessages);
      } else {
        console.log('📭 没有历史记录，显示默认欢迎消息');
        // 没有历史记录，保持默认的欢迎消息
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

  // 滚动到底部的函数 - 可被多处调用
  const scrollToBottom = (force = false) => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const maxScroll = container.scrollHeight - container.clientHeight;
      
      console.log('📜 滚动到底部', {
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
        clientHeight: container.clientHeight,
        maxScroll: maxScroll,
        canScroll: maxScroll > 0,
        force
      });
      
      // 直接设置 scrollTop 到最大值
      if (maxScroll > 0) {
        container.scrollTop = container.scrollHeight;
        console.log('✅ 已滚动到:', container.scrollTop);
      } else {
        console.log('⚠️ 内容未溢出，无需滚动');
      }
    }
  };

  // 自动滚动到底部 - 使用平滑滚动和 requestAnimationFrame 确保 DOM 更新后滚动
  useEffect(() => {
    // 使用 requestAnimationFrame 确保在 DOM 更新后执行滚动
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
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
        <NavBar 
          title="AI 助手" 
          showBack={true}
          className={styles.navBarCustom}
        />
        
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
          {/* 加载历史记录提示 */}
          {isLoadingHistory && (
            <div className={styles.loadingHistory}>
              <div className={styles.loadingText}>正在加载历史对话...</div>
            </div>
          )}
          
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
                      {msg.loading && !msg.content ? (
                        <ThinkingAnimation />
                      ) : msg.role === 'assistant' && msg.content ? (
                        // 使用流式 Markdown 组件：逐行渲染
                        <>
                          <StreamingMarkdown 
                            content={msg.content} 
                            isStreaming={msg.loading} 
                          />
                          {msg.loading && <span className={styles.loadingDots}>...</span>}
                        </>
                      ) : (
                        msg.content || ''
                      )}
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
        </div>

        {/* 建议问题 - 固定在输入框上方 */}
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

