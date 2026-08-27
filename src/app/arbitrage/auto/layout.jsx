import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: '自动套利',
  description:
    'Mozi AutoArb 自动套利：连接交易所 API，自动执行 Funding、跨所价差与基差套利策略。',
  path: '/arbitrage/auto',
});

export default function ArbitrageAutoLayout({ children }) {
  return children;
}
