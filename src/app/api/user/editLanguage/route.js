import config from '../../../../../config/index.js';

const { API_BASE_URL } = config;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function pathAllowed(pathname) {
  if (typeof pathname !== 'string') return false;
  const p = pathname === '' ? '/' : pathname;
  if (p === '/') return true;
  if (p.startsWith('/user')) return true;
  return false;
}

function pathnameFromReferer(referer) {
  if (!referer) return null;
  try {
    return new URL(referer).pathname || '/';
  } catch {
    return null;
  }
}

export async function POST(request) {
  const referer = request.headers.get('referer');
  const path = pathnameFromReferer(referer);

  if (!path || !pathAllowed(path)) {
    return Response.json(
      { code: 403, message: 'editLanguage is only allowed from home or /user pages' },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: 400, message: 'Invalid JSON body' }, { status: 400 });
  }

  const authHeader = request.headers.get('authentication');
  const acceptLanguage = request.headers.get('accept-language');

  const headers = {
    'Content-Type': 'application/json',
  };
  if (authHeader) headers.authentication = authHeader;
  if (acceptLanguage) headers['Accept-Language'] = acceptLanguage;

  const backendUrl = `${API_BASE_URL}/user/editLanguage`;

  const backendRes = await fetch(backendUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await backendRes.text();
  const contentType = backendRes.headers.get('content-type') || 'application/json';

  return new Response(text, {
    status: backendRes.status,
    headers: { 'Content-Type': contentType },
  });
}
