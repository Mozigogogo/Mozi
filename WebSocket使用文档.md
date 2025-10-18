# WebSocket 使用文档

## 简介

已为项目封装了一个功能完整的 WebSocket Hook，支持自动连接、断线重连、心跳检测等功能。

## 文件位置

- **Hook**: `/src/utils/useWebSocket.js`
- **配置**: `/src/utils/constants.js`

## 配置 WebSocket 服务器地址

在 `.env.local` 文件中配置 WebSocket 服务器地址：

```bash
NEXT_PUBLIC_WS_URL=ws://your-server.com/ws
# 或者 wss://your-server.com/ws (使用 SSL)
```

## 基本使用

### 1. 在组件中使用

```javascript
import { useWebSocket } from '../utils/useWebSocket';
import { WS_URL } from '../utils/constants';

function MyComponent() {
  const { sendMessage, isOpen, lastMessage } = useWebSocket(WS_URL, {
    onOpen: () => {
      console.log('WebSocket 已连接');
    },
    onMessage: (message) => {
      console.log('收到消息:', message);
    },
    autoConnect: true // 自动连接
  });

  // 发送消息
  const handleSend = () => {
    sendMessage({ type: 'hello', data: 'world' });
  };

  return (
    <div>
      <p>连接状态: {isOpen ? '已连接' : '未连接'}</p>
      <button onClick={handleSend}>发送消息</button>
    </div>
  );
}
```

## 配置选项

```javascript
useWebSocket(url, {
  // 消息回调
  onMessage: (message) => {},
  
  // 连接成功回调
  onOpen: (event) => {},
  
  // 连接关闭回调
  onClose: (event) => {},
  
  // 错误回调
  onError: (event) => {},
  
  // 是否自动连接，默认 true
  autoConnect: true,
  
  // 重连间隔（毫秒），默认 5000
  reconnectInterval: 5000,
  
  // 最大重连次数，默认 5，-1 表示无限重连
  reconnectAttempts: 5,
  
  // 心跳间隔（毫秒），默认 30000，0 表示禁用
  heartbeatInterval: 30000,
  
  // 心跳消息，默认 'ping'
  heartbeatMessage: 'ping'
});
```

## 返回值

```javascript
const {
  // 发送消息
  sendMessage,
  
  // 手动断开连接
  disconnect,
  
  // 手动重连
  reconnect,
  
  // 手动连接
  connect,
  
  // 连接状态
  readyState,
  
  // 最后一条消息
  lastMessage,
  
  // 状态判断
  isConnecting, // 正在连接
  isOpen,       // 已连接
  isClosing,    // 正在关闭
  isClosed      // 已关闭
} = useWebSocket(url, options);
```

## 完整示例

### 实时价格更新

```javascript
import { useWebSocket } from '../utils/useWebSocket';
import { WS_URL } from '../utils/constants';

function PriceBoard() {
  const [prices, setPrices] = useState({});

  const { sendMessage, isOpen } = useWebSocket(WS_URL, {
    onOpen: () => {
      // 订阅价格频道
      sendMessage({
        type: 'subscribe',
        channel: 'prices',
        symbols: ['BTC', 'ETH', 'USDT']
      });
    },
    onMessage: (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'price_update') {
          setPrices(prev => ({
            ...prev,
            [data.symbol]: data.price
          }));
        }
      } catch (error) {
        console.error('解析消息失败:', error);
      }
    },
    autoConnect: true,
    heartbeatInterval: 30000,
    heartbeatMessage: JSON.stringify({ type: 'ping' })
  });

  return (
    <div>
      <h2>实时价格 {isOpen ? '🟢' : '🔴'}</h2>
      {Object.entries(prices).map(([symbol, price]) => (
        <div key={symbol}>
          {symbol}: ${price}
        </div>
      ))}
    </div>
  );
}
```

### 聊天室

```javascript
function ChatRoom() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const { sendMessage, isOpen } = useWebSocket(WS_URL, {
    onMessage: (message) => {
      const data = JSON.parse(message);
      if (data.type === 'chat_message') {
        setMessages(prev => [...prev, data]);
      }
    },
    autoConnect: true
  });

  const handleSend = () => {
    if (input.trim() && isOpen) {
      sendMessage({
        type: 'chat_message',
        content: input,
        timestamp: Date.now()
      });
      setInput('');
    }
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i}>{msg.content}</div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
      />
      <button onClick={handleSend} disabled={!isOpen}>
        发送
      </button>
    </div>
  );
}
```

## 特性

✅ **自动连接**: 组件加载时自动建立连接  
✅ **断线重连**: 连接断开时自动重连，支持自定义重连次数和间隔  
✅ **心跳检测**: 定时发送心跳消息保持连接  
✅ **状态管理**: 提供完整的连接状态信息  
✅ **错误处理**: 完善的错误回调和日志  
✅ **手动控制**: 支持手动连接、断开和重连  
✅ **自动清理**: 组件卸载时自动关闭连接  

## 注意事项

1. **开发环境**: 如果 WebSocket 服务器未启动，会看到连接失败的日志，这是正常的
2. **生产环境**: 请确保在 `.env.production` 中配置正确的 WebSocket 地址
3. **SSL**: 如果网站使用 HTTPS，WebSocket 也应该使用 WSS 协议
4. **消息格式**: 建议使用 JSON 格式传输数据，便于解析和类型判断
5. **资源清理**: Hook 会在组件卸载时自动清理连接，无需手动处理

## 调试

在浏览器控制台中可以看到详细的 WebSocket 日志：

- `[WebSocket] 正在连接`
- `[WebSocket] 连接成功`
- `[WebSocket] 收到消息`
- `[WebSocket] 发送消息`
- `[WebSocket] 连接关闭`
- `[WebSocket] 尝试重连`

## 常见问题

### Q: 如何禁用自动连接？
A: 设置 `autoConnect: false`，然后手动调用 `connect()` 方法

### Q: 如何禁用心跳？
A: 设置 `heartbeatInterval: 0`

### Q: 如何无限重连？
A: 设置 `reconnectAttempts: -1`

### Q: 如何发送二进制数据？
A: `sendMessage()` 接受任意数据类型，会自动转换为字符串

