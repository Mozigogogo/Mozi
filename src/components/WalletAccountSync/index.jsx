'use client'

import { useEffect } from 'react'
import { useAccount } from 'wagmi'

export default function WalletAccountSync() {
  const { address, chainId, status, isConnected } = useAccount()

  // 简单的 Cookie 工具（客户端可写；若需 HttpOnly 请改由后端设置）
  const setCookie = (name, value, days = 30) => {
    try {
      const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()
      document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
        value ?? ''
      )}; Expires=${expires}; Path=/; SameSite=Lax`
    } catch {}
  }
  const deleteCookie = (name) => {
    try {
      document.cookie = `${encodeURIComponent(name)}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax`
    } catch {}
  }

  useEffect(() => {
    // 连接成功：把地址视为"唯一标识"写入本地
    if (isConnected && address) {
      try {
        // 将钱包唯一标识写入 Cookie（30 天），避免存入 localStorage
        setCookie('wallet_address', address)
        setCookie('wallet_chainId', String(chainId || ''))
      } catch {}
    }

    // 断开连接：清理本地钱包信息（不动业务 token）
    if (status === 'disconnected') {
      deleteCookie('wallet_address')
      deleteCookie('wallet_chainId')
    }
  }, [isConnected, address, chainId, status])

  return null
}


