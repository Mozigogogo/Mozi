'use client';

import { TonConnectUIProvider, useTonConnectUI } from '@tonconnect/ui-react';
import { useEffect } from 'react';

// TON Connect manifest URL - 使用 CDN 托管确保可访问
const manifestUrl = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/tonconnect-manifest.json';

function TonBridge() {
  const [tonConnectUI] = useTonConnectUI();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.__openTonConnectModal = async () => tonConnectUI?.openModal?.();
    window.__disconnectTon = async () => tonConnectUI?.disconnect?.();
    window.__tonSendTransaction = async (tx) => tonConnectUI?.sendTransaction?.(tx);
    window.__getTonWalletAddress = () =>
      tonConnectUI?.wallet?.account?.address ||
      tonConnectUI?.account?.address ||
      tonConnectUI?.walletInfo?.account?.address ||
      null;

    return () => {
      try { delete window.__openTonConnectModal; } catch {}
      try { delete window.__disconnectTon; } catch {}
      try { delete window.__tonSendTransaction; } catch {}
      try { delete window.__getTonWalletAddress; } catch {}
    };
  }, [tonConnectUI]);

  return null;
}

export default function TonConnectProvider({ children }) {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <TonBridge />
      {children}
    </TonConnectUIProvider>
  );
}
