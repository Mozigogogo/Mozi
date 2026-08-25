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
  // 去掉误带的 :3000 等内部端口
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
  // sitemap / robots 给搜索引擎干净可缓存响应
  if (pathname === '/sitemap.xml' || pathname === '/robots.txt') {
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

/** 强制拼到 https://moziai.xyz，绝不带 :3000 */
function redirectToCanonical(request) {
  const { pathname, search } = request.nextUrl;
  const dest = `https://${CANONICAL_HOST}${pathname}${search}`;
  return NextResponse.redirect(dest, 301);
}

export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  const host = getRequestHost(request);
  const isProd = process.env.NODE_ENV === 'production';

  // www → apex（主站统一 moziai.xyz，且不带内部端口）
  if (isProd && host === 'www.moziai.xyz' && !pathname.startsWith('/api/')) {
    return redirectToCanonical(request);
  }

  // Railway / 预览域名 → 正式站
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
    // 不拦 sitemap / robots，避免额外响应头干扰 Google 抓取
    '/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt).*)',
  ],
};
