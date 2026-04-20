'use client';

import { TonConnectUIProvider, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useEffect, useMemo } from 'react';

// TON Connect manifest URL - 使用 CDN 托管确保可访问
const manifestUrl = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/tonconnect-manifest.json';

function TonBridge() {
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const tonAddress = useMemo(() => tonWallet?.account?.address || null, [tonWallet?.account?.address]);

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
    const addr =
      tonAddress ||
      tonConnectUI?.wallet?.account?.address ||
      tonConnectUI?.account?.address ||
      tonConnectUI?.walletInfo?.account?.address ||
      null;
    if (!addr) return;

    try {
      window.localStorage?.setItem('ton_address', addr);
      // eslint-disable-next-line no-console
      console.log('[TonConnect][cache] ton_address saved', { ton_address: addr });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[TonConnect][cache] save ton_address failed', e);
    }
  }, [tonAddress, tonConnectUI]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // 兜底：某些环境下 hook 不触发引用变化，定时尝试写一次
    const timer = window.setInterval(() => {
      try {
        const addr =
          window.__getTonWalletAddress?.() ||
          tonConnectUI?.wallet?.account?.address ||
          tonConnectUI?.account?.address ||
          tonConnectUI?.walletInfo?.account?.address ||
          null;
        if (!addr) return;
        if (window.localStorage?.getItem('ton_address') === addr) return;
        window.localStorage?.setItem('ton_address', addr);
        // eslint-disable-next-line no-console
        console.log('[TonConnect][cache][interval] ton_address saved', { ton_address: addr });
      } catch (_) {}
    }, 1200);
    return () => window.clearInterval(timer);
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
