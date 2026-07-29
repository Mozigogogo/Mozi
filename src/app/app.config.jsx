// 路由配置
export const routes = [
  {
    path: '/',
    name: '首页',
    i18nKey: 'common.home',
    icon: 'home',
    showTab: true
  },
  {
    path: '/find',
    name: '发现',
    i18nKey: 'common.find',
    icon: 'compass',
    showTab: true
  },
  {
    path: '/community',
    name: '社区',
    i18nKey: 'common.community',
    icon: 'message',
    showTab: true
  },
  {
    path: '/user',
    name: '我的',
    i18nKey: 'common.profile',
    icon: 'user',
    showTab: true
  },
  {
    path: '/detail',
    name: '币种详情',
    showTab: false
  },
  {
    path: '/search',
    name: '搜索',
    showTab: false
  },
  {
    path: '/market',
    name: '市场',
    showTab: false
  },
  {
    path: '/industry',
    name: '行业',
    showTab: false
  },
  {
    path: '/contract',
    name: '合约',
    showTab: false
  },
  {
    path: '/putcallratio',
    name: '多空比',
    showTab: false
  },
  {
    path: '/positionsize',
    name: '持仓量',
    showTab: false
  },
  {
    path: '/fundingrate',
    name: '资金费率',
    showTab: false
  },
  {
    path: '/tradevol',
    name: '成交额',
    showTab: false
  },
  {
    path: '/arbitrage',
    name: '套利专区',
    showTab: false
  },
  {
    path: '/arbitrage/detail',
    name: '套利详情',
    showTab: false
  }
];

// 底部导航配置
export const tabBarList = routes.filter(route => route.showTab);