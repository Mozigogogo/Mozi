'use client';

import { TonConnectUIProvider } from '@tonconnect/ui-react';

// TON Connect manifest URL - 使用 CDN 托管确保可访问
const manifestUrl = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/tonconnect-manifest.json';

export default function TonConnectProvider({ children }) {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
}
