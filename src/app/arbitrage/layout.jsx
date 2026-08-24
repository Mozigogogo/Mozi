import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: '套利雷达',
  description: '加密货币跨所套利机会实时扫描，对比价差与可交易平台。',
  path: '/arbitrage',
});

export default function ArbitrageLayout({ children }) {
  return children;
}
