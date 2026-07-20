'use client';

import { useRouter } from 'next/navigation';
import { navigateTo } from '@/utils/clientNavigation';

export default function AppLink({ href, className, children, onClick, style, replace = false, ...props }) {
  const router = useRouter();

  const handleClick = (event) => {
    onClick?.(event);
    if (event.defaultPrevented || !href) return;

    const nextHref = String(href);
    if (navigateTo(nextHref, { replace })) return;

    if (replace) router.replace(nextHref);
    else router.push(nextHref);
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
