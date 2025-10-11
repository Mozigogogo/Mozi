'use client'

import { useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { Toast } from 'antd-mobile'
import { request, setToken } from '@/utils/request'
import { Interface } from '@/utils/constants'

export default function WalletAccountSync() {
  const hasPostedRef = useRef(false)
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
    // 连接成功：把地址视为“唯一标识”写入本地，并可上报后端
    if (isConnected && address) {
      try {
        // 将钱包唯一标识写入 Cookie（30 天），避免存入 localStorage
        setCookie('wallet_address', address)
        setCookie('wallet_chainId', String(chainId || ''))
      } catch {}

      // 避免重复上报
      if (!hasPostedRef.current) {
        hasPostedRef.current = true
        request({
          url: Interface.MOZI_LOGIN,
          method: 'POST',
          data: { address, chainId }
        }).then((res) => {
          // 兼容不同返回结构
          const token = res?.token || res?.data?.token
          const userInfo = res?.user || res?.data?.user
          if (token) setToken(token)
          if (userInfo) {
            try { localStorage.setItem('userInfo', JSON.stringify(userInfo)) } catch {}
          }
        }).catch(() => {
          // 仅提示，不打断流程
          Toast.show('登录上报失败（仅地址已本地保存）')
        })
      }
    }

    // 断开连接：清理本地钱包信息（不动业务 token）
    if (status === 'disconnected') {
      deleteCookie('wallet_address')
      deleteCookie('wallet_chainId')
      hasPostedRef.current = false
    }
  }, [isConnected, address, chainId, status])

  return null
}


