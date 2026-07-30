'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import AiChatBootShell from './AiChatBootShell';

const AiChatView = dynamic(() => import('./AiChatView'), {
  ssr: false,
  loading: () => <AiChatBootShell />,
});

function getRouteConversationId(pathname) {
  const match = String(pathname || '').match(/^\/ai\/([^/?#]+)/);
  return match?.[1] || null;
}

export default function AiLayout() {
  const pathname = usePathname();
  const routeConversationId = getRouteConversationId(pathname);

  return <AiChatView routeConversationId={routeConversationId} />;
}
