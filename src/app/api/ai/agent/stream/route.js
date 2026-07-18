import config from '../../../../../../config/index.js';

const { API_BASE_URL } = config;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authentication');

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };

    if (authHeader) {
      headers.authentication = authHeader;
    }

    const backendUrl = `${API_BASE_URL}/ai/agent/stream`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Backend error: ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            await writer.close();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          await writer.write(encoder.encode(chunk));
        }
      } catch (error) {
        console.error('Agent SSE proxy error:', error);
        await writer.abort(error);
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Agent stream route error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
