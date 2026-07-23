import { NextResponse } from 'next/server';

export const runtime = 'edge'; // 使用 edge runtime 获得更好的流式支持

export async function POST(req) {
  try {
    const body = await req.json();
    
    // 目标后端地址
    const targetUrl = 'https://askmozi.com/api/v1/analyze/stream';
    
    // 过滤掉可能导致问题的 headers
    const headers = new Headers();
    const allowedHeaders = ['authentication', 'authorization', 'accept-language', 'language', 'x-requested-with'];
    
    req.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      // 允许所有以 x- 开头的自定义 header，以及白名单中的 header
      if (allowedHeaders.includes(lowerKey) || lowerKey.startsWith('x-')) {
        headers.set(key, value);
      }
    });

    // 确保必需的 headers 存在
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'text/event-stream');
    headers.set('Host', 'askmozi.com');

    // 转发请求
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return new Response(`Backend error: ${response.status} ${response.statusText}`, {
        status: response.status,
      });
    }

    // 创建一个新的 TransformStream 来透传数据
    // 这样可以确保数据是一块一块传输的，而不是缓冲
    const { readable, writable } = new TransformStream();
    response.body.pipeTo(writable);

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
      },
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
