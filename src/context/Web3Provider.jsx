'use client'

import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { createAppKit } from '@reown/appkit/react'
import { mainnet, arbitrum } from '@reown/appkit/networks'
import { WagmiProvider } from 'wagmi'

// 读取项目ID（在构建时注入 NEXT_PUBLIC_PROJECT_ID 更稳妥）
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID

if (!projectId) {
  // 在客户端安全提示（不会中断渲染）
  // eslint-disable-next-line no-console
  console.warn('[Web3Provider] 缺少 NEXT_PUBLIC_PROJECT_ID，AppKit 将无法正常工作')
}

const queryClient = new QueryClient()

// 适配器（支持 SSR 延迟水合）
const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  networks: [mainnet, arbitrum],
  projectId,
})

// 创建全局 Modal（只需创建一次）
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [mainnet, arbitrum],
  defaultNetwork: mainnet,
  metadata: {
    name: 'Mozi H5',
    description: 'Mozi H5 Web3 Connect',
    url: 'https://moziinnovations.com',
    icons: ['https://avatars.githubusercontent.com/u/179229932']
  },
})

export default function Web3Provider({ children }) {
  // 暴露一个全局函数，供页面点击时打开钱包连接弹窗
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    window.__openAppKit = () => {
      try {
        modal.open?.()
      } catch (e) {
        console.warn('[Web3Provider] open modal failed', e)
      }
    }
  }

  // 仅客户端渲染，无需 cookies 初始态
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}


