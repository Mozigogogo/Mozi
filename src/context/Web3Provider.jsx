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
  themeVariables: {
    '--apkt-z-index': 9999,
    '--apkt-accent': '#11B787',
  },
  featuredWalletIds: [],
  enableAnalytics: false,
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
    // 打开钱包信息（已连接情况下显示账户信息视图）
    window.__openWalletInfo = () => {
      try {
        // 部分版本支持通过 view 指定账户视图
        modal.open?.({ view: 'Account' })
      } catch (e) {
        try {
          // 回退：直接打开 modal，已连接时会显示账户信息
          modal.open?.()
        } catch (err) {
          console.warn('[Web3Provider] open wallet info failed', err)
        }
      }
    }
  }

  // 动态调整 AppKit 弹窗尺寸（穿透 Shadow DOM）
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new MutationObserver(() => {
      // 查找所有可能的弹窗元素
      const modalElements = document.querySelectorAll('appkit-modal, w3m-modal, wcm-modal, wui-modal');
      
      modalElements.forEach(modalEl => {
        if (modalEl && modalEl.shadowRoot) {
          // 检查是否已经注入过样式
          if (!modalEl.shadowRoot.querySelector('#custom-modal-size')) {
            const style = document.createElement('style');
            style.id = 'custom-modal-size';
            style.textContent = `
              /* 桌面端尺寸 */
              wui-card {
                max-width: 480px !important;
                width: 90vw !important;
                max-height: 85vh !important;
              }
              
              /* 移动端占满屏幕 */
              @media (max-width: 768px) {
                wui-card {
                  max-width: 100vw !important;
                  width: 100vw !important;
                  max-height: 90vh !important;
                  margin: 0 !important;
                  border-radius: 16px 16px 0 0 !important;
                }
                
                /* 移除外层容器的 padding */
                wui-flex[data-type="vertical"] {
                  padding: 0 !important;
                }
                
                /* 调整内容区域 */
                wui-flex {
                  width: 100% !important;
                  max-width: 100% !important;
                }
              }
            `;
            modalEl.shadowRoot.appendChild(style);
            console.log('[Web3Provider] 已注入弹窗尺寸样式');
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  // 仅客户端渲染，无需 cookies 初始态
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}


