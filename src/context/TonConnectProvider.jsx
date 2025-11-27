'use client';

import { TonConnectUIProvider } from '@tonconnect/ui-react';

// TON Connect manifest URL
const manifestUrl = typeof window !== 'undefined' 
  ? `${window.location.origin}/tonconnect-manifest.json`
  : 'https://mozi.app/tonconnect-manifest.json';

export default function TonConnectProvider({ children }) {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
}
