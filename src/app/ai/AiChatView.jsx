'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Markdown from 'markdown-to-jsx';
import NavBar from '../../components/NavBar';
import ThinkingAnimation from '../../components/ThinkingAnimation';
import PopLogin from '../../components/PopLogin';
import { trackEvent, trackPageView, AIEvents } from '@/utils/amplitude';
import { executeConsume } from '@/api/points';
import { useRobotTestSSE, isStreamErrorPayload, extractStreamErrorMessage } from '@/hooks/useRobotTestSSE';
import { extractCoinSymbolFromText } from '@/utils/extractCoinSymbolFromText';
import {
  normalizeSuggestionItems,
  TRADE_SUGGESTION_ID,
  withTradeSuggestion,
} from '@/utils/normalizeSuggestionItems';
import ExchangePickerModal from '@/components/ExchangePickerModal';
import { forceBlurAndResetViewport } from '@/utils/iosViewportFix';
import { fetchUserDataInfoOnce } from '@/utils/postLogin';
import { consumePcAiFromSearch, consumePcAiNav } from '@/utils/pcAiFromSearch';
import { notifyRouteBootReady } from '@/utils/routeBootLoading';
import { notifyAiConversationsChanged } from '@/utils/aiConversationEvents';
import {
  getAgentConversationMessages,
  normalizeAgentConversationMessages,
  extractSuggestedQuestionsFromAgentMessages,
  normalizeSignalCardPayload,
} from '@/api/ai';
import styles from './page.module.less';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import AiRobotUpgradePillButton from '@/components/AiRobotUpgradePillButton';
import FireSignalBanner from '@/components/FireSignalBanner';
import PointsInsufficientBubble from '@/components/PointsInsufficientBubble';
import ShareAiChatModal from '@/components/ShareAiChatModal';
import SignalCardCarousel from '@/components/SignalCardCarousel';
import MobileAiHistoryDrawer from './MobileAiHistoryDrawer';
import { fetchLatestScanCache } from '@/api/signals';
import {
  getLocalizedMockAlphaSignalCards,
} from '@/data/mockAlphaSignalCards';

const AGENT_STREAM_API = '/api/ai/agent/stream';
const ROBOT_MODEL_IDS = ['analyze', 'chat', 'signals', 'bigorder'];

function isValidConversationId(value) {
  if (!value || typeof value !== 'string') return false;
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ||
    /^conv_/i.test(value)
  );
}

function createAgentRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createConversationId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function buildAgentPayload(message, type, conversationId, includeConversationId) {
  return {
    request_id: createAgentRequestId(),
    type,
    message,
    ...(includeConversationId && conversationId ? { conversation_id: conversationId } : {}),
  };
}

/** 首轮不传 conversation_id，本地先生成；从第二轮起带上同一 id */
function prepareAgentPayload(message, type, conversationIdRef, sessionAgentSendCountRef) {
  if (sessionAgentSendCountRef.current === 0) {
    conversationIdRef.current = createConversationId();
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai_conversation_id', conversationIdRef.current);
    }
  }

  const includeConversationId = sessionAgentSendCountRef.current >= 1;
  const payload = buildAgentPayload(
    message,
    type,
    conversationIdRef.current,
    includeConversationId
  );
  sessionAgentSendCountRef.current += 1;
  return payload;
}
const GRADE_ORDER = { S: 0, A: 1, B: 2, C: 3 };

function getGradeRank(item) {
  const grade = String(item?.card?.grade || '').toUpperCase();
  return GRADE_ORDER[grade] ?? 99;
}

function sortSignalCardsByGrade(cards = []) {
  return [...cards].sort((a, b) => {
    const gradeDiff = getGradeRank(a) - getGradeRank(b);
    if (gradeDiff !== 0) return gradeDiff;

    const confA = Number(a?.card?.confidence) || 0;
    const confB = Number(b?.card?.confidence) || 0;
    if (confB !== confA) return confB - confA;

    return String(a?.card?.coin || '').localeCompare(String(b?.card?.coin || ''));
  });
}

function getMessageSignalCards(msg) {
  if (Array.isArray(msg?.signalCards) && msg.signalCards.length > 0) {
    return msg.signalCards;
  }
  if (msg?.signalCard) {
    return [msg.signalCard];
  }
  return [];
}

function getSignalCardsFromCache(cache) {
  if (!cache) return [];
  const results = Array.isArray(cache.results) ? cache.results : [];
  const displays = Array.isArray(cache.displays) ? cache.displays : [];

  const cards = results
    .map((item, idx) => {
      if (item?.card) {
        return {
          ...item,
          display: item.display || displays[idx] || '',
        };
      }
      return {
        card: item,
        math: item.math,
        strategy: item.strategy,
        display: displays[idx] || '',
      };
    })
    .filter((item) => item?.card?.coin);

  return sortSignalCardsByGrade(cards);
}

function buildAlphaScanReply(cache, t) {
  if (!cache) return '';
  const totalCoins = cache.totalCoins ?? '--';
  const signalCount = cache.signalCount ?? '--';
  const scanTimeMs = Number(cache.scanTime);
  let scanTimeText = '';
  if (Number.isFinite(scanTimeMs)) {
    if (scanTimeMs >= 60000) {
      scanTimeText = t('signalCard.scanReply.scanMinutes', {
        minutes: (scanTimeMs / 60000).toFixed(1),
      });
    } else if (scanTimeMs >= 1000) {
      scanTimeText = t('signalCard.scanReply.scanSeconds', {
        seconds: (scanTimeMs / 1000).toFixed(1),
      });
    }
  }

  return [
    t('signalCard.scanReply.intro', { totalCoins }),
    scanTimeText,
    t('signalCard.scanReply.signalsFound', { signalCount }),
    t('signalCard.scanReply.footer'),
  ].join('');
}

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
  const textContent =
    typeof content === 'string'
      ? content
      : content == null
        ? ''
        : typeof content === 'object' && typeof content.data === 'string'
          ? content.data
          : String(content);

  if (!textContent) return null;

  const lines = useMemo(() => textContent.split('\n'), [textContent]);

  const completedLines = useMemo(() => {
    if (!isStreaming) return textContent;
    if (lines.length <= 1) return '';
    return lines.slice(0, -1).join('\n');
  }, [textContent, isStreaming, lines]);

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
      return <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{textContent}</div>;
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
      {textContent}
    </Markdown>
  );
};

export default function AiChatView({ isPC: propIsPC = false, routeConversationId = null }) {
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

  useEffect(() => {
    if (!mounted || scanCacheRequestRef.current) return;
    scanCacheRequestRef.current = true;

    let cancelled = false;
    fetchLatestScanCache().then((data) => {
      if (!cancelled && data) setScanCache(data);
    });

    return () => {
      cancelled = true;
    };
  }, [mounted]);

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
  const [scanCache, setScanCache] = useState(null);
  const scanCacheRequestRef = useRef(false);
  const displaySuggestedQuestions = useMemo(
    () => withTradeSuggestion(suggestedQuestions),
    [suggestedQuestions]
  );
  const [exchangePickerOpen, setExchangePickerOpen] = useState(false);
  const [tradePickerSymbol, setTradePickerSymbol] = useState('BTC');
  // 模型选择状态：PC 为三个独立按钮，移动端为下拉面板
  const [selectedModel, setSelectedModel] = useState('analyze'); // 'analyze' | 'chat' | 'signals' | 'bigorder'
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [shareQuestion, setShareQuestion] = useState('');
  const [shareAnswer, setShareAnswer] = useState('');

  // 当前模型单次对话所需积分（大单侦测与对话模型同档）
  const requiredPointsPerAsk = selectedModel === 'analyze' ? 50 : 10;

  const modelMenuRef = useRef(null);

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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isHistoryOverlayExiting, setIsHistoryOverlayExiting] = useState(false);
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

  useEffect(() => {
    if (!mounted || isBootstrappingUserData) return undefined;
    const startTs = Date.now();
    const timer = window.setTimeout(() => {
      notifyRouteBootReady();
    }, Math.max(0, 250 - (Date.now() - startTs)));
    return () => window.clearTimeout(timer);
  }, [mounted, isBootstrappingUserData]);

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
  /** 当前会话已发送 Agent 请求次数：0=下一条为首轮（不传 conversation_id） */
  const sessionAgentSendCountRef = useRef(0);
  const messageIdRef = useRef(null);
  const lastUserMessageRef = useRef(null); // 用于“重新生成”
  const pcSearchAutoSentRef = useRef(false);
  const historyRevealPendingRef = useRef(false);
  const historyRevealTimerRef = useRef(null);
  const pcNavAutoSentRef = useRef(false);
  const handleSendRef = useRef(null);
  const abortControllerRef = useRef(null);
  const pendingUrlConversationIdRef = useRef(null);
  const currentActionCodeRef = useRef(null); // 本轮对话对应的积分扣除动作
  const hasConsumedRef = useRef(false); // 防止重复调用 /points/consume
  const userAbortedRef = useRef(false); // 用户手动停止后，忽略后续 SSE 回调
  // const [isStreaming, setIsStreaming] = useState(false); // 使用 hook 中的 isStreaming

  // 加载聊天历史记录
  useEffect(() => {
    if (routeConversationId && !isValidConversationId(routeConversationId)) {
      router.replace('/ai');
      return undefined;
    }

    if (!routeConversationId) {
      setIsLoadingHistory(false);
      return undefined;
    }

    if (pendingUrlConversationIdRef.current === routeConversationId) {
      pendingUrlConversationIdRef.current = null;
      setIsLoadingHistory(false);
      return undefined;
    }

    if (DEBUG_SKIP_CHAT_HISTORY_LOAD) {
      setIsLoadingHistory(false);
      return undefined;
    }

    let cancelled = false;

    setIsLoadingHistory(true);
    setIsHistoryOverlayExiting(false);
    setMessages([]);
    setSuggestedQuestions([]);
    sessionAgentSendCountRef.current = 0;

    const finishHistoryLoading = (hasContent) => {
      if (cancelled) return;

      if (!hasContent) {
        setIsLoadingHistory(false);
        setIsHistoryOverlayExiting(false);
        return;
      }

      historyRevealPendingRef.current = true;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;

          const el = scrollRef.current;
          if (el) {
            el.scrollTop = el.scrollHeight;
          }

          setIsHistoryOverlayExiting(true);

          if (historyRevealTimerRef.current) {
            window.clearTimeout(historyRevealTimerRef.current);
          }

          historyRevealTimerRef.current = window.setTimeout(() => {
            if (cancelled) return;
            setIsLoadingHistory(false);
            setIsHistoryOverlayExiting(false);
            historyRevealTimerRef.current = null;
          }, 200);
        });
      });
    };

    const loadChatHistory = async () => {
      try {
        conversationIdRef.current = routeConversationId;
        if (typeof window !== 'undefined') {
          localStorage.setItem('ai_conversation_id', routeConversationId);
        }

        console.log('🔍 检查历史记录 conversationId:', routeConversationId);

        const data = await getAgentConversationMessages(routeConversationId);
        if (cancelled) return;

        console.log('📦 历史记录数据:', data);

        if (data?.code === 0) {
          const historyMessages = normalizeAgentConversationMessages(data, routeConversationId);

          console.log('✅ 加载了', historyMessages.length, '条历史消息');

          if (historyMessages.length > 0) {
            setMessages(historyMessages);

            const resolvedConversationId =
              data?.data?.conversationId ||
              data?.data?.conversation_id ||
              routeConversationId;
            if (resolvedConversationId) {
              conversationIdRef.current = resolvedConversationId;
              if (typeof window !== 'undefined') {
                localStorage.setItem('ai_conversation_id', resolvedConversationId);
              }
            }
            sessionAgentSendCountRef.current = 1;

            const suggested = extractSuggestedQuestionsFromAgentMessages(data);
            if (suggested.length > 0) {
              const norm = normalizeSuggestionItems(suggested);
              setSuggestedQuestions(norm);
              console.log('✅ 加载了', norm.length, '个建议问题');
            } else {
              setSuggestedQuestions([]);
            }

            finishHistoryLoading(true);
            return;
          }

          setMessages([]);
          setSuggestedQuestions([]);
          finishHistoryLoading(false);
        } else {
          console.log('⚠️ 数据格式不符合预期或无历史记录:', data);
          setMessages([]);
          setSuggestedQuestions([]);
          finishHistoryLoading(false);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('❌ 加载聊天历史失败:', error);
        setMessages([]);
        setSuggestedQuestions([]);
        finishHistoryLoading(false);
      }
    };

    void loadChatHistory();

    return () => {
      cancelled = true;
      if (historyRevealTimerRef.current) {
        window.clearTimeout(historyRevealTimerRef.current);
        historyRevealTimerRef.current = null;
      }
      setIsHistoryOverlayExiting(false);
    };
  }, [routeConversationId, router]);

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

      // 积分同步与 datainfo 刷新不阻塞其它接口（如会话列表）
      fetchUserDataInfoOnce({
        force: true,
        caller: 'RobotPage_consumeOnce_afterConversation',
      })
        .then((latest) => {
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
        })
        .catch((syncErr) => {
          console.warn('[Robot] sync latest totalPoints failed:', syncErr);
        });
    } catch (err) {
      console.error('[Robot] points consume failed:', err, { actionCode, reason });
    }
  };

  const patchCurrentAiMessage = useCallback((patch) => {
    if (userAbortedRef.current) return;
    const msgId = currentAiMsgIdRef.current;
    if (!msgId) return;
    setMessages((prev) =>
      prev.map((msg) => (msg.id === msgId ? { ...msg, ...patch } : msg))
    );
  }, []);

  const handleSignalCardEvent = useCallback(
    (eventData) => {
      if (userAbortedRef.current) return;
      const raw = eventData?.data ?? eventData?.payload ?? eventData;
      const payload = normalizeSignalCardPayload(raw);
      if (!payload) return;
      const msgId = currentAiMsgIdRef.current;
      if (!msgId) return;
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== msgId) return msg;
          const existing = msg.signalCards || (msg.signalCard ? [msg.signalCard] : []);
          return {
            ...msg,
            signalCard: undefined,
            signalCards: [...existing, payload],
            loading: true,
          };
        })
      );
    },
    []
  );

  const markCurrentMessageAborted = useCallback(() => {
    const msgId = currentAiMsgIdRef.current;
    if (!msgId) return;
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === msgId
          ? {
              ...msg,
              loading: false,
              statusHint: '',
              aborted: true,
            }
          : msg
      )
    );
    currentAiMsgIdRef.current = null;
  }, []);

  // Agent SSE 流式对话（chat / analyze / signals / bigorder 统一接口）
  const { sendMessage, isStreaming, abort } = useRobotTestSSE(AGENT_STREAM_API, {
    includeLanguage: false,
    getToken: () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null),
    onSuggestions: (list) => {
      const norm = normalizeSuggestionItems(list);
      if (norm.length > 0) {
        setSuggestedQuestions(norm);
      }
    },
    onSignalCard: handleSignalCardEvent,
    onThinking: () => {
      patchCurrentAiMessage({
        statusHint: t('robot.bigorder.analyzing'),
        loading: true,
      });
    },
    onToolCall: (data) => {
      const coin = data?.args?.coin || data?.coin || '';
      const tool = data?.tool || data?.name || '';
      patchCurrentAiMessage({
        statusHint: coin
          ? t('robot.bigorder.toolCall', { tool, coin })
          : t('robot.bigorder.toolCallGeneric', { tool: tool || 'tool' }),
        loading: true,
      });
    },
    onToolResult: () => {
      patchCurrentAiMessage({
        statusHint: t('robot.bigorder.generating'),
        loading: true,
      });
    },
    onChunk: (chunk, accumulated, eventData) => {
      if (userAbortedRef.current) return;
      if (currentAiMsgIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === currentAiMsgIdRef.current
              ? {
                  ...msg,
                  content: accumulated,
                  loading: true,
                  statusHint: currentActionCodeRef.current === null ? msg.statusHint : '',
                  conversationId:
                    eventData?.conversationId ||
                    eventData?.conversation_id ||
                    msg.conversationId,
                  messageId: eventData?.messageId || msg.messageId,
                }
              : msg
          )
        );

        if (eventData?.messageId) {
          messageIdRef.current = eventData.messageId;
        }
      }
    },
    onComplete: async (fullContent, eventData) => {
      if (userAbortedRef.current) return;
      if (isStreamErrorPayload(eventData)) {
        const errorMessage = extractStreamErrorMessage(eventData) || t('robot.sendFailed');
        if (currentAiMsgIdRef.current) {
          const msgId = currentAiMsgIdRef.current;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === msgId
                ? {
                    ...msg,
                    content: errorMessage,
                    loading: false,
                    statusHint: '',
                    error: true,
                  }
                : msg
            )
          );
        }
        currentAiMsgIdRef.current = null;
        return;
      }
      if (currentAiMsgIdRef.current) {
        const msgId = currentAiMsgIdRef.current;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === msgId
              ? {
                  ...msg,
                  content:
                    fullContent ||
                    (currentActionCodeRef.current === null ? t('robot.genericError') : ''),
                  loading: false,
                  statusHint: '',
                  tokens: eventData?.tokens,
                  conversationId:
                    eventData?.conversationId ||
                    eventData?.conversation_id ||
                    msg.conversationId,
                  messageId: eventData?.messageId || msg.messageId,
                }
              : msg
          )
        );
      }
      currentAiMsgIdRef.current = null;

      if (eventData?.suggestedQuestions?.length) {
        setSuggestedQuestions(normalizeSuggestionItems(eventData.suggestedQuestions));
      }

      trackEvent(AIEvents.RESPONSE_RECEIVED, {
        requestId: currentRequestIdRef.current,
        responseLength: (fullContent || '').length,
        conversationId: eventData?.conversationId || eventData?.conversation_id,
        messageId: eventData?.messageId,
        tokens: eventData?.tokens,
      });

      notifyAiConversationsChanged();

      if (currentActionCodeRef.current !== null) {
        void consumeOnce('complete');
      }
    },
    onError: (err) => {
      if (userAbortedRef.current) return;
      const errorMessage = err?.message || t('robot.sendFailed');
      const targetId = currentAiMsgIdRef.current;
      setMessages((prev) => {
        if (targetId) {
          return prev.map((msg) =>
            msg.id === targetId
              ? {
                  ...msg,
                  content: errorMessage,
                  loading: false,
                  statusHint: '',
                  error: true,
                }
              : msg
          );
        }
        for (let i = prev.length - 1; i >= 0; i -= 1) {
          const msg = prev[i];
          if (msg.role === 'assistant' && msg.loading) {
            return prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    content: errorMessage,
                    loading: false,
                    statusHint: '',
                    error: true,
                  }
                : item
            );
          }
        }
        return prev;
      });
      currentAiMsgIdRef.current = null;
    },
  });

  const isBusy = isStreaming;

  // 右上角 “AI Assistant Pro” 升级胶囊：只在空状态展示，开始对话后隐藏
  // 放在这里是为了确保 `isBootstrappingUserData` / `isStreaming` 已初始化
  const showUpgradePill = messages.length === 0 && !isBootstrappingUserData && !isBusy && !isLoadingHistory;
  const isMobileEmpty = !isPC && showUpgradePill;
  const alphaAlertCount = scanCache?.signalCount ?? 3;
  
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

  /** 移动端模型下拉：点击外部关闭 */
  useEffect(() => {
    if (isPC || !modelMenuOpen) return undefined;
    const onDocMouseDown = (event) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target)) {
        setModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [isPC, modelMenuOpen]);

  /** 移动端模型下拉：Escape 关闭 */
  useEffect(() => {
    if (!modelMenuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setModelMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modelMenuOpen]);

  /** 请求进行中关闭下拉，避免状态错乱 */
  useEffect(() => {
    if (isBusy) setModelMenuOpen(false);
  }, [isBusy]);

  /** 切到 PC 布局时收起移动端下拉 */
  useEffect(() => {
    if (isPC) setModelMenuOpen(false);
  }, [isPC]);

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

  // 自动滚动到底部（历史记录切换时已在遮罩下预定位，避免二次跳动）
  useEffect(() => {
    if (historyRevealPendingRef.current) {
      historyRevealPendingRef.current = false;
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    });
  }, [messages, displaySuggestedQuestions]);

  /** 与底部积分展示一致：优先用扣减后的 remainingPoints，否则用 userData 的 totalPoints */
  const getEffectivePoints = () => {
    if (typeof remainingPoints === 'number') return remainingPoints;
    if (typeof totalPoints === 'number') return totalPoints;
    return null;
  };

  /** 输入框发送 / 快捷提示词 / 重新生成 共用：积分不足以支付当前模式单次消耗时拦截 */
  const shouldShowPointsLockBeforeSend = () => {
    if (!ENABLE_POINTS_LIMIT) return false;
    if (selectedModel === 'bigorder') return false;
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
    if (!message || isBusy || isLoadingHistory) return;

    userAbortedRef.current = false;

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

    const payload = prepareAgentPayload(
      message,
      selectedModel,
      conversationIdRef,
      sessionAgentSendCountRef
    );
    currentRequestIdRef.current = payload.request_id;

    if (!routeConversationId && conversationIdRef.current) {
      pendingUrlConversationIdRef.current = conversationIdRef.current;
      router.replace(`/ai/${conversationIdRef.current}`, { scroll: false });
    }

    // 添加 AI 加载消息
    const aiMsgId = `ai-loading-${Date.now()}`;
    currentAiMsgIdRef.current = aiMsgId;
    
    setMessages(prev => [...prev, {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      time: Date.now(),
      loading: true,
      requestId: payload.request_id,
      agentType: selectedModel,
    }]);

    try {
      if (selectedModel === 'bigorder') {
        currentActionCodeRef.current = null;
      } else {
        currentActionCodeRef.current =
          selectedModel === 'analyze' ? 'AI_DEEP_ANALYZE' : 'AI_BASIC_CHAT';
        hasConsumedRef.current = false;
      }

      await sendMessage(payload);
    } catch (error) {
      // 发送消息失败
      console.error('Send message failed:', error);
    }
  };

  handleSendRef.current = handleSend;

  /** 右侧 Alpha 信号面板：使用初次加载的扫描缓存，在对话区展示信号列表 */
  const handleAlphaSignalViewMore = useCallback(() => {
    if (isBusy || isBootstrappingUserData) return;
    if (shouldShowPointsLockBeforeSend()) {
      appendPointsLockMessage();
      return;
    }

    forceBlurAndResetViewport();
    setSelectedModel('signals');
    setSuggestedQuestions([]);

    const cards = getSignalCardsFromCache(scanCache);
    const alphaQuery = t('signalCard.alphaQuery');
    const reply = scanCache
      ? buildAlphaScanReply(scanCache, t)
      : t('signalCard.alphaMockReply');
    const signalCards = cards.length ? cards : getLocalizedMockAlphaSignalCards(t);

    const now = Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${now}`,
        role: 'user',
        content: alphaQuery,
        time: now,
      },
      {
        id: `ai-${now + 1}`,
        role: 'assistant',
        content: reply,
        signalCards: signalCards,
        signalCardsAfterText: true,
        time: now + 1,
        loading: false,
      },
    ]);

    trackEvent(AIEvents.QUESTION_SENT, {
      question: alphaQuery,
      questionLength: alphaQuery.length,
      isSuggestedQuestion: true,
      source: 'alpha_signal_panel',
      timestamp: now,
    });
  }, [isBusy, isBootstrappingUserData, scanCache, t]);

  // 发现页行情表等：跳转 /ai 并自动切换模型、发送首条提问
  useEffect(() => {
    if (!mounted || isBootstrappingUserData) return;
    if (pcNavAutoSentRef.current) return;

    const payload = consumePcAiNav();
    if (!payload?.message) return;

    pcNavAutoSentRef.current = true;
    pcSearchAutoSentRef.current = true;
    if (payload.model) setSelectedModel(payload.model);

    const timer = window.setTimeout(() => {
      handleSendRef.current?.(payload.message);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [mounted, isBootstrappingUserData]);

  // PC 顶栏：搜索框输入币种后点「AI问答」→ 自动以「{币种}的综合分析」发起对话
  useEffect(() => {
    if (!mounted || !isPC || isBootstrappingUserData) return;
    if (pcSearchAutoSentRef.current || pcNavAutoSentRef.current) return;

    const payload = consumePcAiFromSearch();
    if (!payload?.symbol) return;

    pcSearchAutoSentRef.current = true;
    setSelectedModel('analyze');
    const question = t('robot.suggest.comprehensiveAnalysis', { symbol: payload.symbol });

    const timer = window.setTimeout(() => {
      handleSendRef.current?.(question);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [mounted, isPC, isBootstrappingUserData, t]);

  // 重新生成：基于上一条用户输入再请求一次
  const handleRegenerate = async () => {
    if (isBusy) return;
    const lastMessage = lastUserMessageRef.current;
    if (!lastMessage) return;

    if (shouldShowPointsLockBeforeSend()) {
      appendPointsLockMessage();
      return;
    }

    forceBlurAndResetViewport();
    userAbortedRef.current = false;

    // 生成请求 ID（与 Agent payload 保持一致）
    const payload = prepareAgentPayload(
      lastMessage,
      selectedModel,
      conversationIdRef,
      sessionAgentSendCountRef
    );
    currentRequestIdRef.current = payload.request_id;

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
        requestId: payload.request_id,
        agentType: selectedModel,
      },
    ]);

    try {
      if (selectedModel === 'bigorder') {
        currentActionCodeRef.current = null;
      } else {
        currentActionCodeRef.current =
          selectedModel === 'analyze' ? 'AI_DEEP_ANALYZE' : 'AI_BASIC_CHAT';
        hasConsumedRef.current = false;
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
    if (isBusy) return;

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
    userAbortedRef.current = true;

    if (!isStreaming) return;

    abort();
    markCurrentMessageAborted();
    if (currentActionCodeRef.current !== null) {
      consumeOnce('abort');
    }
  };

  const handleNewConversation = useCallback(() => {
    if (isStreaming) {
      userAbortedRef.current = true;
      abort();
    }

    conversationIdRef.current = null;
    sessionAgentSendCountRef.current = 0;
    messageIdRef.current = null;
    currentAiMsgIdRef.current = null;
    currentRequestIdRef.current = null;
    currentActionCodeRef.current = null;
    hasConsumedRef.current = false;
    userAbortedRef.current = false;
    lastUserMessageRef.current = null;
    pendingUrlConversationIdRef.current = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('ai_conversation_id');
    }

    setMessages([]);
    setSuggestedQuestions([]);
    setInputValue('');
    setShowPointsLock(false);
    setIsLoadingHistory(false);
    setIsHistoryOverlayExiting(false);
    router.replace('/ai', { scroll: false });
  }, [abort, isStreaming, router]);

  const showNewChatBtn =
    !isLoadingHistory && (messages.length > 0 || isBusy || !!routeConversationId);

  const getTradeSymbolFromMessages = () => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const content = String(messages[i]?.content || '');
      if (!content) continue;
      const symbol = extractCoinSymbolFromText(content);
      if (symbol) return symbol;
    }
    return 'BTC';
  };

  const handleSelectExchange = (exchangeId) => {
    const map = {
      binance: 'https://www.bsmkweb.cc/register?ref=195208591',
      okx: 'https://www.growthhivex.com/join/12214659',
      bitget:
        'https://www.nlviwq.cn/zh-CN/referral/register?clacCode=0YL9JUZB&from=%2Fzh-CN%2Fevents%2Freferral-all-program&source=events&utmSource=PremierInviter',
      gate: 'https://www.gateport.biz/zh/signup/BQNCA1pf?ref_type=103',
    };
    const target = map[exchangeId];
    if (!target) return;
    window.open(target, '_blank', 'noopener,noreferrer');
    setExchangePickerOpen(false);
  };

  const handleOpenTradePicker = () => {
    setTradePickerSymbol(getTradeSymbolFromMessages());
    setExchangePickerOpen(true);
  };

  // 点击建议问题
  const handleSuggestedQuestion = (question) => {
    handleSend(question);
  };

  const handleSuggestedItemClick = (item) => {
    const id = typeof item === 'object' && item?.id != null ? item.id : '';
    if (id === TRADE_SUGGESTION_ID) {
      handleOpenTradePicker();
      return;
    }
    const text = typeof item === 'string' ? item : item?.text ?? '';
    if (text) handleSuggestedQuestion(text);
  };

  const getSuggestedQuestionDisplay = (question) => {
    if (!question) return '';
    const comprehensiveMatch = question.match(/^(.+?)的综合分析$/);
    if (comprehensiveMatch) {
      const symbol = comprehensiveMatch[1].trim();
      return t('robot.suggest.comprehensiveAnalysis', { symbol });
    }
    const comprehensiveEnMatch = question.match(/^Comprehensive analysis of (.+)$/i);
    if (comprehensiveEnMatch) {
      const symbol = comprehensiveEnMatch[1].trim();
      return t('robot.suggest.comprehensiveAnalysis', { symbol });
    }
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

  const robotModelLabel = (id) => {
    if (id === 'analyze') return t('robot.model.analyze');
    if (id === 'chat') return t('robot.model.chat');
    if (id === 'signals') return t('robot.model.signals');
    return t('robot.model.bigOrder');
  };

  const renderRobotModelIcon = (modelId) => {
    if (modelId === 'analyze') {
      return (
        <span className={styles.modeIconWrap}>
          <svg
            className={`${styles.modeIcon} ${styles.modeIconDeep}`}
            viewBox="0 0 11 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M5.2593 13.504C5.1713 12.984 4.9393 12.424 4.5633 11.824C4.1873 11.216 3.6513 10.652 2.9553 10.132C2.2673 9.612 1.5793 9.28 0.891297 9.136V8.632C1.5713 8.472 2.2233 8.176 2.8473 7.744C3.4793 7.304 4.0073 6.776 4.4313 6.16C4.8633 5.528 5.1393 4.904 5.2593 4.288H5.7633C5.8353 4.688 5.9793 5.1 6.1953 5.524C6.4113 5.94 6.6873 6.34 7.0233 6.724C7.3673 7.1 7.7513 7.44 8.1753 7.744C8.8073 8.192 9.4513 8.488 10.1073 8.632V9.136C9.6673 9.224 9.2113 9.404 8.7393 9.676C8.2753 9.948 7.8433 10.272 7.4433 10.648C7.0433 11.016 6.7153 11.404 6.4593 11.812C6.0833 12.412 5.8513 12.976 5.7633 13.504H5.2593Z"
              fill="currentColor"
            />
          </svg>
        </span>
      );
    }
    if (modelId === 'chat') {
      return (
        <span className={styles.modeIconWrap}>
          <svg
            className={styles.modeIcon}
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M5.22729 5.79545H3.18184C2.93184 5.79545 2.72729 6 2.72729 6.25C2.72729 6.5 2.93184 6.70455 3.18184 6.70455H5.22729C5.47729 6.70455 5.68184 6.5 5.68184 6.25C5.68184 6 5.47729 5.79545 5.22729 5.79545ZM6.8182 3.75H3.18184C2.93184 3.75 2.72729 3.95455 2.72729 4.20455C2.72729 4.45455 2.93184 4.65909 3.18184 4.65909H6.8182C7.0682 4.65909 7.27275 4.45455 7.27275 4.20455C7.27275 3.95455 7.0682 3.75 6.8182 3.75Z"
              fill="currentColor"
            />
            <path
              d="M5 0C2.25 0 0 2.25 0 5V7.95455C0 9.09091 0.909091 10 2.04545 10H5C7.75 10 10 7.75 10 5C10 2.25 7.75 0 5 0ZM5 9.09091H2.04545C1.40909 9.09091 0.909091 8.59091 0.909091 7.95455V5C0.909091 2.75 2.75 0.909091 5 0.909091C7.25 0.909091 9.09091 2.75 9.09091 5C9.09091 7.25 7.25 9.09091 5 9.09091Z"
              fill="currentColor"
            />
          </svg>
        </span>
      );
    }
    if (modelId === 'signals') {
      return (
        <span className={styles.modeIconWrap}>
          <svg
            className={`${styles.modeIcon} ${styles.modeIconSignals}`}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M7 14l3-3 3 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    }
    return (
      <span className={styles.modeIconWrap}>
        <svg
          className={`${styles.modeIcon} ${styles.modeIconBigOrder}`}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M3 12h3l2-5 3 10 2-8 3 6h4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  };

  const content = (
      <div className={`${styles.robotPage} ${isPC ? styles.pcMode : ''}`}>
        {isPC && !isLoadingHistory && (isBusy || messages.length > 0 || !!routeConversationId) && (
          <div className={styles.pcTopBar}>
            <button
              type="button"
              className={styles.newChatBtn}
              onClick={handleNewConversation}
              aria-label={t('robot.newConversation')}
            >
              <span className={styles.newChatIcon} aria-hidden />
              <span>{t('robot.newConversation')}</span>
            </button>
          </div>
        )}
        {!isPC && (
          <NavBar
            title={isBusy ? t('robot.chattingTitle') : t('pcLayout.menu.myQA')}
            showBack={true}
            className={styles.navBarCustom}
            backgroundColor="transparent"
            leftExtra={
              <button
                type="button"
                className={styles.historyMenuBtn}
                onClick={() => setHistoryDrawerOpen(true)}
                aria-label={t('pcLayout.menu.myQA')}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            }
            rightContent={
              showNewChatBtn ? (
                <button
                  type="button"
                  className={`${styles.newChatBtn} ${styles.newChatBtnMobile}`}
                  onClick={handleNewConversation}
                  aria-label={t('robot.newConversation')}
                >
                  <span className={styles.newChatIcon} aria-hidden />
                  <span>{t('robot.newConversation')}</span>
                </button>
              ) : null
            }
          />
        )}
        {!isPC && (
          <MobileAiHistoryDrawer
            open={historyDrawerOpen}
            onClose={() => setHistoryDrawerOpen(false)}
            activeConversationId={routeConversationId}
          />
        )}
        
        {/* 顶部标题/副标题/下拉模型选择（AI Assistant 区域）已移除 */}

        <div className={isPC ? styles.pcBody : styles.mobileBody}>
        {isPC && showUpgradePill ? (
          <div className={styles.pcUpgradeRow}>
            <AiRobotUpgradePillButton
              onClick={() => router.push('/vip-recharge')}
              ariaLabel={t('aiAssistant.title')}
              label={t('aiAssistant.title')}
              className={styles.pcUpgradeBtn}
            />
          </div>
        ) : null}
        <div className={isPC ? styles.pcChatColumn : styles.mobileChatColumn}>
        <div className={`${styles.chatShell} ${isPC ? styles.pcChatRail : ''}`}>
        {showUpgradePill && !isPC ? (
          <div className={styles.mobileUpgradeRow}>
            <AiRobotUpgradePillButton
              onClick={() => router.push('/vip-recharge')}
              ariaLabel={t('aiAssistant.title')}
              label={t('aiAssistant.title')}
              className={styles.mobileUpgradeBtn}
            />
          </div>
        ) : null}
        <div
          className={`${styles.chatScroll} ${isMobileEmpty ? styles.chatScrollEmpty : ''}`}
          ref={scrollRef}
        >
          {messages.length === 0 && !isBootstrappingUserData && !isBusy && !isLoadingHistory && (
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

          <div
            className={`${styles.messages} ${
              isLoadingHistory && !isHistoryOverlayExiting && messages.length > 0
                ? styles.messagesWhileLoading
                : ''
            } ${
              messages.length > 0 && (!isLoadingHistory || isHistoryOverlayExiting)
                ? styles.messagesHistoryReveal
                : ''
            }`}
          >
            {messages.map((msg) => {
              const messageSignalCards = getMessageSignalCards(msg);
              const hasCards = messageSignalCards.length > 0;
              const signalCardFirst =
                msg.agentType === 'signals' && hasCards && !msg.signalCardsAfterText;

              const textBlock = msg.content || msg.error ? (
                <div
                  className={`${styles.bubble} ${styles.assistant} ${
                    msg.error ? styles.error : ''
                  } ${msg.aborted ? styles.aborted : ''}`}
                >
                  <div className={styles.text}>
                    <StreamingMarkdown
                      content={msg.content || t('robot.sendFailed')}
                      isStreaming={msg.loading}
                    />
                    {msg.loading ? <span className={styles.loadingDots}>...</span> : null}
                  </div>
                </div>
              ) : null;

              const cardsBlock = hasCards ? (
                <SignalCardCarousel cards={messageSignalCards} isPC={isPC} />
              ) : null;

              return (
              <div key={msg.id} className={`${styles.msgRow} ${msg.role === 'user' ? styles.right : styles.left}`}>
                {msg.role === 'assistant' && (
                  <div className={styles.avatarCol}>
                    <img className={styles.avatar} src={BOT_AVATAR} alt={t('robot.aiAlt')} />
                  </div>
                )}

                <div
                  className={`${styles.msgContent} ${
                    hasCards ? styles.msgContentCarousel : ''
                  }`}
                >
                  {msg.role === 'user' ? (
                    <div className={`${styles.bubble} ${styles.user}`}>
                      <div className={styles.text}>{msg.content}</div>
                    </div>
                  ) : (
                    <>
                      {msg.type === 'pointsLock' ? (
                        <div className={`${styles.bubble} ${styles.cardBubbleWrap}`}>
                          <div className={styles.text}>
                            <PointsInsufficientBubble
                              currentPoints={msg.currentPoints}
                              requiredPoints={msg.requiredPoints}
                              onEarnPoints={() => router.push('/pointsdetail')}
                              onUpgrade={() => router.push('/vip-recharge')}
                            />
                          </div>
                        </div>
                      ) : msg.aborted && !msg.content && !hasCards ? (
                        <div className={`${styles.bubble} ${styles.assistant} ${styles.aborted}`}>
                          <div className={styles.text}>
                            <div className={styles.abortedText}>
                              {t('robot.conversationAborted', { defaultValue: '对话已中止' })}
                            </div>
                          </div>
                        </div>
                      ) : msg.loading &&
                        !msg.content &&
                        !msg.error &&
                        !hasCards ? (
                        <div className={`${styles.bubble} ${styles.assistant} ${styles.bubbleLoading}`}>
                          <div className={styles.text}>
                            {msg.statusHint ? (
                              <div className={styles.bigorderStatus}>
                                <ThinkingAnimation size={28} />
                                <span>{msg.statusHint}</span>
                              </div>
                            ) : (
                              <ThinkingAnimation />
                            )}
                          </div>
                        </div>
                      ) : null}

                      {msg.statusHint &&
                      !(
                        msg.loading &&
                        !msg.content &&
                        !hasCards
                      ) ? (
                        <div className={styles.bigorderStatus}>{msg.statusHint}</div>
                      ) : null}

                      {signalCardFirst ? cardsBlock : null}
                      {textBlock}
                      {!signalCardFirst ? cardsBlock : null}
                    </>
                  )}

                  <div className={styles.bubbleFooter}>
                    <span
                      className={`${styles.bubbleTime} ${
                        msg.role === 'user' ? styles.bubbleTimeRight : styles.bubbleTimeLeft
                      }`}
                    >
                      {formatTime(msg.time)}
                    </span>

                    {msg.role === 'assistant' && (msg.content || hasCards) && (
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
              );
            })}
          </div>

          {!isBusy && !isLoadingHistory && messages.length > 0 && displaySuggestedQuestions.length > 0 && (
            <div className={styles.suggestedQuestions}>
              <div className={styles.suggestedTitle}>{t('robot.suggestedFollowUpTitle')}</div>
              <div className={styles.suggestedList}>
                {displaySuggestedQuestions.map((item, idx) => {
                  const isTradeCta = item.id === TRADE_SUGGESTION_ID;
                  const text = item?.text ?? '';
                  if (!isTradeCta && !text) return null;
                  const label = getSuggestedQuestionDisplay(text) || text;
                  const key = item.id || `${idx}-${text.slice(0, 24)}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`${styles.suggestedBtn} ${isTradeCta ? styles.suggestedBtnTrade : ''}`}
                      disabled={isBusy}
                      onClick={() => handleSuggestedItemClick(item)}
                    >
                      {isTradeCta ? (
                        <>
                          <span>{t('robot.suggest.goTradeEarn')}</span>
                          <span className={styles.suggestedTradeArrow} aria-hidden>
                            →
                          </span>
                        </>
                      ) : (
                        label
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* 历史记录加载遮罩层 - 只遮罩聊天区域 */}
          {(isLoadingHistory || isHistoryOverlayExiting) && (
            <div
              className={`${styles.loadingOverlay} ${
                isHistoryOverlayExiting ? styles.loadingOverlayExit : ''
              }`}
            >
              <div className={styles.loadingContent}>
                <ThinkingAnimation />
                <div className={styles.loadingText}>{t('common.loading')}</div>
              </div>
            </div>
          )}

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
          <div
            className={`${styles.chatInputBarStack} ${
              showUpgradePill && !isPC ? styles.chatInputBarStackWithBanner : ''
            }`}
          >
            <div className={styles.inputBoxWrap}>
            {showUpgradePill ? (
              <FireSignalBanner
                compact={isPC}
                shortSub={!isPC}
                count={alphaAlertCount}
                onClick={handleAlphaSignalViewMore}
                className={styles.inputFireBanner}
              />
            ) : null}
            <div className={styles.inputBox}>
            <input
              className={styles.input}
              value={inputValue}
              placeholder={t('robot.inputPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && !isBusy && !isLoadingHistory && handleSend()}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => trackEvent(AIEvents.INPUT_FOCUSED)}
              disabled={isBusy || isLoadingHistory}
            />
            <div className={styles.inputActions}>
              <div className={styles.actionModes}>
                {isPC ? (
                  <>
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
                      {renderRobotModelIcon('analyze')}
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
                      {renderRobotModelIcon('chat')}
                      <span className={styles.modeLabel}>{t('robot.model.chat')}</span>
                    </div>
                    <div
                      className={`${styles.modeItem} ${selectedModel === 'signals' ? styles.activeMode : ''}`}
                      onClick={() => setSelectedModel('signals')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedModel('signals');
                        }
                      }}
                    >
                      {renderRobotModelIcon('signals')}
                      <span className={styles.modeLabel}>{t('robot.model.signals')}</span>
                    </div>
                    <div
                      className={`${styles.modeItem} ${selectedModel === 'bigorder' ? styles.activeMode : ''}`}
                      onClick={() => setSelectedModel('bigorder')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedModel('bigorder');
                        }
                      }}
                    >
                      {renderRobotModelIcon('bigorder')}
                      <span className={styles.modeLabel}>{t('robot.model.bigOrder')}</span>
                    </div>
                  </>
                ) : (
                  <div className={styles.modeDropdownWrap} ref={modelMenuRef}>
                    <button
                      type="button"
                      className={`${styles.modeDropdownTrigger} ${modelMenuOpen ? styles.modeDropdownTriggerOpen : ''} ${isBusy ? styles.modeDropdownTriggerDisabled : ''}`}
                      disabled={isBusy}
                      aria-expanded={modelMenuOpen}
                      aria-haspopup="listbox"
                      aria-label={t('robot.model.openMenu')}
                      onClick={() => setModelMenuOpen((o) => !o)}
                    >
                      <span className={styles.modeDropdownTriggerInner}>
                        {renderRobotModelIcon(selectedModel)}
                        <span className={styles.modeDropdownTriggerText}>{robotModelLabel(selectedModel)}</span>
                        <span className={styles.modeDropdownCaret} aria-hidden>
                          ▾
                        </span>
                      </span>
                    </button>
                    {modelMenuOpen && (
                      <div className={styles.modeDropdownPanel} role="listbox">
                        {ROBOT_MODEL_IDS.map((id) => (
                          <button
                            key={id}
                            type="button"
                            role="option"
                            aria-selected={selectedModel === id}
                            className={`${styles.modeDropdownOption} ${selectedModel === id ? styles.modeDropdownOptionActive : ''}`}
                            onClick={() => {
                              setSelectedModel(id);
                              setModelMenuOpen(false);
                            }}
                          >
                            {renderRobotModelIcon(id)}
                            <span className={styles.modeDropdownOptionLabel}>{robotModelLabel(id)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
                {isBusy ? (
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
        </div>
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
          shareUrl={
            typeof window !== 'undefined'
              ? (() => {
                  const id = routeConversationId || conversationIdRef.current;
                  return id
                    ? `${window.location.origin}/ai/${id}`
                    : `${window.location.origin}/ai`;
                })()
              : 'https://www.moziai.xyz/ai'
          }
        />

        <ExchangePickerModal
          open={exchangePickerOpen}
          symbol={tradePickerSymbol}
          onClose={() => setExchangePickerOpen(false)}
          onSelect={handleSelectExchange}
        />
      </div>
  );

  if (!mounted) return null;

  return content;
}
