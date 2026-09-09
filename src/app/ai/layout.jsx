'use client';

import { usePathname } from 'next/navigation';
import AiChatView from './AiChatView';

function getRouteConversationId(pathname) {
  const match = String(pathname || '').match(/^\/ai\/([^/?#]+)/);
  return match?.[1] || null;
}

/**
 * /ai 壳层：只挂一份 AiChatView（自带 AiChatLoadingOverlay）。
 * 勿再加 loading.jsx / BootShell，否则会与页内 loading 叠出两份。
 * children（SEO 等）不占视觉层。
 */
export default function AiLayout({ children }) {
  const pathname = usePathname();
  const routeConversationId = getRouteConversationId(pathname);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {children}
      </div>
      <AiChatView routeConversationId={routeConversationId} />
    </>
  );
}
