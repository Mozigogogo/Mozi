'use client';

import { usePathname } from 'next/navigation';
import AiChatView from './AiChatView';

function getRouteConversationId(pathname) {
  const match = String(pathname || '').match(/^\/ai\/([^/?#]+)/);
  return match?.[1] || null;
}

/** 静态挂载，减少 dynamic 空窗；进页闪屏由 PCLayout 点击占位淡出承接 */
export default function AiLayout({ children }) {
  const pathname = usePathname();
  const routeConversationId = getRouteConversationId(pathname);

  return (
    <>
      {children}
      <AiChatView routeConversationId={routeConversationId} />
    </>
  );
}
