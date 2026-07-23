import { NextResponse } from 'next/server';

export const runtime = 'edge';

const ROBOT_BACKEND_URL = (
  process.env.NEXT_PUBLIC_ROBOT_BACKEND_URL ||
  process.env.ROBOT_BACKEND_URL ||
  'https://askmozi.com'
).replace(/\/$/, '');

export async function POST(req) {
  try {
    const body = await req.json();
    const targetUrl = `${ROBOT_BACKEND_URL}/signals/v1/chat`;

    const headers = new Headers();
    const allowedHeaders = ['authentication', 'authorization', 'accept-language', 'language', 'x-requested-with'];

    req.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (allowedHeaders.includes(lowerKey) || lowerKey.startsWith('x-')) {
        headers.set(key, value);
      }
    });

    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'text/event-stream');

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return new Response(`Backend error: ${response.status} ${response.statusText}`, {
        status: response.status,
      });
    }

    const { readable, writable } = new TransformStream();
    response.body.pipeTo(writable);

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[signals/v1/chat proxy] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
