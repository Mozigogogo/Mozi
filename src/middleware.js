import { NextResponse } from 'next/server';

const NO_STORE = 'no-store, must-revalidate';
const NO_STORE_DOC =
  'private, no-cache, no-store, must-revalidate';

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

export function middleware(request) {
  const pathname = request.nextUrl.pathname;

  if (pathname === '/' && isTelegramRequest(request)) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    return NextResponse.redirect(url, 307);
  }

  const response = NextResponse.next();
  const isDev = process.env.NODE_ENV === 'development';

  // 删除 X-Frame-Options，允许 iframe 嵌入
  response.headers.delete('X-Frame-Options');
  response.headers.delete('x-frame-options');

  // 设置 CSP 允许 Telegram 嵌入
  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://telegram.org https://t.me;"
  );

  // 缓存：dev 全站禁用；prod 对页面/RSC 再强调一次（部分 WebView/CDN 更认中间件层头）
  if (isDev) {
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

// 匹配所有路由
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
