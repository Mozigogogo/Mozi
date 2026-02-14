'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from 'antd';
import Image from 'next/image';
import Markdown from 'markdown-to-jsx';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import NavBar from '../../components/NavBar';
import ThinkingAnimation from '../../components/ThinkingAnimation';
import PopLogin from '../../components/PopLogin';
import { trackEvent, trackPageView, AIEvents } from '@/utils/amplitude';
import { INTERFACE_URL, Interface } from '@/utils/constants';
import { request } from '@/utils/request';
import { useRobotTestSSE } from '@/hooks/useRobotTestSSE';
import { forceBlurAndResetViewport } from '@/utils/iosViewportFix';
import styles from './page.module.less';

// 代码块组件 - 带复制按钮
const CodeBlock = ({ language, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();
  
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
        {copied ? t('robot.copied') : t('robot.copy')}
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
  const { t } = useTranslation();
  const BOT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/AI_Bot.png';

  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([
    { 
      id: 'welcome-1', 
      role: 'assistant', 
      content: '', 
      time: Date.now() 
    }
  ]);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  // 模型选择状态
  const [selectedModel, setSelectedModel] = useState('analyze'); // 'analyze' | 'chat'
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [showPopLogin, setShowPopLogin] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true); // 历史记录加载状态
  
  const scrollRef = useRef(null);
  const currentRequestIdRef = useRef(null);
  const currentAiMsgIdRef = useRef(null);
  const conversationIdRef = useRef(null);
  const messageIdRef = useRef(null);
  const historyLoadedRef = useRef(false); // 防止重复加载历史记录
  const abortControllerRef = useRef(null);
  // const [isStreaming, setIsStreaming] = useState(false); // 使用 hook 中的 isStreaming

  // 设置欢迎消息
  useEffect(() => {
    setMessages(prev => prev.map(msg => 
      msg.id === 'welcome-1' && !msg.content
        ? { ...msg, content: t('robot.welcome') }
        : msg
    ));
  }, [t]);

  // 加载聊天历史记录
  useEffect(() => {
    const loadChatHistory = async () => {
      // 防止重复加载
      if (historyLoadedRef.current) {
        console.log('⏭️ 历史记录已加载，跳过重复请求');
        return;
      }
      
      historyLoadedRef.current = true;

      try {
        // 从 localStorage 获取 conversationId
        const savedConversationId = typeof window !== 'undefined' 
          ? localStorage.getItem('ai_conversation_id') 
          : null;
        
        console.log('🔍 检查历史记录 conversationId:', savedConversationId);
        
        // 如果有 conversationId，保存到 ref
        if (savedConversationId) {
          conversationIdRef.current = savedConversationId;
        }

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const lang = typeof window !== 'undefined' 
          ? (localStorage.getItem('i18nextLng') || 'zh') 
          : 'zh';

        // 构建URL - 如果有conversationId就带上，没有就不带
        const url = savedConversationId 
          ? `${INTERFACE_URL}${Interface.AI_CHAT_HISTORY}/${savedConversationId}`
          : `${INTERFACE_URL}${Interface.AI_CHAT_HISTORY}`;
        
        console.log('📡 正在加载聊天历史:', url);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept-Language': lang,
            ...(token ? { 'Authentication': `${token}` } : {})
          }
        });

        console.log('📥 历史记录响应状态:', response.status);

        if (!response.ok) {
          throw new Error(`Failed to load chat history: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 历史记录数据:', data);
        
        // 检查返回的数据格式 - 格式：{ code: 0, data: { conversationId, messages, suggestedQuestions } }
        if (data.code === 0 && data.data && data.data.conversationId && data.data.messages && Array.isArray(data.data.messages)) {
          // 过滤掉 system 角色的消息，只保留 user 和 assistant 的对话
          const historyMessages = data.data.messages
            .filter(item => item.role !== 'system')
            .map((item, index) => {
              return {
                id: `history-${item.role}-${index}-${Date.now()}`,
                role: item.role, // 'user' 或 'assistant'
                content: item.content || '',
                time: Date.now() - (data.data.messages.length - index) * 1000, // 模拟时间戳
                conversationId: data.data.conversationId
              };
            });

          console.log('✅ 加载了', historyMessages.length, '条历史消息');

          // 如果有历史记录，替换欢迎消息
          if (historyMessages.length > 0) {
            setMessages(historyMessages);
            
            // 保存 conversationId
            if (data.data.conversationId) {
              conversationIdRef.current = data.data.conversationId;
              if (typeof window !== 'undefined') {
                localStorage.setItem('ai_conversation_id', data.data.conversationId);
              }
            }
            
            // 保存建议问题
            if (data.data.suggestedQuestions && Array.isArray(data.data.suggestedQuestions)) {
              setSuggestedQuestions(data.data.suggestedQuestions);
              console.log('✅ 加载了', data.data.suggestedQuestions.length, '个建议问题');
            }
          }
        } else {
          console.log('⚠️ 数据格式不符合预期或无历史记录:', data);
        }
      } catch (error) {
        console.error('❌ 加载聊天历史失败:', error);
        // 加载失败时保持欢迎消息
      } finally {
        setIsLoadingHistory(false); // 加载完成
      }
    };

    loadChatHistory();
  }, []);

  // 使用 SSE Stream Hook
  const { sendMessage, isStreaming, abort } = useRobotTestSSE(
    selectedModel === 'analyze' 
      ? '/api/robot_proxy/api/v1/analyze/stream'
      : '/api/robot_proxy/api/v1/chat/stream',
    {
      headers: () => {
        const lang = typeof window !== 'undefined' 
          ? (localStorage.getItem('i18nextLng') || 'zh') 
          : 'zh';
        return {
          'language': lang,
        };
      },
      getToken: () => typeof window !== 'undefined' ? localStorage.getItem('token') : null,
      onStart: () => {
        // AI 开始回复
      },
      onChunk: (chunk, accumulated, eventData) => {
        // 更新消息内容
        if (currentAiMsgIdRef.current) {
          setMessages(prev => prev.map(msg => 
            msg.id === currentAiMsgIdRef.current
              ? { 
                  ...msg, 
                  content: accumulated, 
                  loading: true,
                  conversationId: eventData?.conversationId || msg.conversationId,
                  messageId: eventData?.messageId || msg.messageId
                }
              : msg
          ));

          // 保存 conversationId 和 messageId
          if (eventData?.conversationId) {
            conversationIdRef.current = eventData.conversationId;
            if (typeof window !== 'undefined') {
              localStorage.setItem('ai_conversation_id', eventData.conversationId);
            }
          }
          if (eventData?.messageId) {
            messageIdRef.current = eventData.messageId;
          }
        }
      },
      onComplete: (fullContent, eventData) => {
        // AI 回复完成
        if (currentAiMsgIdRef.current) {
          const msgId = currentAiMsgIdRef.current;
          setMessages(prev => prev.map(msg => 
            msg.id === msgId
              ? { 
                  ...msg, 
                  content: fullContent,
                  loading: false,
                  tokens: eventData?.tokens,
                  conversationId: eventData?.conversationId || msg.conversationId,
                  messageId: eventData?.messageId || msg.messageId
                }
              : msg
          ));
        }
        currentAiMsgIdRef.current = null;

        // 更新建议问题
        if (eventData?.suggestedQuestions && eventData.suggestedQuestions.length > 0) {
          setSuggestedQuestions(eventData.suggestedQuestions);
        }

        // 埋点：AI 回复完成
        trackEvent(AIEvents.RESPONSE_RECEIVED, {
          requestId: currentRequestIdRef.current,
          responseLength: fullContent.length,
          conversationId: eventData?.conversationId,
          messageId: eventData?.messageId,
          tokens: eventData?.tokens
        });
      },
      onError: (error) => {
        // AI 对话错误
        // 更新消息为错误状态
        if (currentAiMsgIdRef.current) {
          setMessages(prev => prev.map(msg => 
            msg.id === currentAiMsgIdRef.current
              ? { ...msg, content: t('robot.sendFailed') || '发送失败，请重试', loading: false, error: true }
              : msg
          ));
        }
        currentAiMsgIdRef.current = null;
      }
    }
  );
  
  // 检查登录状态
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setShowPopLogin(true);
    }
  }, []);
  
  // 埋点：页面浏览
  useEffect(() => {
    trackPageView('AI Assistant');
  }, []);
  
  // 登录成功回调
  const handleLoginSuccess = () => {
    window.location.reload();
  };

  // 滚动到底部的函数
  const scrollToBottom = () => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const maxScroll = container.scrollHeight - container.clientHeight;
      
      if (maxScroll > 0) {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    });
  }, [messages]);

  // 发送消息 - 使用 SSE Stream Hook
  const handleSend = async (text = null) => {
    // iOS 修复：强制失焦输入框，防止 viewport 缩放问题
    forceBlurAndResetViewport();
    
    const message = text || inputValue.trim();
    if (!message || isStreaming) return;

    // 埋点：用户发送问题
    trackEvent(AIEvents.QUESTION_SENT, {
      question: message,
      questionLength: message.length,
      isSuggestedQuestion: text !== null,
      timestamp: Date.now()
    });

    // 添加用户消息
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      time: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setSuggestedQuestions([]);

    // 生成请求 ID
    const requestId = `req_${Date.now()}`;
    currentRequestIdRef.current = requestId;

    // 添加 AI 加载消息
    const aiMsgId = `ai-loading-${Date.now()}`;
    currentAiMsgIdRef.current = aiMsgId;
    
    setMessages(prev => [...prev, {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      time: Date.now(),
      loading: true,
      requestId: requestId
    }]);

    try {
      const lang = typeof window !== 'undefined' 
        ? (localStorage.getItem('i18nextLng') || 'zh') 
        : 'zh';

      // 构造请求 payload
      let payload = {};
      if (selectedModel === 'analyze') {
        payload = {
          symbol: "BTC",
          question: message,
          lang: lang
        };
      } else {
        payload = {
          message: message,
          lang: lang
        };
      }

      // 使用 SSE Stream Hook 发送消息
      await sendMessage(payload);
    } catch (error) {
      // 发送消息失败
      console.error('Send message failed:', error);
    }
  };

  // 停止生成
  const handleStop = () => {
    if (!isStreaming) return;
    
    // 中止 SSE 流
    abort();
    
    // 更新消息状态
    if (currentAiMsgIdRef.current) {
      setMessages(prev => prev.map(msg => 
        msg.id === currentAiMsgIdRef.current
          ? { ...msg, loading: false }
          : msg
      ));
    }
    
    currentAiMsgIdRef.current = null;
    // 停止生成
  };

  // 点击建议问题
  const handleSuggestedQuestion = (question) => {
    handleSend(question);
  };

  const getSuggestedQuestionDisplay = (question) => {
    if (!question) return '';
    const trendMatch = question.match(/^帮我分析一下\s+(.+?)\s+的走势$/);
    if (trendMatch) {
      const symbol = trendMatch[1].trim();
      return t('robot.suggest.analyzeTrend', { symbol });
    }
    const buyMatch = question.match(/^(.+?)\s+现在适合买入吗？$/);
    if (buyMatch) {
      const symbol = buyMatch[1].trim();
      return t('robot.suggest.isGoodToBuy', { symbol });
    }
    const techMatch = question.match(/^(.+?)\s+的技术面如何？$/);
    if (techMatch) {
      const symbol = techMatch[1].trim();
      return t('robot.suggest.technicalView', { symbol });
    }
    // 今天涨幅最大的币种是什么？
    if (question.includes('今天涨幅最大的币种是什么')) {
      return t('robot.suggest.topGainer');
    }
    // 恐惧与贪婪指数是多少？
    if (question.includes('恐惧与贪婪指数是多少')) {
      return t('robot.suggest.fearGreedIndex');
    }
    return question;
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
          title={t('robot.title')} 
          showBack={true}
          className={styles.navBarCustom}
        />
        
        <div className={styles.chatHeader}>
          <div className={styles.titleRow}>
            <div className={styles.chatTitle}>{t('robot.title')}</div>
            <Select
              value={selectedModel}
              onChange={(value) => {
                setSelectedModel(value);
                setTimeout(() => setDropdownOpen(false), 0);
              }}
              onDropdownVisibleChange={setDropdownOpen}
              open={dropdownOpen}
              className={styles.modelSelect}
              popupMatchSelectWidth={false}
              options={[
                { value: 'analyze', label: t('robot.model.analyze') },
                { value: 'chat', label: t('robot.model.chat') },
              ]}
            />
          </div>
          
          <div className={styles.chatSubtitle}>
            {t('robot.subtitle')}
          </div>
        </div>

        <div className={styles.chatScroll} ref={scrollRef}>
          <div className={styles.messages}>
            {messages.map((msg) => (
              <div key={msg.id} className={`${styles.msgRow} ${msg.role === 'user' ? styles.right : styles.left}`}>
                {msg.role === 'assistant' && (
                  <div className={styles.avatarCol}>
                    <img className={styles.avatar} src={BOT_AVATAR} alt={t('robot.aiAlt')} />
                    <span className={styles.timeUnder}>{formatTime(msg.time)}</span>
                  </div>
                )}

                <div className={styles.msgContent}>
                  {msg.loading && !msg.content ? (
                    <ThinkingAnimation />
                  ) : (
                    <div className={`${styles.bubble} ${styles[msg.role]} ${msg.error ? styles.error : ''}`}>
                      <div className={styles.text}>
                        {msg.role === 'assistant' && msg.content ? (
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
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className={styles.avatarCol}>
                    <div className={styles.userAvatar}>{t('robot.me')}</div>
                    <span className={styles.timeUnder}>{formatTime(msg.time)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* 历史记录加载遮罩层 - 只遮罩聊天区域 */}
          {isLoadingHistory && (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingContent}>
                <ThinkingAnimation />
                <div className={styles.loadingText}>{t('robot.loadingHistory')}</div>
              </div>
            </div>
          )}
        </div>

        {/* 建议问题 - 固定在输入框上方 */}
        {suggestedQuestions.length > 0 && !isStreaming && (
          <div className={styles.suggestedQuestions}>
            <div className={styles.suggestedTitle}>{t('robot.suggestedTitle')}</div>
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                className={styles.suggestedBtn}
                onClick={() => handleSuggestedQuestion(q)}
              >
                {getSuggestedQuestionDisplay(q)}
              </button>
            ))}
          </div>
        )}

        <div className={styles.chatInputBar}>
          <div className={styles.inputBox}>
            <input
              className={styles.input}
              value={inputValue}
              placeholder={t('robot.inputPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && !isStreaming && handleSend()}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => trackEvent(AIEvents.INPUT_FOCUSED)}
              disabled={isStreaming}
            />
          </div>
          {isStreaming ? (
            <button 
              className={styles.stopBtn} 
              onClick={handleStop}
            >
              <Image 
                src="/icons/pause.svg" 
                alt={t('robot.stopAlt')} 
                width={18} 
                height={18}
                className={styles.pauseIcon}
              />
            </button>
          ) : (
            <button 
              className={styles.sendBtn} 
              onClick={() => handleSend()}
              disabled={!inputValue.trim()}
            >
              {t('robot.send')}
            </button>
          )}
        </div>
        
        {/* 登录提示弹窗 */}
        <PopLogin
          visible={showPopLogin}
          onClose={() => setShowPopLogin(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
  );
}
