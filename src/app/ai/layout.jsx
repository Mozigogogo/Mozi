'use client';

import { usePathname } from 'next/navigation';
import AiChatView from './AiChatView';

function getRouteConversationId(pathname) {
  const match = String(pathname || '').match(/^\/ai\/([^/?#]+)/);
  return match?.[1] || null;
}

export default function AiLayout() {
  const pathname = usePathname();
  const routeConversationId = getRouteConversationId(pathname);

  return <AiChatView routeConversationId={routeConversationId} />;
}
