'use client';

import { TonConnectUIProvider, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useEffect } from 'react';

// TON Connect manifest URL - 使用 CDN 托管确保可访问
const manifestUrl = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/tonconnect-manifest.json';

function TonBridge() {
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const addr = tonWallet?.account?.address || null;
    if (!addr) return;
    try {
      window.localStorage?.setItem('ton_address', addr);
      // eslint-disable-next-line no-console
      console.log('[TonConnect][cache] ton_address saved', { ton_address: addr });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[TonConnect][cache] save ton_address failed', e);
    }
  }, [tonWallet]);

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
