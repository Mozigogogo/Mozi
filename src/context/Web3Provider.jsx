'use client'

import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, http, useAccount, useSwitchChain, useWalletClient } from 'wagmi'
import { mainnet, arbitrum, arbitrumSepolia } from 'wagmi/chains'
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
const useArbitrumSepolia = process.env.NEXT_PUBLIC_USE_ARBITRUM_SEPOLIA === 'true'

if (!projectId) {
  // eslint-disable-next-line no-console
  console.warn('[Web3Provider] 缺少 NEXT_PUBLIC_PROJECT_ID，WalletConnect 相关钱包可能不可用')
}

// 使用显式 RPC，避免默认公共节点在浏览器端出现 CORS 噪音
const MAINNET_RPC_URL =
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://ethereum-rpc.publicnode.com'
const ARBITRUM_RPC_URL =
  process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arbitrum-one-rpc.publicnode.com'
const ARBITRUM_SEPOLIA_RPC_URL =
  process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || 'https://arbitrum-sepolia-rpc.publicnode.com'

const selectedArbitrumChain = useArbitrumSepolia ? arbitrumSepolia : arbitrum

const queryClient = new QueryClient()

const wagmiConfig = getDefaultConfig({
  appName: 'Mozi H5',
  projectId: projectId || 'missing-project-id',
  chains: [mainnet, selectedArbitrumChain],
  transports: {
    [mainnet.id]: http(MAINNET_RPC_URL),
    [arbitrum.id]: http(ARBITRUM_RPC_URL),
    [arbitrumSepolia.id]: http(ARBITRUM_SEPOLIA_RPC_URL),
  },
  ssr: true,
})

function WalletModalBridge() {
  const { openConnectModal } = useConnectModal()
  const { openAccountModal } = useAccountModal()
  const { openChainModal } = useChainModal()
  const { address } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { data: walletClient } = useWalletClient()

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.__openRainbowKit = () => {
      if (typeof openConnectModal === 'function') {
        openConnectModal()
        return true
      }
      if (typeof openAccountModal === 'function') {
        openAccountModal()
        return true
      }
      return false
    }
    window.__openWalletInfo = () => openAccountModal?.()
    window.__openChainModal = () => openChainModal?.()
    window.__getConnectedEvmAddress = () => address || walletClient?.account?.address || ''
    window.__switchEvmChain = async (chainId) => {
      if (typeof switchChainAsync !== 'function') return false
      await switchChainAsync({ chainId })
      return true
    }
    window.__sendEvmTransaction = async (tx = {}) => {
      if (!walletClient?.sendTransaction) return null
      const account = tx.account || walletClient?.account || address
      return walletClient.sendTransaction({
        ...tx,
        account,
      })
    }
    return () => {
      try { delete window.__openRainbowKit } catch {}
      try { delete window.__openWalletInfo } catch {}
      try { delete window.__openChainModal } catch {}
      try { delete window.__getConnectedEvmAddress } catch {}
      try { delete window.__switchEvmChain } catch {}
      try { delete window.__sendEvmTransaction } catch {}
    }
  }, [address, openAccountModal, openChainModal, openConnectModal, switchChainAsync, walletClient])

  return null
}

export default function Web3Provider({ children }) {
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={true}>
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


