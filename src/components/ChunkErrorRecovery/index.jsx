'use client';

import { useEffect } from 'react';

const RELOAD_FLAG = '__chunk_error_reloaded_once__';

function isChunkLoadError(error) {
  if (!error) return false;

  const message =
    typeof error === 'string'
      ? error
      : error?.message || error?.reason?.message || String(error);

  return (
    /ChunkLoadError/i.test(message) ||
    /Loading chunk [\w-]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message)
  );
}

export default function ChunkErrorRecovery() {
  useEffect(() => {
    const recover = (error) => {
      if (!isChunkLoadError(error)) return;

      const hasReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1';
      if (hasReloaded) return;

      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
    };

    const onError = (event) => recover(event?.error || event?.message);
    const onUnhandledRejection = (event) => recover(event?.reason);

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
