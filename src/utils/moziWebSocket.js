/**
 * Mozi WebSocket 管理类
 * 完整实现 Mozi 加密货币行情 WebSocket 协议
 */

import {
  WS_EVENTS,
  createHandshakeMessage,
  createPingMessage,
  createSubscribeMessage,
  createUnsubscribeMessage,
  parseMessage,
  PLATFORMS,
  CLOSE_CODES
} from './websocketProtocol';

export class MoziWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.ws = null;
    this.isManualClose = false;
    this.reconnectAttempt = 0;
    this.reconnectIntervals = [1000, 2000, 5000, 10000, 30000]; // 指数退避策略
    this.heartbeatTimer = null;
    this.heartbeatTimeout = null;
    this.missedPongCount = 0;
    this.sessionId = null;
    this.subscribedChannels = new Map(); // 存储已订阅的频道
    
    // 配置选项
    this.options = {
      platform: PLATFORMS.H5,
      version: '1.0.0',
      autoHandshake: true,          // 自动握手
      heartbeatInterval: 30000,     // 30秒心跳间隔
      heartbeatTimeout: 90000,      // 90秒超时（3次未响应）
      maxReconnectAttempts: -1,     // -1 表示无限重连
      debug: true,                  // 调试模式
      token: null,                  // 用户 token，用于身份验证（静态快照）
      getToken: null,               // 获取 token 的函数，用于重连时取最新（可选）
      ...options
    };
    
    // 事件回调
    this.eventHandlers = new Map();
    
    // 内置事件处理
    this.on(WS_EVENTS.WELCOME, this._handleWelcome.bind(this));
    this.on(WS_EVENTS.PONG, this._handlePong.bind(this));
    this.on(WS_EVENTS.ERROR, this._handleError.bind(this));
  }
  
  /**
   * 连接 WebSocket
   */
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this._log('WebSocket 已连接');
      return;
    }
    
    this.isManualClose = false;
    this._log(`正在连接: ${this.url}`);
    
    try {
      // 如果有 token，通过 Sec-WebSocket-Protocol 子协议传递
      const token =
        typeof this.options.getToken === 'function'
          ? this.options.getToken()
          : this.options.token;

      if (token) {
        const tokenStr = String(token);
        // 如果 token 丢失/为空，走匿名连接
        this._log(`使用 token 认证: ${token.substring(0, 20)}...`);
        // 直接传递 token 作为子协议，后端可以从 Sec-WebSocket-Protocol 头中读取
        this.ws = new WebSocket(this.url, tokenStr);
      } else {
        this._log('无 token，匿名连接');
        this.ws = new WebSocket(this.url);
      }
      this._setupEventListeners();
    } catch (error) {
      this._error('连接创建失败:', error);
      this._scheduleReconnect();
    }
  }
  
  /**
   * 断开连接
   */
  disconnect() {
    this.isManualClose = true;
    this._clearTimers();
    
    if (this.ws) {
      this.ws.close(CLOSE_CODES.NORMAL, '正常关闭');
      this.ws = null;
    }
    
    this._log('已断开连接');
  }
  
  /**
   * 发送消息
   */
  send(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this._error('WebSocket 未连接，无法发送消息');
      return false;
    }
    
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    this.ws.send(message);
    this._log('发送消息:', data);
    return true;
  }
  
  /**
   * 订阅频道
   * @param {Array} channels - 频道配置数组
   */
  async subscribe(channels) {
    const message = createSubscribeMessage(channels);
    const success = this.send(message);
    
    if (success) {
      this._log('发送订阅请求:', channels);
      return new Promise((resolve) => {
        const handler = (data) => {
          this.off(WS_EVENTS.SUBSCRIBE_RESPONSE, handler);
          resolve(data);
        };
        this.on(WS_EVENTS.SUBSCRIBE_RESPONSE, handler);
      });
    }
    
    return Promise.reject(new Error('发送订阅请求失败'));
  }
  
  /**
   * 取消订阅
   * @param {Array} channelIds - 频道 ID 数组
   */
  async unsubscribe(channelIds) {
    const message = createUnsubscribeMessage(channelIds);
    const success = this.send(message);
    
    if (success) {
      this._log('发送取消订阅请求:', channelIds);
      // 从本地记录中移除
      channelIds.forEach(id => this.subscribedChannels.delete(id));
      
      return new Promise((resolve) => {
        const handler = (data) => {
          this.off(WS_EVENTS.UNSUBSCRIBE_RESPONSE, handler);
          resolve(data);
        };
        this.on(WS_EVENTS.UNSUBSCRIBE_RESPONSE, handler);
      });
    }
    
    return Promise.reject(new Error('发送取消订阅请求失败'));
  }
  
  /**
   * 注册事件监听器
   */
  on(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(callback);
  }
  
  /**
   * 移除事件监听器
   */
  off(event, callback) {
    if (!this.eventHandlers.has(event)) return;
    
    if (callback) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.eventHandlers.delete(event);
    }
  }
  
  /**
   * 触发事件
   */
  emit(event, data) {
    if (!this.eventHandlers.has(event)) return;
    
    this.eventHandlers.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        this._error(`事件处理错误 [${event}]:`, error);
      }
    });
  }
  
  /**
   * 获取连接状态
   */
  getReadyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }
  
  /**
   * 是否已连接
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
  
  // ==================== 私有方法 ====================
  
  /**
   * 设置事件监听
   */
  _setupEventListeners() {
    this.ws.onopen = this._handleOpen.bind(this);
    this.ws.onmessage = this._handleMessage.bind(this);
    this.ws.onerror = this._handleWsError.bind(this);
    this.ws.onclose = this._handleClose.bind(this);
  }
  
  /**
   * 处理连接打开
   */
  _handleOpen(event) {
    this._log('✅ WebSocket 连接成功');
    this.reconnectAttempt = 0;
    this.emit('open', event);
    
    // 自动发送握手消息
    if (this.options.autoHandshake) {
      setTimeout(() => {
        this._sendHandshake();
      }, 100);
    }
  }
  
  /**
   * 处理接收消息
   */
  _handleMessage(event) {
    const data = parseMessage(event.data);
    if (!data) {
      this._error('消息解析失败:', event.data);
      return;
    }
    
    this._log('📨 收到消息:', data);
    
    // 触发对应事件
    if (data.event) {
      this.emit(data.event, data);
    }
    
    // 触发通用消息事件
    this.emit('message', data);
  }
  
  /**
   * 处理 WebSocket 错误
   */
  _handleWsError(event) {
    this._error('⚠️ WebSocket 错误:', event);
    this.emit('ws_error', event);
  }
  
  /**
   * 处理连接关闭
   */
  _handleClose(event) {
    this._log(`❌ WebSocket 连接关闭 (code: ${event.code}, reason: ${event.reason})`);
    
    this._clearTimers();
    this.sessionId = null;
    this.emit('close', event);
    
    // 根据关闭码决定是否重连
    const shouldReconnect = this._shouldReconnect(event.code);
    
    if (!this.isManualClose && shouldReconnect) {
      this._scheduleReconnect();
    }
  }
  
  /**
   * 发送握手消息
   */
  _sendHandshake() {
    const handshake = createHandshakeMessage(
      this.options.platform,
      this.options.version
    );
    
    this.send(handshake);
    this._log('🤝 发送握手消息');
  }
  
  /**
   * 处理握手响应
   */
  _handleWelcome(data) {
    this._log('🤝 握手成功:', data);
    
    if (data.data && data.data.sessionId) {
      this.sessionId = data.data.sessionId;
    }
    
    // 启动心跳
    this._startHeartbeat();
    
    // 触发认证成功事件
    this.emit('authenticated', data);
  }
  
  /**
   * 启动心跳
   */
  _startHeartbeat() {
    this._clearTimers();
    
    // 定时发送 ping
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        const ping = createPingMessage();
        this.send(ping);
        this._log('💓 发送心跳');
        
        // 设置超时检测
        this.heartbeatTimeout = setTimeout(() => {
          this.missedPongCount++;
          this._log(`⚠️ 心跳超时 (${this.missedPongCount}/3)`);
          
          if (this.missedPongCount >= 3) {
            this._error('💔 连续3次心跳超时，主动断开连接');
            this.ws.close(CLOSE_CODES.HEARTBEAT_TIMEOUT, '心跳超时');
          }
        }, this.options.heartbeatTimeout / 3);
      }
    }, this.options.heartbeatInterval);
  }
  
  /**
   * 处理心跳响应
   */
  _handlePong(data) {
    this._log('💓 收到心跳响应');
    
    // 清除超时检测
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
    
    this.missedPongCount = 0;
  }
  
  /**
   * 处理错误消息
   */
  _handleError(data) {
    this._error('服务器错误:', data);
    this.emit('server_error', data);
  }
  
  /**
   * 清除定时器
   */
  _clearTimers() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }
  
  /**
   * 判断是否应该重连
   */
  _shouldReconnect(closeCode) {
    const noReconnectCodes = [
      CLOSE_CODES.NORMAL,
      CLOSE_CODES.PROTOCOL_ERROR,
      CLOSE_CODES.UNSUPPORTED_DATA,
      CLOSE_CODES.POLICY_VIOLATION
    ];
    
    return !noReconnectCodes.includes(closeCode);
  }
  
  /**
   * 安排重连
   */
  _scheduleReconnect() {
    if (this.options.maxReconnectAttempts !== -1 && 
        this.reconnectAttempt >= this.options.maxReconnectAttempts) {
      this._error('已达到最大重连次数');
      this.emit('reconnect_failed');
      return;
    }
    
    // 使用指数退避策略
    const intervalIndex = Math.min(
      this.reconnectAttempt,
      this.reconnectIntervals.length - 1
    );
    const interval = this.reconnectIntervals[intervalIndex];
    
    this._log(`🔄 ${interval}ms 后尝试重连 (第 ${this.reconnectAttempt + 1} 次)`);
    
    setTimeout(() => {
      this.reconnectAttempt++;
      this.connect();
    }, interval);
  }
  
  /**
   * 日志输出
   */
  _log(...args) {
    if (this.options.debug) {
      console.log('[MoziWebSocket]', ...args);
    }
  }
  
  /**
   * 错误输出
   */
  _error(...args) {
    console.error('[MoziWebSocket]', ...args);
  }
}

export default MoziWebSocket;

