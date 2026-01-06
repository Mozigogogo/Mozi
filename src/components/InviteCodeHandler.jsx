'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * 邀请码处理组件
 * 从 URL 参数中获取邀请码，存储并触发登录弹窗
 */
export default function InviteCodeHandler({ onShowLogin }) {
  const searchParams = useSearchParams();

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
        // 未登录，触发登录弹窗
        console.log('🔍 [InviteCode] 用户未登录，触发登录弹窗');
        if (onShowLogin) {
          onShowLogin();
        }
      } else {
        console.log('🔍 [InviteCode] 用户已登录，邀请码已保存');
      }
    }
  }, [searchParams, onShowLogin]);

  return null;
}
