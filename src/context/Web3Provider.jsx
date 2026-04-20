'use client'

import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, http } from 'wagmi'
import { mainnet, arbitrum } from 'wagmi/chains'
import {
  RainbowKitProvider,
  getDefaultConfig,
  lightTheme,
  useConnectModal,
  useAccountModal,
  useChainModal,
} from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

// WalletConnect Cloud projectId（RainbowKit 通过它连接 WC 协议）
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID

if (!projectId) {
  // eslint-disable-next-line no-console
  console.warn('[Web3Provider] 缺少 NEXT_PUBLIC_PROJECT_ID，WalletConnect 相关钱包可能不可用')
}

const queryClient = new QueryClient()

const wagmiConfig = getDefaultConfig({
  appName: 'Mozi H5',
  projectId: projectId || 'missing-project-id',
  chains: [mainnet, arbitrum],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
  },
  ssr: true,
})

function WalletModalBridge() {
  const { openConnectModal } = useConnectModal()
  const { openAccountModal } = useAccountModal()
  const { openChainModal } = useChainModal()

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.__openRainbowKit = () => openConnectModal?.()
    window.__openWalletInfo = () => openAccountModal?.()
    window.__openChainModal = () => openChainModal?.()
    return () => {
      try { delete window.__openRainbowKit } catch {}
      try { delete window.__openWalletInfo } catch {}
      try { delete window.__openChainModal } catch {}
    }
  }, [openAccountModal, openChainModal, openConnectModal])

  return null
}

export default function Web3Provider({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: '#11B787',
            accentColorForeground: '#ffffff',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
        >
          <WalletModalBridge />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}


