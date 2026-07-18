'use client';

import { useRouter } from 'next/navigation';
import { markRouteBootLoading } from '@/utils/routeBootLoading';

export default function AppLink({ href, className, children, onClick, style, ...props }) {
  const router = useRouter();

  const handleClick = (event) => {
    onClick?.(event);
    if (event.defaultPrevented || !href) return;

    if (typeof window !== 'undefined') {
      const nextPath = String(href).split('?')[0];
      const currentPath = window.location.pathname;
      if (nextPath.startsWith('/') && nextPath !== currentPath) {
        markRouteBootLoading(nextPath);
      }
    }

    router.push(href);
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleClick(event);
  };

  return (
    <div
      role="link"
      tabIndex={0}
      className={className}
      style={{ cursor: 'pointer', ...style }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  );
}
