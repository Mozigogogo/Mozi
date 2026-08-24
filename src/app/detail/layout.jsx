import pageStyles from './page.module.less';
import pcCoinDetailStyles from '@/components/PCCoinDetail/index.module.less';
import { DETAIL_CSS_WARMUP } from './detailCssWarmup';
import { buildPageMetadata } from '@/utils/seoConfig';

/**
 * 详情页布局壳：
 * - 将 page / PCCoinDetail 的 CSS module 挂到本路由 layout 关键路径
 * - 避免仅依赖 client page chunk 时注入样式导致的首屏 FOUC
 * - 移动端底色仍由 page.module.less 的 .container 负责
 */
export async function generateMetadata({ searchParams }) {
  const symbol = String(searchParams?.symbol || '').trim().toUpperCase();
  const isUsStock = searchParams?.type === 'usStock';
  const label = symbol || (isUsStock ? '美股' : '币种');

  return buildPageMetadata({
    title: symbol ? `${symbol} 行情详情` : '行情详情',
    description: symbol
      ? `${symbol} 实时价格、涨跌幅、深度、资金费率与相关板块分析${isUsStock ? '（美股）' : ''}。`
      : '查看加密货币或美股的实时行情、深度与相关数据分析。',
    path: symbol
      ? `/detail?symbol=${encodeURIComponent(symbol)}${isUsStock ? '&type=usStock' : ''}`
      : '/detail',
    keywords: [label, symbol, '行情', '价格', '墨子', 'Mozi'].filter(Boolean),
  });
}

export default function DetailLayout({ children }) {
  void DETAIL_CSS_WARMUP;
  void pcCoinDetailStyles;

  return (
    <div className={pageStyles.detailRouteShell} style={{ minHeight: '100vh' }}>
      {children}
    </div>
  );
}
