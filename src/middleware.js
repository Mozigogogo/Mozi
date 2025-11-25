import { NextResponse } from 'next/server';

export function middleware(request) {
  const response = NextResponse.next();
  
  // 删除 X-Frame-Options，允许 iframe 嵌入
  response.headers.delete('X-Frame-Options');
  response.headers.delete('x-frame-options');
  
  // 设置 CSP 允许 Telegram 嵌入
  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://telegram.org https://t.me;"
  );
  
  return response;
}

// 匹配所有路由
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
