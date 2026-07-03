import { useState, useRef, useCallback } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';

function getConversationId(eventData) {
  return eventData?.conversation_id || eventData?.conversationId || null;
}

function normalizeEventData(eventData) {
  if (!eventData || typeof eventData !== 'object') return eventData;
  const conversationId = getConversationId(eventData);
  if (conversationId && !eventData.conversationId) {
    return { ...eventData, conversationId };
  }
  return eventData;
}

function parseEventPayload(data) {
  if (!data) return {};
  if (typeof data === 'object') return data;
  const raw = String(data).trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function extractStreamErrorMessage(eventData) {
  if (!eventData || typeof eventData !== 'object') return '';
  return (
    eventData.message ||
    eventData.errorMsg ||
    eventData.error ||
    eventData.msg ||
    ''
  );
}

export function isStreamErrorPayload(eventData, sseEvent = '') {
  if (!eventData || typeof eventData !== 'object') return false;
  const payloadEvent = String(eventData.event || eventData.type || '').toLowerCase();
  const sse = String(sseEvent || '').toLowerCase();
  if (payloadEvent === 'error' || sse === 'error') return true;
  const code = Number(eventData.code);
  return Number.isFinite(code) && code >= 4000;
}

function resolveMessageType(eventData, sseEvent = '') {
  const payloadEvent = eventData?.event || eventData?.type || '';
  const normalizedSseEvent = sseEvent && sseEvent !== 'message' ? sseEvent : '';
  return payloadEvent || normalizedSseEvent || sseEvent || 'message';
}

/**
 * SSE 流式输出 Hook (支持 POST)
 * 兼容 Agent SSE（/ai/agent/stream）与旧 Robot SSE 格式
 */
export function useRobotTestSSE(url, options = {}) {
  const {
    onStart = () => {},
    onChunk = () => {},
    onComplete = () => {},
    onError = () => {},
    onConversationId = () => {},
    onSuggestions = () => {},
    onSignalCard = () => {},
    onThinking = () => {},
    onToolCall = () => {},
    onToolResult = () => {},
    headers = {},
    getToken = null,
    includeLanguage = true,
  } = options;

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const accumulatedContentRef = useRef('');
  const lastEventDataRef = useRef(null);
  const lastConversationIdRef = useRef(null);
  const finishRef = useRef(false);
  const streamFailedRef = useRef(false);

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
    lastConversationIdRef.current = null;
    finishRef.current = false;
    streamFailedRef.current = false;

    abortControllerRef.current = new AbortController();
    setIsStreaming(true);

    try {
      const getLanguage = () => {
        if (typeof window !== 'undefined') {
          return localStorage.getItem('i18nextLng') || navigator.language || 'en';
        }
        return 'en';
      };

      const dynamicHeaders = typeof headers === 'function' ? headers() : headers;
      const requestHeaders = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'Accept-Language': getLanguage(),
        ...dynamicHeaders,
      };

      if (getToken) {
        const token = getToken();
        if (token) {
          requestHeaders.authentication = token;
        }
      }

      onStart();

      const failStream = (errorMessage) => {
        if (finishRef.current || streamFailedRef.current) return;
        streamFailedRef.current = true;
        finishRef.current = true;
        setIsStreaming(false);
        const err = new Error(errorMessage || 'SSE stream error');
        setError(err);
        onError(err);
        if (abortControllerRef.current) {
          const controller = abortControllerRef.current;
          abortControllerRef.current = null;
          window.setTimeout(() => controller.abort(), 0);
        }
      };

      const finishStream = (eventData) => {
        if (finishRef.current) return;
        finishRef.current = true;
        setIsStreaming(false);
        const fullContent = accumulatedContentRef.current;
        const rawFinal =
          eventData && Object.keys(eventData).length > 0 ? eventData : lastEventDataRef.current;
        const finalEventData = normalizeEventData(rawFinal);
        onComplete(fullContent, finalEventData);
        if (abortControllerRef.current) {
          const controller = abortControllerRef.current;
          abortControllerRef.current = null;
          window.setTimeout(() => controller.abort(), 0);
        }
      };

      const payloadWithLanguage = includeLanguage
        ? {
            ...payload,
            ...(payload.lang ? {} : { language: getLanguage() }),
          }
        : { ...payload };

      if (payload.lang && payloadWithLanguage.language) {
        delete payloadWithLanguage.language;
      }

      if (payloadWithLanguage?.type === 'signals') {
        console.log('[信号卡] 请求参数:', payloadWithLanguage);
      }

      const streamTimeoutMs = 120000;
      const streamTimeoutId = window.setTimeout(() => {
        if (!finishRef.current && !streamFailedRef.current) {
          failStream('SSE stream timeout');
        }
      }, streamTimeoutMs);

      try {
        await fetchEventSource(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(payloadWithLanguage),
        signal: abortControllerRef.current.signal,
        openWhenHidden: true,
        async onopen(response) {
          if (response.ok) {
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        },
        onmessage(msg) {
          const { event, data } = msg;
          try {
            const eventData = parseEventPayload(data);
            const messageType = resolveMessageType(eventData, event);
            const dataType = eventData.data_type;

            const rememberEvent = (nextEventData) => {
              const normalized = normalizeEventData(nextEventData);
              lastEventDataRef.current = {
                ...(lastEventDataRef.current || {}),
                ...normalized,
              };
              const conversationId = getConversationId(normalized);
              if (conversationId && conversationId !== lastConversationIdRef.current) {
                lastConversationIdRef.current = conversationId;
                try {
                  onConversationId(conversationId, normalized);
                } catch (cbErr) {
                  console.warn('[useRobotTestSSE] onConversationId error:', cbErr);
                }
              }
              return normalized;
            };

            rememberEvent(eventData);

            if (isStreamErrorPayload(eventData, event)) {
              failStream(extractStreamErrorMessage(eventData) || 'SSE stream error');
              return;
            }

            const appendTextDelta = (delta) => {
              if (!delta) return;
              accumulatedContentRef.current += delta;
              const normalized = rememberEvent(eventData);
              onChunk(delta, accumulatedContentRef.current, normalized);
            };

            const handleToolDebug = (payload) => {
              const debugPayload = payload || eventData;
              const stage = String(debugPayload?.stage || eventData.stage || '').toLowerCase();
              try {
                if (stage.includes('result')) {
                  onToolResult(debugPayload);
                } else if (stage.includes('tool') || stage.includes('call')) {
                  onToolCall(debugPayload);
                } else {
                  onThinking(debugPayload);
                }
              } catch (cbErr) {
                console.warn('[useRobotTestSSE] tool_debug error:', cbErr);
              }
            };

            if (messageType === 'error') {
              failStream(extractStreamErrorMessage(eventData) || 'SSE stream error');
              return;
            }

            if (messageType === 'start') {
              rememberEvent(eventData);
              if (typeof eventData.data === 'string' && eventData.data) {
                appendTextDelta(eventData.data);
              }
              return;
            }

            if (messageType === 'delta') {
              if (dataType === 'chat') {
                appendTextDelta(eventData.delta);
                return;
              }
              if (dataType === 'signal_card') {
                rememberEvent(eventData);
                console.log('[信号卡] SSE delta:', eventData);
                try {
                  onSignalCard({
                    ...eventData,
                    data: eventData.payload,
                    payload: eventData.payload,
                  });
                } catch (cbErr) {
                  console.warn('[useRobotTestSSE] onSignalCard error:', cbErr);
                }
                return;
              }
              if (dataType === 'suggestions') {
                const list = Array.isArray(eventData.payload) ? eventData.payload : [];
                try {
                  onSuggestions(list, eventData);
                } catch (cbErr) {
                  console.warn('[useRobotTestSSE] onSuggestions error:', cbErr);
                }
                return;
              }
              if (dataType === 'tool_debug') {
                rememberEvent(eventData);
                handleToolDebug(eventData.payload);
                return;
              }
            }

            if (
              messageType === 'complete' ||
              messageType === 'end' ||
              messageType === 'finish' ||
              messageType === 'done'
            ) {
              rememberEvent(eventData);
              finishStream(eventData);
              return;
            }

            if (messageType === 'stream' || messageType === 'chunk') {
              let delta = '';
              if (typeof eventData.delta === 'string') {
                delta = eventData.delta;
              } else if (typeof eventData.data === 'string' && messageType === 'chunk') {
                delta = eventData.data;
              } else if (typeof eventData.content === 'string') {
                delta = eventData.content;
              }
              appendTextDelta(delta);
              return;
            }

            if (messageType === 'content') {
              const delta =
                typeof eventData.text === 'string'
                  ? eventData.text
                  : typeof eventData.data === 'string'
                    ? eventData.data
                    : '';
              appendTextDelta(delta);
              return;
            }

            if (messageType === 'thinking') {
              try {
                onThinking(eventData);
              } catch (cbErr) {
                console.warn('[useRobotTestSSE] onThinking error:', cbErr);
              }
              return;
            }

            if (messageType === 'toolcall') {
              try {
                onToolCall(eventData);
              } catch (cbErr) {
                console.warn('[useRobotTestSSE] onToolCall error:', cbErr);
              }
              return;
            }

            if (messageType === 'toolresult') {
              try {
                onToolResult(eventData);
              } catch (cbErr) {
                console.warn('[useRobotTestSSE] onToolResult error:', cbErr);
              }
              return;
            }

            if (messageType === 'suggestions') {
              const list = Array.isArray(eventData.suggestions)
                ? eventData.suggestions
                : Array.isArray(eventData.payload)
                  ? eventData.payload
                  : [];
              try {
                onSuggestions(list, eventData);
              } catch (cbErr) {
                console.warn('[useRobotTestSSE] onSuggestions error:', cbErr);
              }
              return;
            }

            if (messageType === 'signal_card') {
              console.log('[信号卡] SSE message:', eventData);
              try {
                onSignalCard(eventData);
              } catch (cbErr) {
                console.warn('[useRobotTestSSE] onSignalCard error:', cbErr);
              }
              return;
            }
          } catch (e) {
            console.error('SSE message error:', e);
            failStream(e?.message || 'SSE stream error');
          }
        },
        onclose() {
          if (streamFailedRef.current || finishRef.current) {
            return;
          }

          const pendingError = extractStreamErrorMessage(lastEventDataRef.current);
          if (isStreamErrorPayload(lastEventDataRef.current)) {
            failStream(pendingError || 'SSE stream error');
            return;
          }

          if (!accumulatedContentRef.current) {
            failStream(pendingError || 'SSE stream error');
            return;
          }

          finishStream(lastEventDataRef.current);
        },
        onerror(err) {
          if (streamFailedRef.current || finishRef.current) {
            throw err;
          }
          failStream(err?.message || 'SSE stream error');
          throw err;
        },
      });
      } finally {
        window.clearTimeout(streamTimeoutId);
      }
    } catch (err) {
      if (streamFailedRef.current || finishRef.current) {
        return accumulatedContentRef.current;
      }

      if (err.name === 'AbortError') {
        setIsStreaming(false);
        return accumulatedContentRef.current;
      }

      setError(err);
      setIsStreaming(false);
      abortControllerRef.current = null;
      onError(err);
    }
  }, [
    headers,
    getToken,
    includeLanguage,
    onStart,
    onChunk,
    onComplete,
    onError,
    onConversationId,
    onSuggestions,
    onSignalCard,
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
