import { useState, useRef, useCallback } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';

/**
 * SSE 流式输出 Hook (Robot Test 专用 - 支持 POST)
 */
export function useRobotTestSSE(url, options = {}) {
  const {
    onStart = () => {},
    onChunk = () => {},
    onComplete = () => {},
    onError = () => {},
    /** SSE data: { type: "suggestions", suggestions: [{ id, suggestion }] } */
    onSuggestions = () => {},
    /** 大单侦测：event: thinking */
    onThinking = () => {},
    /** 大单侦测：event: toolcall */
    onToolCall = () => {},
    /** 大单侦测：event: toolresult */
    onToolResult = () => {},
    headers = {},
    getToken = null,
  } = options;

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  
  const abortControllerRef = useRef(null);
  const accumulatedContentRef = useRef('');
  const lastEventDataRef = useRef(null);
  const finishRef = useRef(false);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const sendMessage = useCallback(async (payload) => {
    if (isStreaming) {
      abort();
    }

    setError(null);
    accumulatedContentRef.current = '';
    lastEventDataRef.current = null;
    finishRef.current = false;
    
    abortControllerRef.current = new AbortController();
    setIsStreaming(true);

    try {
      // 从 localStorage 获取 i18next 语言设置
      const getLanguage = () => {
        if (typeof window !== 'undefined') {
          return localStorage.getItem('i18nextLng') || navigator.language || 'en';
        }
        return 'en';
      };

      // 支持 headers 为函数，实现动态获取
      const dynamicHeaders = typeof headers === 'function' ? headers() : headers;
      const requestHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Accept-Language': getLanguage(),
        ...dynamicHeaders,
      };

      if (getToken) {
        const token = getToken();
        if (token) {
          requestHeaders['authentication'] = token;
        }
      }

      onStart();

      // 自动添加 language 参数到 payload
      const payloadWithLanguage = {
        ...payload,
        language: getLanguage(),
      };

      // 如果 payload 中已经包含 lang，则不自动添加 language，避免重复
      if (payload.lang) {
        delete payloadWithLanguage.language;
      }

      await fetchEventSource(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(payloadWithLanguage),
        signal: abortControllerRef.current.signal,
        openWhenHidden: true,
        async onopen(response) {
          if (response.ok) {
            return;
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        },
        onmessage(msg) {
          const { event, data } = msg;
          try {
            const eventData = data ? JSON.parse(data) : {};

            // 兼容两种格式：
            // 1. 标准 SSE: event 字段在 SSE 协议层，数据在 data 字段
            // 2. 自定义 JSON: event/type 字段在 JSON 数据内部 (data: {"type": "chunk", "data": "..."})
            const messageType = eventData.type || event || 'message';

            const finishStream = () => {
              if (finishRef.current) return;
              finishRef.current = true;
              setIsStreaming(false);
              const fullContent = accumulatedContentRef.current;
              const finalEventData =
                eventData && Object.keys(eventData).length > 0 ? eventData : lastEventDataRef.current;
              onComplete(fullContent, finalEventData);
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
            };

            const appendTextDelta = (delta) => {
              if (!delta) return;
              accumulatedContentRef.current += delta;
              lastEventDataRef.current = eventData;
              onChunk(delta, accumulatedContentRef.current, eventData);
            };

            if (messageType === 'start') {
              lastEventDataRef.current = eventData;
              // 如果 start 事件也包含文本内容，尝试提取
              if (typeof eventData.data === 'string' && eventData.data) {
                accumulatedContentRef.current += eventData.data;
                onChunk(eventData.data, accumulatedContentRef.current, eventData);
              }
            } else if (messageType === 'stream' || messageType === 'chunk') {
              // 尝试获取增量内容
              // 优先级: delta (OpenAI 风格) > data (用户日志风格) > content (通用回落)
              let delta = '';
              if (typeof eventData.delta === 'string') {
                delta = eventData.delta;
              } else if (typeof eventData.data === 'string' && messageType === 'chunk') {
                delta = eventData.data;
              } else if (typeof eventData.content === 'string') {
                delta = eventData.content;
              }

              appendTextDelta(delta);
            } else if (messageType === 'content') {
              // 大单侦测：event: content, data: {"text": "..."}
              const delta =
                typeof eventData.text === 'string'
                  ? eventData.text
                  : typeof eventData.data === 'string'
                    ? eventData.data
                    : '';
              appendTextDelta(delta);
            } else if (
              messageType === 'complete' ||
              messageType === 'end' ||
              messageType === 'finish' ||
              messageType === 'done'
            ) {
              finishStream();
            } else if (messageType === 'thinking') {
              try {
                onThinking(eventData);
              } catch (cbErr) {
                console.warn('[useRobotTestSSE] onThinking error:', cbErr);
              }
            } else if (messageType === 'toolcall') {
              try {
                onToolCall(eventData);
              } catch (cbErr) {
                console.warn('[useRobotTestSSE] onToolCall error:', cbErr);
              }
            } else if (messageType === 'toolresult') {
              try {
                onToolResult(eventData);
              } catch (cbErr) {
                console.warn('[useRobotTestSSE] onToolResult error:', cbErr);
              }
            } else if (messageType === 'suggestions') {
              const list = Array.isArray(eventData.suggestions) ? eventData.suggestions : [];
              try {
                onSuggestions(list, eventData);
              } catch (cbErr) {
                console.warn('[useRobotTestSSE] onSuggestions error:', cbErr);
              }
            } else if (messageType === 'error') {
              throw new Error(eventData.message || 'SSE stream error');
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        },
        onclose() {
          // 服务器关闭连接，抛出错误以停止重试
          throw new Error('Server closed connection');
        },
        onerror(err) {
          // 抛出错误以停止重试
          throw err;
        }
      });

    } catch (err) {
      if (err.name === 'AbortError') {
        setIsStreaming(false);
        // 如果是因为完成而触发的 Abort，已经在 onmessage 中处理了 onComplete，这里不需要再处理
        // 如果是用户手动点击停止触发的 Abort，也不需要调用 onComplete
        return accumulatedContentRef.current;
      }

      if (err.message === 'Server closed connection') {
        // 服务器主动关闭连接，视为完成（若已由 done/complete 处理则跳过）
        if (!finishRef.current) {
          finishRef.current = true;
          setIsStreaming(false);
          const fullContent = accumulatedContentRef.current;
          const finalEventData = lastEventDataRef.current;
          onComplete(fullContent, finalEventData);
        }
        return accumulatedContentRef.current;
      }

      setError(err);
      setIsStreaming(false);
      abortControllerRef.current = null;
      
      onError(err);
      
      // 不再重新抛出
    }
  }, [
    headers,
    getToken,
    onStart,
    onChunk,
    onComplete,
    onError,
    onSuggestions,
    onThinking,
    onToolCall,
    onToolResult,
    abort,
    isStreaming,
    url,
  ]);

  return {
    sendMessage,
    isStreaming,
    error,
    abort,
  };
}
