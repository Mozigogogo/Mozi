'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Markdown from 'markdown-to-jsx';
import NavBar from '../../components/NavBar';
import PCLayout from '../../components/PCLayout';
import ThinkingAnimation from '../../components/ThinkingAnimation';
import PopLogin from '../../components/PopLogin';
import { trackEvent, trackPageView, AIEvents } from '@/utils/amplitude';
import { INTERFACE_URL, Interface } from '@/utils/constants';
import { request } from '@/utils/request';
import { executeConsume } from '@/api/points';
import { useRobotTestSSE } from '@/hooks/useRobotTestSSE';
import { forceBlurAndResetViewport } from '@/utils/iosViewportFix';
import { safeBack } from '@/utils/navigation';
import { fetchUserDataInfoOnce } from '@/utils/postLogin';
import styles from './page.module.less';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import AiRobotUpgradePillButton from '@/components/AiRobotUpgradePillButton';
import PointsInsufficientBubble from '@/components/PointsInsufficientBubble';
import ShareAiChatModal from '@/components/ShareAiChatModal';

// 大依赖按需加载：避免首屏把 syntax-highlighter 整包打进来
const LazySyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then((m) => m.Prism),
  {
    ssr: false,
    loading: () => null,
  }
);

// 尝试在需要时再加载高亮主题（失败则退回无主题）
async function loadVscDarkPlusStyle() {
  try {
    const mod = await import('react-syntax-highlighter/dist/esm/styles/prism');
    return mod?.vscDarkPlus || null;
  } catch (_) {
    return null;
  }
}

function runWhenIdle(fn) {
  if (typeof window === 'undefined') return;
  // requestIdleCallback 在部分 WebView 里可能不存在
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(
      () => {
        try {
          fn();
        } catch (_) {}
      },
      { timeout: 1200 }
    );
    return;
  }
  window.setTimeout(() => {
    try {
      fn();
    } catch (_) {}
  }, 0);
}

// 代码块组件 - 带复制按钮
const CodeBlock = ({ language, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState(null);
  const { t } = useTranslation();
  
  const handleCopy = () => {
    const code = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    let alive = true;
    loadVscDarkPlusStyle().then((style) => {
      if (!alive) return;
      setTheme(style);
    });
    return () => {
      alive = false;
    };
  }, []);
  
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
      {/* 高亮组件懒加载：加载前先降级为普通 pre，避免首屏卡顿 */}
      {LazySyntaxHighlighter ? (
        <LazySyntaxHighlighter
          style={theme || undefined}
          language={language}
          PreTag="div"
          customStyle={{ margin: '0.5em 0', borderRadius: '4px', paddingTop: '40px' }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </LazySyntaxHighlighter>
      ) : (
        <pre
          style={{
            margin: '0.5em 0',
            borderRadius: '4px',
            padding: '40px 12px 12px',
            overflowX: 'auto',
            background: '#1e1e1e',
            color: '#fff',
            fontSize: '12px',
            lineHeight: 1.6,
          }}
        >
          {String(children).replace(/\n$/, '')}
        </pre>
      )}
    </div>
  );
};

// 流式 Markdown 渲染组件 - 逐行渲染
const StreamingMarkdown = ({ content, isStreaming }) => {
  if (!content) return null;

  const lines = useMemo(() => String(content).split('\n'), [content]);

  const completedLines = useMemo(() => {
    if (!isStreaming) return content;
    if (lines.length <= 1) return '';
    return lines.slice(0, -1).join('\n');
  }, [content, isStreaming, lines]);

  const currentLine = useMemo(() => {
    if (!isStreaming) return '';
    return lines.length > 0 ? lines[lines.length - 1] : '';
  }, [isStreaming, lines]);

  const baseMarkdownOverrides = {
    p: {
      props: {
        style: { margin: '0.3em 0', lineHeight: '1.6' },
      },
    },
    ul: {
      props: {
        style: { margin: '0.3em 0', paddingLeft: '1.5em' },
      },
    },
    ol: {
      props: {
        style: { margin: '0.3em 0', paddingLeft: '1.5em' },
      },
    },
    li: {
      props: {
        style: { margin: '0.2em 0' },
      },
    },
    blockquote: {
      props: {
        style: {
          margin: '0.3em 0',
          paddingLeft: '1em',
          borderLeft: '3px solid #ccc',
          color: '#666',
        },
      },
    },
    h1: {
      props: {
        style: { margin: '0.6em 0 0.3em', fontSize: '1.5em', fontWeight: 600 },
      },
    },
    h2: {
      props: {
        style: { margin: '0.6em 0 0.3em', fontSize: '1.3em', fontWeight: 600 },
      },
    },
    h3: {
      props: {
        style: { margin: '0.6em 0 0.3em', fontSize: '1.1em', fontWeight: 600 },
      },
    },
    table: {
      props: {
        style: { borderCollapse: 'collapse', margin: '0.5em 0', width: '100%' },
      },
    },
    th: {
      props: {
        style: {
          border: '1px solid #ddd',
          padding: '0.4em 0.6em',
          backgroundColor: '#f5f5f5',
          fontWeight: 600,
        },
      },
    },
    td: {
      props: {
        style: { border: '1px solid #ddd', padding: '0.4em 0.6em' },
      },
    },
  };

  const inlineCodeEl = (children, props) => (
    <code
      style={{
        backgroundColor: '#f5f5f5',
        padding: '2px 6px',
        borderRadius: '3px',
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '0.9em',
      }}
      {...props}
    >
      {children}
    </code>
  );

  // 流式阶段：依旧渲染 Markdown（恢复体验），但代码块不做高亮，避免大幅卡顿
  if (isStreaming) {
    if (lines.length === 1) {
      return <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{content}</div>;
    }

    return (
      <div>
        {completedLines ? (
          <Markdown
            options={{
              overrides: {
                ...baseMarkdownOverrides,
                code: {
                  component: ({ className, children, ...props }) => {
                    const isBlock = className?.includes('lang-');
                    if (isBlock) {
                      return (
                        <pre
                          style={{
                            margin: '0.5em 0',
                            borderRadius: '4px',
                            padding: '12px',
                            overflowX: 'auto',
                            background: '#1e1e1e',
                            color: '#fff',
                            fontSize: '12px',
                            lineHeight: 1.6,
                          }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </pre>
                      );
                    }
                    return inlineCodeEl(children, props);
                  },
                },
              },
            }}
          >
            {completedLines}
          </Markdown>
        ) : null}
        {currentLine ? (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{currentLine}</div>
        ) : null}
      </div>
    );
  }

  // 完成后：整体渲染（含代码高亮）
  return (
    <Markdown
      options={{
        overrides: {
          ...baseMarkdownOverrides,
          code: {
            component: ({ className, children, ...props }) => {
              const match = /lang-(\w+)/.exec(className || '');
              const isBlock = className?.includes('lang-');
              return isBlock && match ? (
                <CodeBlock language={match[1]} {...props}>
                  {children}
                </CodeBlock>
              ) : (
                inlineCodeEl(children, props)
              );
            },
          },
        },
      }}
    >
      {content}
    </Markdown>
  );
};

export default function RobotPage({ isPC: propIsPC = false }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const BOT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/robot_logo.svg';
  // 是否根据积分余额限制对话（积分不足时展示气泡并阻止继续对话）
  const ENABLE_POINTS_LIMIT = true;
  /** 临时：不请求 /api/ai/chat/history，测完请改回 false */
  const DEBUG_SKIP_CHAT_HISTORY_LOAD = false;

  const [isPCState, setIsPCState] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const checkDevice = () => {
      setIsPCState(window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const isPC = propIsPC || isPCState;
  const fixedSuggestedQuestions = [
    t('robot.quickAsk.btcTrend'),
    t('robot.quickAsk.ethTechnical'),
    t('robot.quickAsk.solDaily'),
    t('robot.quickAsk.bnbProspect'),
    t('robot.quickAsk.tonOutlook'),
  ];

  const [inputValue, setInputValue] = useState('');
  // 消息列表：只有加载到历史记录或用户开始对话时才会出现内容
  const [messages, setMessages] = useState([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  // 模型选择状态
  const [selectedModel, setSelectedModel] = useState('analyze'); // 'analyze' | 'chat'
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareQuestion, setShareQuestion] = useState('');
  const [shareAnswer, setShareAnswer] = useState('');

  // 当前模型单次对话所需积分
  const requiredPointsPerAsk = selectedModel === 'analyze' ? 50 : 10;

  // 语音转文字（Web Speech API）
  const {
    transcript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition();

  // 识别结束后，把结果填回输入框
  useEffect(() => {
    if (!listening && finalTranscript) {
      setInputValue(finalTranscript);
    }
  }, [listening, finalTranscript]);

  // 识别过程中，实时把转写内容写到输入框（更像“边说边转文字”）
  useEffect(() => {
    if (listening && transcript) {
      setInputValue(transcript);
    }
  }, [listening, transcript]);

  const [showPopLogin, setShowPopLogin] = useState(false);
  /** 已登录：进入页先等 /user/datainfo 返回再展示主界面，保证积分等与后端一致；未登录不等待 */
  const [isBootstrappingUserData, setIsBootstrappingUserData] = useState(true);
  const [hasEnoughPoints, setHasEnoughPoints] = useState(true);   // 当前是否还有可用积分
  const [remainingPoints, setRemainingPoints] = useState(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isTelegramEnv, setIsTelegramEnv] = useState(false);
  const [showPointsLock, setShowPointsLock] = useState(false);
  /** 同页复用一次 datainfo Promise，避免 effect 重入时重复 await 新请求（全局 fetchUserDataInfoOnce 另有并发去重） */
  const robotDataInfoSyncRef = useRef(null);

  useEffect(() => {
    const bootstrapUserData = async () => {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('token');
      if (!token) {
        setIsBootstrappingUserData(false);
        return;
      }

      try {
        const cached = localStorage.getItem('userDataInfo');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (typeof parsed?.totalPoints === 'number') {
            setTotalPoints(parsed.totalPoints);
          }
        }
      } catch (err) {
        console.warn('[Robot] parse cached userDataInfo failed:', err);
      }

      try {
        // force 勿开：与 postLogin 内 in-flight/短窗口去重配合，避免同屏重复打 datainfo；仍走真实 GET
        const latest = await fetchUserDataInfoOnce({
          caller: 'RobotPage_bootstrap',
        });
        if (latest && typeof latest.totalPoints === 'number') {
          setTotalPoints(latest.totalPoints);
        }
      } catch (err) {
        console.warn('[Robot] fetch userDataInfo failed:', err);
      } finally {
        setIsBootstrappingUserData(false);
      }
    };

    // 进入页优先保证动画/首屏渲染顺滑：用户数据同步放到空闲时段
    runWhenIdle(bootstrapUserData);
  }, []);


  const handleCopyMessage = async (text) => {
    try {
      if (!text) return;
      await navigator.clipboard.writeText(String(text));
    } catch (e) {
      // Clipboard 权限可能受限，忽略即可
      console.warn('[Robot] copy message failed:', e);
    }
  };
  
  const scrollRef = useRef(null);
  const currentRequestIdRef = useRef(null);
  const currentAiMsgIdRef = useRef(null);
  const conversationIdRef = useRef(null);
  const messageIdRef = useRef(null);
  const lastUserMessageRef = useRef(null); // 用于“重新生成”
  const historyLoadedRef = useRef(false); // 防止重复加载历史记录
  const abortControllerRef = useRef(null);
  const currentActionCodeRef = useRef(null); // 本轮对话对应的积分扣除动作
  const hasConsumedRef = useRef(false); // 防止重复调用 /points/consume
  // const [isStreaming, setIsStreaming] = useState(false); // 使用 hook 中的 isStreaming

  // 加载聊天历史记录
  useEffect(() => {
    const loadChatHistory = async () => {
      // 防止重复加载
      if (historyLoadedRef.current) {
        console.log('⏭️ 历史记录已加载，跳过重复请求');
        return;
      }
      
      historyLoadedRef.current = true;

      if (DEBUG_SKIP_CHAT_HISTORY_LOAD) {
        return;
      }

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

          if (historyMessages.length > 0) {
            setMessages(historyMessages);
            
            // 保存 conversationId
            if (data.data.conversationId) {
              conversationIdRef.current = data.data.conversationId;
              if (typeof window !== 'undefined') {
                localStorage.setItem('ai_conversation_id', data.data.conversationId);
              }
            }
          } else {
            // 没有历史记录时，不展示欢迎气泡/默认消息
            setMessages([]);
          }

          // 保存建议问题：即使没有历史消息，也可能由后端下发默认 suggestedQuestions
          if (data.data.suggestedQuestions && Array.isArray(data.data.suggestedQuestions)) {
            setSuggestedQuestions(data.data.suggestedQuestions);
            console.log('✅ 加载了', data.data.suggestedQuestions.length, '个建议问题');
          } else {
            setSuggestedQuestions([]);
          }
        } else {
          console.log('⚠️ 数据格式不符合预期或无历史记录:', data);
          setMessages([]);
          setSuggestedQuestions([]);
        }
      } catch (error) {
        console.error('❌ 加载聊天历史失败:', error);
        // 加载失败时，不展示默认欢迎消息
        setMessages([]);
        setSuggestedQuestions([]);
      }
    };

    // 历史记录请求 + JSON 解析也会占用主线程，延后到空闲时段再做
    runWhenIdle(loadChatHistory);
  }, []);

  const consumeOnce = async (reason = 'complete') => {
    if (hasConsumedRef.current || !currentActionCodeRef.current) return;
    hasConsumedRef.current = true;
    const actionCode = currentActionCodeRef.current;
    try {
      const res = await executeConsume({ actionCode, reason });
      console.log('[Robot] points consume result:', res);
      // 根据后端返回的剩余积分更新本地状态，用于是否限制后续对话
      if (res && res.code === 0 && res.data && typeof res.data.remainingPoints === 'number') {
        setRemainingPoints(res.data.remainingPoints);
        setTotalPoints(res.data.remainingPoints);
        if (res.data.remainingPoints <= 0) {
          setHasEnoughPoints(false);
          setShowPointsLock(true);
        }
      }

      // 每次对话完成/中断后，强制拉取最新用户总积分，保证展示值与 /user 一致
      try {
        const latest = await fetchUserDataInfoOnce({
          force: true,
          caller: 'RobotPage_consumeOnce_afterConversation',
        });
        if (latest && typeof latest.totalPoints === 'number') {
          setTotalPoints(latest.totalPoints);
          setRemainingPoints(latest.totalPoints);
          if (latest.totalPoints <= 0) {
            setHasEnoughPoints(false);
            setShowPointsLock(true);
          } else {
            setHasEnoughPoints(true);
          }
        }
      } catch (syncErr) {
        console.warn('[Robot] sync latest totalPoints failed:', syncErr);
      }
    } catch (err) {
      console.error('[Robot] points consume failed:', err, { actionCode, reason });
    }
  };

  // 使用 SSE Stream Hook（对话结束或中断后再扣积分）
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
      onComplete: async (fullContent, eventData) => {
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

        // 对话正常完成后再扣积分
        await consumeOnce('complete');
      },
      onError: (error) => {
        // AI 对话错误
        // 更新消息为错误状态
        if (currentAiMsgIdRef.current) {
          setMessages(prev => prev.map(msg => 
            msg.id === currentAiMsgIdRef.current
              ? { ...msg, content: t('robot.sendFailed'), loading: false, error: true }
              : msg
          ));
        }
        currentAiMsgIdRef.current = null;

        // 对话异常结束不再扣积分，仅记录错误
        // 如需埋点可在此增加上报逻辑
      }
    }
  );

  // 右上角 “AI Assistant Pro” 升级胶囊：只在空状态展示，开始对话后隐藏
  // 放在这里是为了确保 `isBootstrappingUserData` / `isStreaming` 已初始化
  const showUpgradePill = messages.length === 0 && !isBootstrappingUserData && !isStreaming;
  
  // 检查登录状态
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setShowPopLogin(true);
    }
  }, []);

  // Telegram 环境检测：TG 端隐藏语音按钮，避免权限弹窗体验问题
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsTelegramEnv(localStorage.getItem('appChannel') === 'tg');
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

  /** 与底部积分展示一致：优先用扣减后的 remainingPoints，否则用 userData 的 totalPoints */
  const getEffectivePoints = () => {
    if (typeof remainingPoints === 'number') return remainingPoints;
    if (typeof totalPoints === 'number') return totalPoints;
    return null;
  };

  /** 输入框发送 / 快捷提示词 / 重新生成 共用：积分不足以支付当前模式单次消耗时拦截 */
  const shouldShowPointsLockBeforeSend = () => {
    if (!ENABLE_POINTS_LIMIT) return false;
    if (!hasEnoughPoints) return true;
    const eff = getEffectivePoints();
    if (typeof eff !== 'number') return false;
    return eff < requiredPointsPerAsk;
  };

  const appendPointsLockMessage = () => {
    const eff = getEffectivePoints();
    setShowPointsLock(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `system-points-lock-${Date.now()}`,
        role: 'assistant',
        type: 'pointsLock',
        currentPoints: typeof eff === 'number' ? eff : 0,
        requiredPoints: requiredPointsPerAsk,
        time: Date.now(),
      },
    ]);
  };

  // 发送消息 - 使用 SSE Stream Hook
  const handleSend = async (text = null) => {
    if (shouldShowPointsLockBeforeSend()) {
      appendPointsLockMessage();
      return;
    }

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
    lastUserMessageRef.current = message;
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
      // 记录本轮对话对应的 actionCode，待对话完成或中断后再调用 /points/consume
      const actionCode = selectedModel === 'analyze' ? 'AI_DEEP_ANALYZE' : 'AI_BASIC_CHAT';
      currentActionCodeRef.current = actionCode;
      hasConsumedRef.current = false;

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

  // 重新生成：基于上一条用户输入再请求一次
  const handleRegenerate = async () => {
    if (isStreaming) return;
    const lastMessage = lastUserMessageRef.current;
    if (!lastMessage) return;

    if (shouldShowPointsLockBeforeSend()) {
      appendPointsLockMessage();
      return;
    }

    forceBlurAndResetViewport();

    // 生成请求 ID
    const requestId = `req_${Date.now()}`;
    currentRequestIdRef.current = requestId;

    // 添加 AI 加载消息（重新生成会新增一条 assistant 消息）
    const aiMsgId = `ai-loading-${Date.now()}`;
    currentAiMsgIdRef.current = aiMsgId;

    setSuggestedQuestions([]);
    setMessages(prev => [
      ...prev,
      {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        time: Date.now(),
        loading: true,
        requestId: requestId,
      },
    ]);

    try {
      const actionCode = selectedModel === 'analyze' ? 'AI_DEEP_ANALYZE' : 'AI_BASIC_CHAT';
      currentActionCodeRef.current = actionCode;
      hasConsumedRef.current = false;

      const lang = typeof window !== 'undefined'
        ? (localStorage.getItem('i18nextLng') || 'zh')
        : 'zh';

      let payload = {};
      if (selectedModel === 'analyze') {
        payload = {
          symbol: "BTC",
          question: lastMessage,
          lang: lang,
        };
      } else {
        payload = {
          message: lastMessage,
          lang: lang,
        };
      }

      await sendMessage(payload);
    } catch (error) {
      console.error('Regenerate failed:', error);
      if (currentAiMsgIdRef.current) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === currentAiMsgIdRef.current
              ? { ...msg, loading: false, content: t('robot.sendFailed') }
              : msg
          )
        );
      }
    }
  };

  const handleShareMessage = async (text) => {
    if (!text) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ text: String(text) });
        return;
      }
    } catch (e) {
      // 失败后回退到复制
    }

    try {
      await navigator.clipboard.writeText(String(text));
    } catch (e) {
      console.warn('[Robot] share fallback (clipboard) failed:', e);
    }
  };

  const openShareModalForMessage = (assistantMsgId) => {
    const idx = messages.findIndex((m) => m.id === assistantMsgId);
    if (idx < 0) return;

    // find nearest previous user message
    let q = '';
    for (let i = idx - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === 'user') {
        q = messages[i]?.content || '';
        break;
      }
    }
    const a = messages[idx]?.content || '';
    setShareQuestion(q);
    setShareAnswer(a);
    setShareOpen(true);
  };

  const handleToggleMic = async () => {
    if (isStreaming) return;

    if (!browserSupportsSpeechRecognition) {
      console.warn('[Robot] SpeechRecognition not supported by this browser');
      return;
    }

    if (!isMicrophoneAvailable) {
      console.warn('[Robot] microphone not available');
      return;
    }

    try {
      if (listening) {
        await SpeechRecognition.stopListening();
        return;
      }

      resetTranscript();

      // iOS: 录音开始前强制失焦，避免 viewport 缩放导致布局抖动
      forceBlurAndResetViewport();

      // 只通过 Web Speech API 拉起一次权限链路，避免 TG WebView 中重复弹权限窗
      await SpeechRecognition.startListening({
        language: 'zh-CN',
        continuous: false
      });
    } catch (e) {
      console.error('[Robot] speech recognition failed', e);
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
    // 停止生成后视为一次对话尝试，进行积分扣除
    consumeOnce('abort');
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

  const content = (
      <div className={`${styles.robotPage} ${isPC ? styles.pcMode : ''}`}>
        {isPC && (isStreaming || messages.length > 0) && (
          <div
            className={styles.pcBackBar}
            role="button"
            tabIndex={0}
            onClick={() => safeBack(router, { fallback: '/' })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                safeBack(router, { fallback: '/' });
              }
            }}
            aria-label={t('common.back')}
          >
            <span className={styles.pcBackIcon} aria-hidden="true">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className={styles.pcBackText}>
              {isStreaming ? t('robot.chattingTitle') : t('pcLayout.menu.myQA')}
            </span>
          </div>
        )}
        {!isPC && (
          <NavBar 
            title={isStreaming ? t('robot.chattingTitle') : t('pcLayout.menu.myQA')}
            showBack={true}
            className={styles.navBarCustom}
          />
        )}
        
        {/* 顶部标题/副标题/下拉模型选择（AI Assistant 区域）已移除 */}
        

        <div className={styles.chatScroll} ref={scrollRef}>
          {showUpgradePill && (
            <div className={styles.upgradePillInChatScrollWrapper}>
              <AiRobotUpgradePillButton
                onClick={() => router.push('/vip-recharge')}
                ariaLabel={t('aiAssistant.title')}
                label={t('aiAssistant.title')}
                className={styles.upgradePillNavBtn}
              />
            </div>
          )}

          {messages.length === 0 && !isBootstrappingUserData && !isStreaming && (
            <div className={styles.emptyState}>
              <div className={styles.emptyTextBlock}>
                <div
                  className={`${styles.emptyTitle} ${
                    i18n?.language?.startsWith('en') ? styles.emptyTitleEn : ''
                  }`}
                >
                  {t('home.robotBubble')}
                </div>
                <div className={styles.emptySubtitle}>{t('robot.suggestedTitle')}</div>
              </div>

              {(() => {
                // 固定展示这四个建议入口（不再依赖后端返回的 suggestedQuestions）
                const gridList = fixedSuggestedQuestions.slice(0, 5);

                // 用 svg 图标替换原本的彩色圆点
                const iconSvgs = [
                  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/chat1.svg',
                  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/chat2.svg',
                  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/chat3.svg',
                  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/chat4.svg',
                ];
                const getBtnLabel = (q) => getSuggestedQuestionDisplay(q) || q;

                return (
                  <>
                    <div className={styles.emptyGrid}>
                      {gridList.map((q, idx) => (
                        <div
                          key={`${q}-${idx}`}
                          className={styles.emptyGridBtn}
                          onClick={() => handleSuggestedQuestion(q)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSuggestedQuestion(q);
                            }
                          }}
                        >
                          <span
                            className={styles.emptyBtnIcon}
                          >
                            <img
                              className={styles.emptyBtnSvg}
                              src={iconSvgs[idx % iconSvgs.length]}
                              alt=""
                            />
                          </span>
                          <span className={styles.emptyBtnText}>{getBtnLabel(q)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className={styles.messages}>
            {messages.map((msg) => (
              <div key={msg.id} className={`${styles.msgRow} ${msg.role === 'user' ? styles.right : styles.left}`}>
                {msg.role === 'assistant' && (
                  <div className={styles.avatarCol}>
                    <img className={styles.avatar} src={BOT_AVATAR} alt={t('robot.aiAlt')} />
                  </div>
                )}

                <div className={styles.msgContent}>
                  <div
                    className={`${styles.bubble} ${
                      msg.type === 'pointsLock' ? styles.cardBubbleWrap : styles[msg.role]
                    } ${msg.error ? styles.error : ''}`}
                  >
                    <div className={styles.text}>
                      {msg.type === 'pointsLock' ? (
                        <PointsInsufficientBubble
                          currentPoints={msg.currentPoints}
                          requiredPoints={msg.requiredPoints}
                          onEarnPoints={() => router.push('/pointsdetail')}
                          onUpgrade={() => router.push('/vip-recharge')}
                        />
                      ) : msg.loading && !msg.content ? (
                        <ThinkingAnimation />
                      ) : msg.role === 'assistant' && msg.content ? (
                        <>
                          <StreamingMarkdown
                            content={msg.content}
                            isStreaming={msg.loading}
                          />
                          {msg.loading && (
                            <span className={styles.loadingDots}>...</span>
                          )}
                        </>
                      ) : (
                        msg.content || ''
                      )}
                    </div>
                  </div>

                  <div className={styles.bubbleFooter}>
                    <span
                      className={`${styles.bubbleTime} ${
                        msg.role === 'user' ? styles.bubbleTimeRight : styles.bubbleTimeLeft
                      }`}
                    >
                      {formatTime(msg.time)}
                    </span>

                    {msg.role === 'assistant' && msg.content && (
                      <div className={styles.msgActions} aria-label="message actions">
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleCopyMessage(msg.content)}
                          aria-label="copy"
                        >
                          <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/copy.svg" alt="" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={handleRegenerate}
                          aria-label="regenerate"
                        >
                          <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/reload.svg" alt="" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => openShareModalForMessage(msg.id)}
                          aria-label="share"
                        >
                          <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/share.svg" alt="" aria-hidden />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className={styles.avatarCol}>
                    <div className={styles.userAvatar}>{t('robot.me')}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* 历史记录加载遮罩层 - 只遮罩聊天区域 */}
          {isBootstrappingUserData && (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingContent}>
                <ThinkingAnimation />
                <div className={styles.loadingText}>{t('common.loading')}</div>
              </div>
            </div>
          )}
        </div>

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
            <div className={styles.inputActions}>
              <div className={styles.actionModes}>
                <div
                  className={`${styles.modeItem} ${selectedModel === 'analyze' ? styles.activeMode : ''}`}
                  onClick={() => setSelectedModel('analyze')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedModel('analyze');
                    }
                  }}
                >
                  <span className={styles.modeIconWrap}>
                    <Image
                      src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/deep.svg"
                      alt=""
                      width={11}
                      height={18}
                      className={`${styles.modeIcon} ${styles.modeIconDeep}`}
                      aria-hidden
                    />
                  </span>
                  <span className={styles.modeLabel}>{t('robot.model.analyze')}</span>
                </div>
                <div
                  className={`${styles.modeItem} ${selectedModel === 'chat' ? styles.activeMode : ''}`}
                  onClick={() => setSelectedModel('chat')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedModel('chat');
                    }
                  }}
                >
                  <span className={styles.modeIconWrap}>
                    <Image
                      src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/chat.svg"
                      alt=""
                      width={10}
                      height={10}
                      className={styles.modeIcon}
                      aria-hidden
                    />
                  </span>
                  <span className={styles.modeLabel}>{t('robot.model.chat')}</span>
                </div>
              </div>
              <div className={styles.actionTools}>
                <span className={`${styles.pointsTag} ${totalPoints === 0 ? styles.pointsTagWarning : ''}`}>
                  <Image
                    src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/point.svg"
                    alt=""
                    width={12}
                    height={12}
                    className={`${styles.pointsIcon} ${totalPoints === 0 ? styles.pointsIconWarning : ''}`}
                    aria-hidden
                  />
                  {totalPoints} {t('robot.pointsUnit')}
                </span>
                {!isTelegramEnv && (
                  <button
                    type="button"
                    className={`${styles.micBtn} ${listening ? styles.micBtnActive : ''}`}
                    aria-label="microphone"
                    onClick={handleToggleMic}
                  >
                    <Image
                      src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/micro_phone.svg"
                      alt=""
                      width={16}
                      height={16}
                      className={styles.micIcon}
                      aria-hidden
                    />
                  </button>
                )}
                {isStreaming ? (
                  <button
                    className={styles.stopBtn}
                    onClick={handleStop}
                  >
                    <Image
                      src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pause.svg"
                      alt={t('robot.stopAlt')}
                      width={14}
                      height={14}
                      className={styles.pauseIcon}
                    />
                  </button>
                ) : (
                  <button
                    className={styles.sendBtn}
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim()}
                  >
                    <Image
                      src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/send.svg"
                      alt=""
                      width={18}
                      height={18}
                      className={styles.sendIcon}
                      aria-hidden
                    />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* 登录提示弹窗 */}
        <PopLogin
          visible={showPopLogin}
          onClose={() => setShowPopLogin(false)}
          onLoginSuccess={handleLoginSuccess}
        />

        <ShareAiChatModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          question={shareQuestion}
          answer={shareAnswer}
        />
      </div>
  );

  if (!mounted) return null;

  if (isPC) {
    return (
      <PCLayout>
        {content}
      </PCLayout>
    );
  }

  return content;
}
