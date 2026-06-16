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

      const payloadWithLanguage = includeLanguage
        ? {
            ...payload,
            ...(payload.lang ? {} : { language: getLanguage() }),
          }
        : { ...payload };

      if (payload.lang && payloadWithLanguage.language) {
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
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        },
        onmessage(msg) {
          const { event, data } = msg;
          try {
            const eventData = data ? JSON.parse(data) : {};
            const messageType = event || eventData.event || eventData.type || 'message';
            const dataType = eventData.data_type;

            const finishStream = () => {
              if (finishRef.current) return;
              finishRef.current = true;
              setIsStreaming(false);
              const fullContent = accumulatedContentRef.current;
              const rawFinal =
                eventData && Object.keys(eventData).length > 0 ? eventData : lastEventDataRef.current;
              const finalEventData = normalizeEventData(rawFinal);
              onComplete(fullContent, finalEventData);
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
            };

            const rememberEvent = (nextEventData) => {
              const normalized = normalizeEventData(nextEventData);
              lastEventDataRef.current = {
                ...(lastEventDataRef.current || {}),
                ...normalized,
              };
              return normalized;
            };

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
              finishStream();
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
              try {
                onSignalCard(eventData);
              } catch (cbErr) {
                console.warn('[useRobotTestSSE] onSignalCard error:', cbErr);
              }
              return;
            }

            if (messageType === 'error') {
              throw new Error(
                eventData.message || eventData.errorMsg || eventData.error || 'SSE stream error'
              );
            }
          } catch (e) {
            console.error('SSE message error:', e);
            throw e;
          }
        },
        onclose() {
          throw new Error('Server closed connection');
        },
        onerror(err) {
          throw err;
        },
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        setIsStreaming(false);
        return accumulatedContentRef.current;
      }

      if (err.message === 'Server closed connection') {
        if (!finishRef.current) {
          finishRef.current = true;
          setIsStreaming(false);
          const fullContent = accumulatedContentRef.current;
          const finalEventData = normalizeEventData(lastEventDataRef.current);
          onComplete(fullContent, finalEventData);
        }
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
