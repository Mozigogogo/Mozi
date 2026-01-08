'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * WebSocket Hook
 * @param {string} url - WebSocket 服务器地址
 * @param {object} options - 配置选项
 * @param {function} options.onMessage - 消息回调
 * @param {function} options.onOpen - 连接成功回调
 * @param {function} options.onClose - 连接关闭回调
 * @param {function} options.onError - 错误回调
 * @param {boolean} options.autoConnect - 是否自动连接，默认 true
 * @param {number} options.reconnectInterval - 重连间隔（毫秒），默认 5000
 * @param {number} options.reconnectAttempts - 最大重连次数，默认 5，设为 -1 表示无限重连
 * @param {number} options.heartbeatInterval - 心跳间隔（毫秒），默认 30000，设为 0 禁用心跳
 * @param {string} options.heartbeatMessage - 心跳消息，默认 'ping'
 */
export const useWebSocket = (url, options = {}) => {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    autoConnect = true,
    reconnectInterval = 5000,
    reconnectAttempts = 5,
    heartbeatInterval = 30000,
    heartbeatMessage = 'ping'
  } = options;

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const reconnectCountRef = useRef(0);
  
  // 使用 ref 保存回调函数，避免依赖变化
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);
  
  const [readyState, setReadyState] = useState(WebSocket.CONNECTING);
  const [lastMessage, setLastMessage] = useState(null);
  
  // 更新回调 ref
  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  }, [onMessage, onOpen, onClose, onError]);

  // 清除重连定时器
  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // 清除心跳定时器
  const clearHeartbeatTimer = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // 启动心跳
  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      clearHeartbeatTimer();
      heartbeatTimerRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(heartbeatMessage);
        }
      }, heartbeatInterval);
    }
  }, [heartbeatInterval, heartbeatMessage, clearHeartbeatTimer]);

  // 重连
  const reconnect = useCallback(() => {
    if (reconnectAttempts !== -1 && reconnectCountRef.current >= reconnectAttempts) {
      return;
    }

    clearReconnectTimer();
    reconnectTimerRef.current = setTimeout(() => {
      reconnectCountRef.current++;
      connect();
    }, reconnectInterval);
  }, [reconnectInterval, reconnectAttempts]);

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (!url) {
      console.error('[WebSocket] URL 不能为空');
      return;
    }

    // 关闭现有连接
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = (event) => {
        setReadyState(WebSocket.OPEN);
        reconnectCountRef.current = 0;
        clearReconnectTimer();
        startHeartbeat();
        onOpenRef.current?.(event);
      };

      ws.onmessage = (event) => {
        setLastMessage(event.data);
        onMessageRef.current?.(event.data);
      };

      ws.onerror = (event) => {
        console.error('[WebSocket] 连接错误:', event);
        setReadyState(WebSocket.CLOSING);
        onErrorRef.current?.(event);
      };

      ws.onclose = (event) => {
        setReadyState(WebSocket.CLOSED);
        clearHeartbeatTimer();
        onCloseRef.current?.(event);

        // 非正常关闭时尝试重连
        if (event.code !== 1000 && event.code !== 1001) {
          reconnect();
        }
      };
    } catch (error) {
      console.error('[WebSocket] 创建连接失败:', error);
      setReadyState(WebSocket.CLOSED);
      reconnect();
    }
  }, [url, reconnect, startHeartbeat, clearHeartbeatTimer, clearReconnectTimer]);

  // 发送消息
  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      wsRef.current.send(data);
      return true;
    } else {
      console.warn('[WebSocket] 连接未就绪，无法发送消息');
      return false;
    }
  }, []);

  // 手动断开连接
  const disconnect = useCallback(() => {
    clearReconnectTimer();
    clearHeartbeatTimer();
    if (wsRef.current) {
      wsRef.current.close(1000, '正常关闭');
      wsRef.current = null;
    }
    setReadyState(WebSocket.CLOSED);
  }, [clearReconnectTimer, clearHeartbeatTimer]);

  // 重新连接
  const reconnectManually = useCallback(() => {
    reconnectCountRef.current = 0;
    disconnect();
    setTimeout(() => {
      connect();
    }, 100);
  }, [connect, disconnect]);

  // 自动连接
  useEffect(() => {
    if (autoConnect && url) {
      connect();
    }

    // 清理函数
    return () => {
      clearReconnectTimer();
      clearHeartbeatTimer();
      if (wsRef.current) {
        wsRef.current.close(1000, '组件卸载');
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, autoConnect]); // 只在 url 或 autoConnect 变化时重新连接

  return {
    sendMessage,
    disconnect,
    reconnect: reconnectManually,
    connect,
    readyState,
    lastMessage,
    isConnecting: readyState === WebSocket.CONNECTING,
    isOpen: readyState === WebSocket.OPEN,
    isClosing: readyState === WebSocket.CLOSING,
    isClosed: readyState === WebSocket.CLOSED
  };
};

export default useWebSocket;

