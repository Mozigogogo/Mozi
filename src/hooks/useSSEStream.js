import { useState, useRef, useCallback } from 'react';

/**
 * SSE 流式输出 Hook
 */
export function useSSEStream(url, options = {}) {
  const {
    onStart = () => {},
    onChunk = () => {},
    onComplete = () => {},
    onError = () => {},
    headers = {},
    getToken = null,
  } = options;

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  
  const abortControllerRef = useRef(null);
  const accumulatedContentRef = useRef('');
  const lastEventDataRef = useRef(null);

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

      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(payloadWithLanguage),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = null;
      let currentData = '';
      let isCompleted = false;

      while (true) {
        if (isCompleted) break;
        
        const { done, value } = await reader.read();
        
        if (done) {
          // 流结束，处理剩余 buffer
          if (buffer.trim()) {
            const remainingLines = buffer.split('\n');
            for (const line of remainingLines) {
              if (line.startsWith('event:')) {
                currentEvent = line.substring(6).trim();
              } else if (line.startsWith('data:')) {
                currentData = line.substring(5).trim();
              }
            }
            
            if (currentEvent && currentData) {
              try {
                const eventData = JSON.parse(currentData);
                if (currentEvent === 'complete') {
                  if (eventData.fullContent) {
                    accumulatedContentRef.current = eventData.fullContent;
                  }
                  lastEventDataRef.current = eventData;
                }
              } catch (e) {
                // ignore
              }
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            currentData = line.substring(5).trim();
          } else if (line === '' && currentEvent && currentData) {
            try {
              const eventData = JSON.parse(currentData);

              if (currentEvent === 'start') {
                lastEventDataRef.current = eventData;
              } else if (currentEvent === 'stream') {
                if (eventData.delta) {
                  accumulatedContentRef.current += eventData.delta;
                } else if (eventData.content) {
                  accumulatedContentRef.current = eventData.content;
                }
                lastEventDataRef.current = eventData;
                onChunk(eventData.delta || '', accumulatedContentRef.current, eventData);
              } else if (currentEvent === 'complete') {
                if (eventData.fullContent) {
                  accumulatedContentRef.current = eventData.fullContent;
                }
                lastEventDataRef.current = eventData;
                // complete 事件收到后，标记完成并跳出
                isCompleted = true;
                reader.cancel().catch(() => {});
              } else if (currentEvent === 'error') {
                throw new Error(eventData.message || 'SSE stream error');
              }
              
              currentEvent = null;
              currentData = '';
            } catch (parseError) {
              currentEvent = null;
              currentData = '';
            }
          }
        }
      }

      const fullContent = accumulatedContentRef.current;
      const finalEventData = lastEventDataRef.current;
      setIsStreaming(false);
      abortControllerRef.current = null;
      
      // 调用完成回调
      onComplete(fullContent, finalEventData);
      
      return fullContent;

    } catch (err) {
      if (err.name === 'AbortError') {
        setIsStreaming(false);
        return accumulatedContentRef.current;
      }

      setError(err);
      setIsStreaming(false);
      abortControllerRef.current = null;
      
      onError(err);
      
      throw err;
    }
  }, [url, headers, getToken, isStreaming, abort, onStart, onChunk, onComplete, onError]);

  return {
    sendMessage,
    isStreaming,
    error,
    abort,
  };
}
