'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * 邀请码处理组件
 * 从 URL 参数中获取邀请码，存储并跳转到注册页
 */
export default function InviteCodeHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // 从 URL 参数获取邀请码
    const inviteCode = searchParams.get('inviteCode');
    
    if (inviteCode) {
      console.log('🔍 [InviteCode] 获取到邀请码:', inviteCode);
      // 存储到 localStorage
      localStorage.setItem('inviteCode', inviteCode);
      // 跳转到注册页面
      router.push('/user?mode=register');
    }
  }, [searchParams, router]);

  return null;
}
