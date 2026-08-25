/**
 * 详情页样式预热：把详情整棵组件树的 CSS module 挂进 layout / PC 壳模块图，
 * 使样式随路由 layout 或 PCLayout 一并下发，而不是等 client page chunk 注入（FOUC）。
 *
 * 仅作 side-effect import；保留对 styles 的引用，防止打包 tree-shake 掉。
 */
import detailPageStyles from './page.module.less';
import pcCoinDetailStyles from '@/components/PCCoinDetail/index.module.less';
import pcLayoutStyles from '@/components/PCLayout/index.module.less';
import klineChartStyles from '@/components/KlineChart/index.module.less';
import orderBookStyles from '@/components/OrderBook/index.module.less';
import moziCardStyles from '@/components/MoziCard/index.module.less';
import moziGridStyles from '@/components/MoziGrid/index.module.less';
import skeletonStyles from '@/components/Skeleton/index.module.less';
import pcRightTopMarqueeStyles from '@/components/PCRightTopMarquee/index.module.less';
import highlightAreaStyles from '@/components/HighlightArea/index.module.less';
import addCollectStyles from '@/components/AddCollect/index.module.less';
import floatingRobotPcStyles from '@/components/FloatingRobotPc/index.module.less';
import navBarStyles from '@/components/NavBar/index.less';
import aiChatModalPcStyles from '@/components/AiChatModalPc/index.module.less';
import exchangePickerStyles from '@/components/ExchangePickerModal/index.module.less';

function cssAnchor(styles, ...preferred) {
  for (const key of preferred) {
    if (styles?.[key]) return styles[key];
  }
  const first = Object.keys(styles || {})[0];
  return first ? styles[first] : '1';
}

export const DETAIL_CSS_WARMUP = {
  page: cssAnchor(detailPageStyles, 'pcContentLayout', 'container', 'detailRouteShell'),
  pcCoinDetail: cssAnchor(pcCoinDetailStyles, 'root'),
  pcLayout: cssAnchor(pcLayoutStyles, 'contentMainDetail', 'layout'),
  klineChart: cssAnchor(klineChartStyles, 'chartContainer', 'container'),
  orderBook: cssAnchor(orderBookStyles, 'container', 'orderBook'),
  moziCard: cssAnchor(moziCardStyles, 'card', 'container'),
  moziGrid: cssAnchor(moziGridStyles, 'grid', 'container'),
  skeleton: cssAnchor(skeletonStyles, 'skeleton'),
  pcRightTopMarquee: cssAnchor(pcRightTopMarqueeStyles, 'marquee', 'root'),
  highlightArea: cssAnchor(highlightAreaStyles, 'highlightArea', 'container'),
  addCollect: cssAnchor(addCollectStyles, 'collect', 'container'),
  floatingRobotPc: cssAnchor(floatingRobotPcStyles, 'robot', 'container'),
  navBar: cssAnchor(navBarStyles, 'navBar'),
  aiChatModalPc: cssAnchor(aiChatModalPcStyles, 'root'),
  exchangePicker: cssAnchor(exchangePickerStyles, 'overlay'),
};
