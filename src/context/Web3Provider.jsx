'use client'

import React, { useEffect, useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, http, useAccount, useSwitchChain, useWalletClient } from 'wagmi'
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

// 使用显式 RPC，避免默认公共节点在浏览器端出现 CORS 噪音
const MAINNET_RPC_URL =
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://ethereum-rpc.publicnode.com'
const ARBITRUM_RPC_URL =
  process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arbitrum-one-rpc.publicnode.com'

const queryClient = new QueryClient()

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
  // 必须在整棵子树首帧就提供 WagmiProvider，否则 RainbowKit / ConnectButton 会立刻调用 useConfig 报错。
  // ssr: true 为 RainbowKit + Next 推荐写法，避免在服务端走 WalletConnect 的 indexedDB 路径。
  const wagmiConfig = useMemo(
    () =>
      getDefaultConfig({
        appName: 'Mozi H5',
        projectId: projectId || 'missing-project-id',
        chains: [mainnet, arbitrum],
        transports: {
          [mainnet.id]: http(MAINNET_RPC_URL),
          [arbitrum.id]: http(ARBITRUM_RPC_URL),
        },
        ssr: true,
      }),
    []
  )

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


