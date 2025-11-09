import { NextResponse } from 'next/server';

/**
 * 白名单路由中间件
 * 强制所有访问重定向到 /whitelist 页面
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;

  // 允许访问的路径（白名单页面本身和静态资源）
  const allowedPaths = [
    '/whitelist',
    '/_next',      // Next.js 内部资源
    '/favicon.ico',
    '/favicon.svg',
    '/api',        // API 请求
    '/easy',       // 涨跌分布接口代理
    '/manifest.json',
    '/icons',
    '/images',
  ];

  // 检查是否是允许的路径
  const isAllowed = allowedPaths.some(path => pathname.startsWith(path));

  // 如果不是允许的路径，重定向到白名单页面
  if (!isAllowed) {
    const url = request.nextUrl.clone();
    url.pathname = '/whitelist';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * 配置中间件匹配的路径
 * 匹配所有路径
 */
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image).*)',
  ],
};

