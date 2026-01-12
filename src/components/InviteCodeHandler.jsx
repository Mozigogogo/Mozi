'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

/**
 * 邀请码处理组件
 * 从 URL 参数中获取邀请码，存储并自动跳转到 /user 页面触发钱包登录
 */
export default function InviteCodeHandler({ onShowLogin }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 从 URL 参数获取邀请码
    const inviteCode = searchParams.get('inviteCode') || searchParams.get('invite');
    
    if (inviteCode) {
      console.log('🔍 [InviteCode] 获取到邀请码:', inviteCode);
      // 存储到 localStorage
      localStorage.setItem('inviteCode', inviteCode);
      
      // 检查用户是否已登录
      const token = localStorage.getItem('token');
      if (!token) {
        // 未登录，自动跳转到 /user 页面
        console.log('🔍 [InviteCode] 用户未登录，跳转到 /user 页面');
        
        // 如果当前不在 /user 页面，则跳转
        if (pathname !== '/user') {
          router.push(`/user?inviteCode=${inviteCode}`);
        }
      } else {
        console.log('🔍 [InviteCode] 用户已登录，邀请码已保存');
      }
    }
  }, [searchParams, onShowLogin, router, pathname]);

  return null;
}
