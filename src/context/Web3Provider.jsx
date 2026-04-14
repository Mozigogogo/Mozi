'use client'

import React, { useCallback, useEffect, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum } from '@reown/appkit/networks'

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

// 关键优化：
// - createAppKit() 会在初始化时触发 WalletConnect / Coinbase 等外网请求
// - 在网络不通/被墙的环境下，会把首屏 window.load 拖到几十秒（你日志里 75s）
// 所以我们把 createAppKit 延迟到“用户真正点击连接钱包”再执行。

export default function Web3Provider({ children }) {
  const modalRef = useRef(null)

  const ensureModal = useCallback(async () => {
    if (modalRef.current) return modalRef.current
    const { createAppKit } = await import('@reown/appkit/react')
    modalRef.current = createAppKit({
      adapters: [wagmiAdapter],
      projectId,
      networks: [mainnet, arbitrum],
      defaultNetwork: mainnet,
      metadata: {
        name: 'Mozi H5',
        description: 'Mozi H5 Web3 Connect',
        // 本地开发用当前 origin，避免 metadata.url 警告 & 潜在异常
        url: typeof window !== 'undefined' ? window.location.origin : 'https://moziinnovations.com',
        icons: ['https://avatars.githubusercontent.com/u/179229932'],
      },
      themeVariables: {
        '--apkt-z-index': 9999,
        '--apkt-accent': '#11B787',
      },
      featuredWalletIds: [],
      enableAnalytics: false,
    })
    return modalRef.current
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.__openAppKit = async () => {
      try {
        const modal = await ensureModal()
        modal.open?.()
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[Web3Provider] open modal failed', e)
      }
    }
    window.__openWalletInfo = async () => {
      try {
        const modal = await ensureModal()
        modal.open?.({ view: 'Account' })
      } catch (e) {
        try {
          const modal = await ensureModal()
          modal.open?.()
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[Web3Provider] open wallet info failed', err)
        }
      }
    }
    return () => {
      try { delete window.__openAppKit } catch {}
      try { delete window.__openWalletInfo } catch {}
    }
  }, [ensureModal])

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


