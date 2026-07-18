import config from '../../../../../../config/index.js';

const { API_BASE_URL } = config;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildProxyHeaders(request) {
  const headers = {
    Accept: 'application/json',
  };

  const authHeader =
    request.headers.get('authentication') || request.headers.get('Authentication');
  if (authHeader) {
    headers.authentication = authHeader;
  }

  const language = request.headers.get('Accept-Language');
  if (language) {
    headers['Accept-Language'] = language;
  }

  return headers;
}

export async function GET(request) {
  try {
    const backendUrl = `${API_BASE_URL}/ai/agent/conversations`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: buildProxyHeaders(request),
      cache: 'no-store',
    });

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Agent conversations proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
