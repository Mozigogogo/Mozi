import { NextResponse } from 'next/server';

const NO_STORE = 'no-store, must-revalidate';
const NO_STORE_DOC =
  'private, no-cache, no-store, must-revalidate';

const CANONICAL_HOST = 'moziai.xyz';

function getRequestHost(request) {
  const forwarded = request.headers.get('x-forwarded-host');
  const raw = (forwarded || request.headers.get('host') || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  return raw.replace(/:\d+$/, '');
}

/** Railway / Vercel 等预览域名：应 301 到正式站，避免抢占品牌搜索 */
function isPreviewHost(host) {
  if (!host) return false;
  return (
    host.endsWith('.railway.app') ||
    host.endsWith('.up.railway.app') ||
    host.endsWith('.vercel.app')
  );
}

function shouldSkipProdCacheHeaders(pathname) {
  if (pathname.startsWith('/_next/static') || pathname.startsWith('/_next/image')) {
    return true;
  }
  if (pathname.startsWith('/api/')) {
    return true;
  }
  return /\.(ico|png|jpe?g|gif|webp|svg|woff2?|ttf|eot)$/i.test(pathname);
}

function isTelegramRequest(request) {
  const userAgent = request.headers.get('user-agent') || '';
  if (/Telegram/i.test(userAgent)) return true;

  const referer = request.headers.get('referer') || '';
  if (/telegram\.org|t\.me/i.test(referer)) return true;

  return false;
}

function redirectToCanonical(request) {
  const target = new URL(request.url);
  target.protocol = 'https:';
  target.host = CANONICAL_HOST;
  return NextResponse.redirect(target, 301);
}

export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  const host = getRequestHost(request);
  const isProd = process.env.NODE_ENV === 'production';

  // www → apex（主站统一 moziai.xyz）
  if (isProd && host === 'www.moziai.xyz' && !pathname.startsWith('/api/')) {
    return redirectToCanonical(request);
  }

  // Railway / 预览域名 → 正式站（部署到 Railway 后生效，便于 Google 改收录）
  if (isProd && isPreviewHost(host) && !pathname.startsWith('/api/')) {
    return redirectToCanonical(request);
  }

  if (pathname === '/' && isTelegramRequest(request)) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    return NextResponse.redirect(url, 307);
  }

  const response = NextResponse.next();

  // 删除 X-Frame-Options，允许 iframe 嵌入
  response.headers.delete('X-Frame-Options');
  response.headers.delete('x-frame-options');

  // 设置 CSP 允许 Telegram 嵌入
  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://telegram.org https://t.me;"
  );

  // 缓存：dev 全站禁用；prod 对页面/RSC 再强调一次
  if (!isProd) {
    response.headers.set('Cache-Control', NO_STORE);
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  } else if (!shouldSkipProdCacheHeaders(pathname)) {
    response.headers.set('Cache-Control', NO_STORE_DOC);
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
