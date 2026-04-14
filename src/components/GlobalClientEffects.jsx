'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

const WalletAccountSync = dynamic(() => import('@/components/WalletAccountSync'), {
  ssr: false,
});

const GetPointsModal = dynamic(() => import('@/components/GetPointsModal'), {
  ssr: false,
});

export default function GlobalClientEffects() {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // Keep it simple: read once at boot. If login state changes, the page usually reloads or navigates.
    try {
      setHasToken(!!window.localStorage.getItem('token'));
    } catch (_) {
      setHasToken(false);
    }
  }, []);

  const shouldEnableWalletSync = useMemo(() => {
    // Only run wallet sync when user is logged in (reduces global JS + effects on anonymous users)
    return hasToken;
  }, [hasToken]);

  return (
    <>
      {shouldEnableWalletSync ? <WalletAccountSync /> : null}
      {/* Modal listens to window event; keep it client-only but avoid SSR payload */}
      <GetPointsModal />
    </>
  );
}

