'use client';

import { useRouter } from 'next/navigation';
import { navigateTo } from '@/utils/clientNavigation';
import { markRouteBootLoading } from '@/utils/routeBootLoading';

/**
 * 内部导航仍走客户端路由，但渲染真实 <a href>，便于爬虫发现链接。
 */
export default function AppLink({ href, className, children, onClick, style, replace = false, ...props }) {
  const router = useRouter();

  const handleClick = (event) => {
    onClick?.(event);
    if (event.defaultPrevented || !href) return;

    // 新标签 / 修饰键：交给浏览器默认行为
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button === 1
    ) {
      return;
    }

    const nextHref = String(href);
    event.preventDefault();

    // 内部路由跳转前显示 Logo loading，避免白屏等待
    // 币种详情页自有内容区骨架，跳过全屏 LogoLoading
    if (nextHref.startsWith('/')) {
      try {
        const pathname = nextHref.split('?')[0];
        if (pathname !== '/detail') {
          markRouteBootLoading(pathname);
        }
      } catch (_) {}
    }

    if (navigateTo(nextHref, { replace })) return;

    if (replace) router.replace(nextHref);
    else router.push(nextHref);
  };

  return (
    <a
      href={href || undefined}
      className={className}
      style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit', ...style }}
      onClick={handleClick}
      {...props}
    >
      {children}
    </a>
  );
}
