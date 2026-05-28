'use client';

import { TonConnectUIProvider, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useEffect, useMemo, useState } from 'react';

// TON Connect manifest URL - 使用 CDN 托管确保可访问
const manifestUrl = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/tonconnect-manifest.json';

function isTelegramMiniApp() {
  if (typeof window === 'undefined') return false;
  return !!window.Telegram?.WebApp;
}

function buildTonConnectUiOptions() {
  const base = { manifestUrl, restoreConnection: true, enableAndroidBackHandler: true };
  if (!isTelegramMiniApp()) return base;

  const twaReturnUrl = process.env.NEXT_PUBLIC_TON_TWA_RETURN_URL;
  return {
    ...base,
    actionsConfiguration: {
      modals: ['before', 'success', 'error'],
      returnStrategy: 'back',
      ...(twaReturnUrl ? { twaReturnUrl } : {}),
    },
  };
}

function buildSendTransactionOptions() {
  if (!isTelegramMiniApp()) return undefined;
  const twaReturnUrl = process.env.NEXT_PUBLIC_TON_TWA_RETURN_URL;
  return {
    actionsConfiguration: {
      modals: ['before', 'success', 'error'],
      returnStrategy: 'back',
      ...(twaReturnUrl ? { twaReturnUrl } : {}),
    },
  };
}

function safeCloseTonModal(tonConnectUI) {
  if (!tonConnectUI) return;
  try {
    tonConnectUI.closeModal?.();
  } catch (_) {}
  try {
    tonConnectUI.closeSingleWalletModal?.();
  } catch (_) {}
}

function TonBridge() {
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const tonAddress = useMemo(() => tonWallet?.account?.address || null, [tonWallet?.account?.address]);

  useEffect(() => {
    if (typeof window === 'undefined' || !tonConnectUI) return undefined;

    window.__openTonConnectModal = async () => tonConnectUI?.openModal?.();
    window.__disconnectTon = async () => tonConnectUI?.disconnect?.();
    window.__closeTonConnectModal = () => safeCloseTonModal(tonConnectUI);

    window.__tonSendTransaction = async (tx) => {
      const sendOptions = buildSendTransactionOptions();

      const closeIfStuck = () => {
        window.setTimeout(() => safeCloseTonModal(tonConnectUI), 280);
      };

      const onVisibility = () => {
        if (document.visibilityState === 'visible') {
          closeIfStuck();
        }
      };

      const onViewportChanged = () => {
        closeIfStuck();
      };

      document.addEventListener('visibilitychange', onVisibility);
      try {
        window.Telegram?.WebApp?.onEvent?.('viewportChanged', onViewportChanged);
      } catch (_) {}

      try {
        return await tonConnectUI?.sendTransaction?.(tx, sendOptions);
      } finally {
        document.removeEventListener('visibilitychange', onVisibility);
        try {
          window.Telegram?.WebApp?.offEvent?.('viewportChanged', onViewportChanged);
        } catch (_) {}
        safeCloseTonModal(tonConnectUI);
      }
    };

    window.__getTonWalletAddress = () =>
      tonWallet?.account?.address ||
      tonConnectUI?.wallet?.account?.address ||
      tonConnectUI?.account?.address ||
      tonConnectUI?.walletInfo?.account?.address ||
      window.localStorage?.getItem('ton_address') ||
      null;

    return () => {
      try {
        delete window.__openTonConnectModal;
      } catch {}
      try {
        delete window.__disconnectTon;
      } catch {}
      try {
        delete window.__closeTonConnectModal;
      } catch {}
      try {
        delete window.__tonSendTransaction;
      } catch {}
      try {
        delete window.__getTonWalletAddress;
      } catch {}
    };
  }, [tonConnectUI, tonWallet]);

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
      try {
        window.dispatchEvent(new CustomEvent('mozi:ton-address-ready', { detail: { address: addr } }));
      } catch (_) {}
    } catch (_) {}
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
        try {
          window.dispatchEvent(new CustomEvent('mozi:ton-address-ready', { detail: { address: addr } }));
        } catch (_) {}
      } catch (_) {}
    }, 1200);
    return () => window.clearInterval(timer);
  }, [tonConnectUI]);

  return null;
}

export default function TonConnectProvider({ children }) {
  const [uiOptions, setUiOptions] = useState(() => ({ manifestUrl, restoreConnection: true }));

  useEffect(() => {
    setUiOptions(buildTonConnectUiOptions());
  }, []);

  return (
    <TonConnectUIProvider {...uiOptions}>
      <TonBridge />
      {children}
    </TonConnectUIProvider>
  );
}
