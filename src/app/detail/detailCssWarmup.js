/**
 * 详情页样式预热：把详情相关 CSS module 挂进「已常驻 / 路由 layout」模块图。
 * - PC：由 PCLayout 静态引入，进详情前样式表已在文档中，避免首屏 FOUC
 * - 路由：由 detail/layout 引入，直达 /detail 时 CSS 走 layout 关键路径
 *
 * 仅作 side-effect import，不要删掉对 styles 的引用（防止打包抖动）。
 */
import detailPageStyles from './page.module.less';
import pcCoinDetailStyles from '@/components/PCCoinDetail/index.module.less';
import pcLayoutStyles from '@/components/PCLayout/index.module.less';

export const DETAIL_CSS_WARMUP = {
  page: detailPageStyles?.detailRouteShell || detailPageStyles?.container || '1',
  pcCoinDetail: pcCoinDetailStyles?.root || Object.keys(pcCoinDetailStyles || {})[0] || '1',
  pcLayout: pcLayoutStyles?.contentMainDetail || pcLayoutStyles?.layout || '1',
};
