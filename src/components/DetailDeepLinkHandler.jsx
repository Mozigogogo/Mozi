'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

/** 与 bot 侧 resolveSymbolFromAlertArgs 一致，避免误跳 */
const SYMBOL_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;

/**
 * 监听 URL：若存在 symbol + from=tg_alert（如机器人 /alert、Mini App 外链），
 * 且当前不在 /detail，则统一跳到币种详情页。
 */
export default function DetailDeepLinkHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('from') !== 'tg_alert') return;

    const raw = searchParams.get('symbol');
    if (!raw || !SYMBOL_RE.test(raw.trim())) return;

    const symbol = raw.trim().toUpperCase();
    if (pathname === '/detail' || pathname?.startsWith('/detail/')) return;

    const qs = new URLSearchParams();
    qs.set('symbol', symbol);
    qs.set('from', 'tg_alert');
    router.replace(`/detail?${qs.toString()}`);
  }, [pathname, searchParams, router]);

  return null;
}
