'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** 分佣管理暂未开放，访问时重定向到概览 */
export default function AdminCommissionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  return null;
}
