import pageStyles from './page.module.less';
import pcCoinDetailStyles from '@/components/PCCoinDetail/index.module.less';
import { DETAIL_CSS_WARMUP } from './detailCssWarmup';

/**
 * 详情页布局壳：
 * - 将 page / PCCoinDetail 的 CSS module 挂到本路由 layout 关键路径
 * - 避免仅依赖 client page chunk 时注入样式导致的首屏 FOUC
 * - 移动端底色仍由 page.module.less 的 .container 负责
 */
export default function DetailLayout({ children }) {
  void DETAIL_CSS_WARMUP;
  void pcCoinDetailStyles;

  return (
    <div className={pageStyles.detailRouteShell} style={{ minHeight: '100vh' }}>
      {children}
    </div>
  );
}
