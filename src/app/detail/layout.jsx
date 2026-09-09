import pageStyles from './page.module.less';
import { DETAIL_CSS_WARMUP } from './detailCssWarmup';
import { buildPageMetadata, BRAND_LEGAL_NAME } from '@/utils/seoConfig';

/**
 * 详情页布局壳：
 * - 通过 detailCssWarmup 把整页 CSS 挂到本路由 layout 加载路径
 * - 避免仅依赖 client page chunk 时注入样式导致的首屏 FOUC
 */
export async function generateMetadata({ searchParams }) {
  const symbol = String(searchParams?.symbol || '').trim().toUpperCase();
  const isUsStock = searchParams?.type === 'usStock';
  const label = symbol || (isUsStock ? '美股' : '币种');
  const brandSuffix = isUsStock
    ? `${BRAND_LEGAL_NAME} 美股详情`
    : `${BRAND_LEGAL_NAME} 币种详情`;

  return buildPageMetadata({
    title: symbol ? `${symbol} | ${brandSuffix}` : brandSuffix,
    description: symbol
      ? `${BRAND_LEGAL_NAME}（Mozi / 墨子）${symbol} ${isUsStock ? '美股' : '币种'}详情：实时价格、涨跌幅、深度与相关数据分析。`
      : `${BRAND_LEGAL_NAME}（Mozi / 墨子）行情详情：查看加密货币或美股的实时行情、深度与相关数据分析。`,
    path: symbol
      ? `/detail?symbol=${encodeURIComponent(symbol)}${isUsStock ? '&type=usStock' : ''}`
      : '/detail',
    keywords: [
      label,
      symbol,
      '行情',
      '价格',
      '币种详情',
      BRAND_LEGAL_NAME,
      '墨子',
      'Mozi',
    ].filter(Boolean),
  });
}

export default function DetailLayout({ children }) {
  void DETAIL_CSS_WARMUP;

  return (
    <div className={pageStyles.detailRouteShell} style={{ minHeight: '100vh' }}>
      {children}
    </div>
  );
}
