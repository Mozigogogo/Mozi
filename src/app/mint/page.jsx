'use client'

import React, { useMemo, useState } from 'react'
import { Button, Input, Toast } from 'antd-mobile'
import { encodeFunctionData, getAddress, parseUnits } from 'viem'
import { useAccount, useChainId, useSwitchChain, useWalletClient } from 'wagmi'

const USE_ARBITRUM_SEPOLIA = process.env.NEXT_PUBLIC_USE_ARBITRUM_SEPOLIA === 'true'
const TARGET_CHAIN_ID = USE_ARBITRUM_SEPOLIA ? 421614 : 42161
const DEFAULT_TOKEN_ADDRESS = USE_ARBITRUM_SEPOLIA
  ? '0xD58345bEf43eE705312777dDA76dD630486Df10C'
  : '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'

function shortAddr(addr = '') {
  const s = String(addr || '')
  if (!s) return ''
  return `${s.slice(0, 6)}...${s.slice(-4)}`
}

export default function MintPage() {
  const [tokenAddress, setTokenAddress] = useState(DEFAULT_TOKEN_ADDRESS)
  const [toAddress, setToAddress] = useState('')
  const [amountUsdt, setAmountUsdt] = useState('1000')
  const [txHash, setTxHash] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { address: connectedAddress } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { data: walletClient } = useWalletClient()

  const resolvedToAddress = toAddress || connectedAddress || ''

  const openConnect = () => {
    if (typeof window === 'undefined') return
    if (typeof window.__openRainbowKit === 'function') {
      const ok = window.__openRainbowKit()
      if (ok === false) Toast.show({ content: '钱包弹窗未就绪，请稍后重试' })
      return
    }
    Toast.show({ content: '当前环境未初始化钱包连接' })
  }

  const mint = async () => {
    if (!walletClient?.sendTransaction) {
      Toast.show({ content: '未检测到可用的钱包发送能力，请先连接钱包' })
      openConnect()
      return
    }
    if (!tokenAddress) {
      Toast.show({ content: '请先填写 MockUSDT 合约地址' })
      return
    }
    if (!resolvedToAddress) {
      Toast.show({ content: '请先连接钱包或填写接收地址' })
      openConnect()
      return
    }
    if (!amountUsdt || Number(amountUsdt) <= 0) {
      Toast.show({ content: '请输入要 mint 的数量' })
      return
    }

    setSubmitting(true)
    try {
      // 1) 切链
      if (chainId !== TARGET_CHAIN_ID && typeof switchChainAsync === 'function') {
        await switchChainAsync({ chainId: TARGET_CHAIN_ID })
      }

      // 2) 参数校验/格式化
      const token = getAddress(String(tokenAddress))
      const to = getAddress(String(resolvedToAddress))
      if (connectedAddress && token.toLowerCase() === connectedAddress.toLowerCase()) {
        Toast.show({ content: '你把“合约地址”填成了钱包地址，请换成 MockUSDT 部署出来的 0x... 合约地址' })
        return
      }
      const amountRaw = parseUnits(String(amountUsdt), 6) // MockUSDT decimals = 6

      // 3) 调用 mint(to, amount)
      const data = encodeFunctionData({
        abi: [
          {
            type: 'function',
            name: 'mint',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'value', type: 'uint256' },
            ],
            outputs: [{ name: '', type: 'bool' }],
          },
        ],
        functionName: 'mint',
        args: [to, amountRaw],
      })

      const hash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: token,
        data,
      })
      if (!hash) {
        Toast.show({ content: '未获取到交易哈希，可能已取消' })
        return
      }
      setTxHash(String(hash))
      Toast.show({ content: '已发起 mint 交易，请在钱包确认并等待链上确认' })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Mint] failed', e)
      Toast.show({ content: e?.shortMessage || e?.message || 'mint 失败' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Mint MockUSDT</div>
      <div style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
        当前网络：{USE_ARBITRUM_SEPOLIA ? 'Arbitrum Sepolia' : 'Arbitrum One'}
        <br />
        当前链 ID：{chainId || '-'}
        <br />
        仅合约 owner 可 mint；如果你用的不是部署该 MockUSDT 的钱包，交易会失败。
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>MockUSDT 合约地址</div>
          <Input
            placeholder="0x..."
            value={tokenAddress}
            onChange={setTokenAddress}
            clearable
          />
        </div>

        <div>
          <div style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>接收地址（默认当前钱包）</div>
          <Input
            placeholder={connectedAddress ? connectedAddress : '0x...'}
            value={toAddress}
            onChange={setToAddress}
            clearable
          />
        </div>

        <div>
          <div style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>数量（USDT 单位，6 位小数）</div>
          <Input
            placeholder="1000"
            value={amountUsdt}
            onChange={setAmountUsdt}
            clearable
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button color="primary" fill="solid" onClick={openConnect}>
            连接钱包
          </Button>
          <Button color="success" fill="solid" loading={submitting} onClick={mint}>
            Mint
          </Button>
        </div>

        <div style={{ marginTop: 4, fontSize: 13, color: '#374151' }}>
          当前钱包：{connectedAddress ? shortAddr(connectedAddress) : '未连接'}
        </div>

        {txHash ? (
          <div style={{ marginTop: 8, padding: 12, borderRadius: 12, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>TxHash</div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{txHash}</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

