import { useState, useRef, useCallback } from 'react';

/**
 * SSE 流式输出 Hook
 * @param {string} url - API 端点 URL
 * @param {object} options - 配置选项
 * @returns {object} - { sendMessage, isStreaming, error, abort }
 */
export function useSSEStream(url, options = {}) {
  const {
    onStart = () => {},           // 开始接收流时的回调
    onChunk = () => {},            // 接收到数据块时的回调 (chunk, accumulated, eventData)
    onComplete = () => {},         // 流完成时的回调 (fullContent, eventData)
    onError = () => {},            // 错误时的回调 (error)
    headers = {},                  // 自定义请求头
    getToken = null,               // 获取 token 的函数
  } = options;

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  
  const abortControllerRef = useRef(null);
  const accumulatedContentRef = useRef('');
  const lastEventDataRef = useRef(null); // 保存最后一个事件数据

  /**
   * 中止当前请求
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      console.log('🛑 SSE 流已中止');
    }
  }, []);

  /**
   * 发送消息并接收流式响应
   * @param {object} payload - 请求体数据
   * @returns {Promise<string>} - 返回完整内容
   */
  const sendMessage = useCallback(async (payload) => {
    // 如果正在流式传输，先中止
    if (isStreaming) {
      abort();
    }

    // 重置状态
    setError(null);
    accumulatedContentRef.current = '';
    lastEventDataRef.current = null;
    
    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();
    setIsStreaming(true);

    try {
      // 准备请求头
      const requestHeaders = {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        ...headers,
      };

      // 如果提供了 getToken 函数，添加 authentication 头
      if (getToken) {
        const token = getToken();
        if (token) {
          requestHeaders['authentication'] = token;
        }
      }

      // 触发开始回调
      onStart();

      // 发送请求
      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 读取流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; // 用于存储未完成的 SSE 消息

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ SSE 流式响应完成');
          break;
        }

        // 解码数据块并添加到缓冲区
        buffer += decoder.decode(value, { stream: true });

        // 按行分割处理 SSE 消息
        const lines = buffer.split('\n');
        // 保留最后一个可能不完整的行
        buffer = lines.pop() || '';

        let currentEvent = null;
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            // 解析事件类型
            currentEvent = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            // 解析数据
            currentData = line.substring(5).trim();
          } else if (line === '') {
            // 空行表示一个完整的 SSE 消息结束
            if (currentEvent && currentData) {
              try {
                const eventData = JSON.parse(currentData);
                console.log(`📨 SSE Event: ${currentEvent}`, eventData);

                // 根据事件类型处理
                if (currentEvent === 'start') {
                  // 开始事件
                  console.log('🤖 AI 开始回复:', eventData);
                  lastEventDataRef.current = eventData;
                } else if (currentEvent === 'stream') {
                  // 流式内容事件
                  if (eventData.delta) {
                    accumulatedContentRef.current += eventData.delta;
                  } else if (eventData.content) {
                    accumulatedContentRef.current = eventData.content;
                  }
                  lastEventDataRef.current = eventData;
                  // 触发数据块回调
                  onChunk(eventData.delta || '', accumulatedContentRef.current, eventData);
                } else if (currentEvent === 'complete') {
                  // 完成事件 - 直接使用 fullContent
                  if (eventData.fullContent) {
                    accumulatedContentRef.current = eventData.fullContent;
                  }
                  lastEventDataRef.current = eventData;
                  console.log('✅ AI 回复完成:', eventData);
                } else if (currentEvent === 'error') {
                  // 错误事件
                  console.error('❌ SSE 错误事件:', eventData);
                  throw new Error(eventData.message || 'SSE stream error');
                }
              } catch (parseError) {
                console.error('❌ 解析 SSE 数据失败:', parseError, currentData);
              }

              // 重置当前事件和数据
              currentEvent = null;
              currentData = '';
            }
          }
        }
      }

      // 完成
      const fullContent = accumulatedContentRef.current;
      const finalEventData = lastEventDataRef.current;
      setIsStreaming(false);
      abortControllerRef.current = null;
      
      // 触发完成回调
      onComplete(fullContent, finalEventData);
      
      return fullContent;

    } catch (err) {
      // 如果是主动中止，不算错误
      if (err.name === 'AbortError') {
        console.log('🛑 请求已被中止');
        setIsStreaming(false);
        return accumulatedContentRef.current;
      }

      // 其他错误
      console.error('❌ SSE 流式请求错误:', err);
      setError(err);
      setIsStreaming(false);
      abortControllerRef.current = null;
      
      // 触发错误回调
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
