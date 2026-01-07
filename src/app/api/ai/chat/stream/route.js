import config from '../../../../../../config/index.js';

const { API_BASE_URL } = config;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // 获取请求体
    const body = await request.json();
    
    // 获取 authentication header
    const authHeader = request.headers.get('authentication');
    
    // 构建后端请求头
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };
    
    if (authHeader) {
      headers['authentication'] = authHeader;
    }

    // 向后端发起请求
    const backendUrl = `${API_BASE_URL}/ai/chat/stream`;
    console.log('🔄 代理 SSE 请求到:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Backend error: ${response.status}` }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 创建一个 TransformStream 来转发 SSE 数据
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // 异步读取后端响应并转发
    (async () => {
      try {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ SSE 流结束');
            await writer.close();
            break;
          }

          // 直接转发数据块，不做任何缓冲
          const chunk = decoder.decode(value, { stream: true });
          await writer.write(encoder.encode(chunk));
        }
      } catch (error) {
        console.error('❌ SSE 流转发错误:', error);
        await writer.abort(error);
      }
    })();

    // 返回流式响应
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
      },
    });

  } catch (error) {
    console.error('❌ API 路由错误:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
