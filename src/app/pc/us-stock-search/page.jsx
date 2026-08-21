'use client';

import { useMemo, Suspense, useEffect, useState } from 'react';
import { Card, Table, Tag, Empty } from 'antd';
import { HeartOutlined, BellOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { jump2Detail } from '@/utils/core';
import { getPcSearchRoute, validateSearchSymbol } from '@/utils/searchValidate';
import { Loading } from '@/components/Loading';
import searchStyles from '@/components/PCSearchResults/index.module.less';
import styles from './page.module.less';

const CEX_LOGO = (name) =>
  `https://coinlogo-1317406749.cos.ap-shanghai.myqcloud.com/cex_logo/cex_logo/${encodeURIComponent(name)}.png`;

const STOCK_LOGO = (symbol) =>
  `https://coinlogo-1317406749.cos.ap-shanghai.myqcloud.com/stock/${String(symbol || 'NVDA').toUpperCase()}.png`;

/** 按接口契约构造的演示数据 */
const MOCK_BY_SYMBOL = {
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    logo: STOCK_LOGO('NVDA'),
    asset_class: 'us_equity',
    listing_market: 'NASDAQ',
    sector: 'Technology',
    session_market: 'US',
    issuances: ['bStock', 'xStock', 'ondo_equity', 'other'],
    venues: {
      spot_exchanges: ['Binance', 'Bitget', 'Bybit', 'Gate', 'Kraken', 'OKX'],
      perp_exchanges: ['Binance', 'Bitget', 'Bybit', 'HTX', 'Hyperliquid', 'Kraken', 'Kucoin', 'MEXC', 'OKX'],
    },
    sessions: [
      {
        instrument: 'spot',
        timezone: 'America/New_York',
        pre_market: '04:00-09:30',
        regular: '09:30-16:00',
        post_market: '16:00-20:00',
        is_open: true,
        note: '美股现货代币跟随 NY 时段，闭市停在最后快照（看 ts 判新鲜度）',
      },
      {
        instrument: 'perp',
        timezone: 'UTC',
        pre_market: null,
        regular: '00:00-24:00',
        post_market: null,
        is_open: true,
        note: '合成永续 24/7',
      },
    ],
    fees: [
      { exchange: 'Binance', instrument: 'spot', taker_fee: null, maker_fee: null },
      { exchange: 'OKX', instrument: 'spot', taker_fee: null, maker_fee: null },
      { exchange: 'Hyperliquid', instrument: 'perp', taker_fee: null, maker_fee: null },
    ],
    price: {
      spot: { last_price: '209.54', price_change_percent: '0.28', exchange: 'OKX', ts: 1781777499167 },
      perp: { last_price: '210.10', price_change_percent: '0.66', exchange: 'Hyperliquid', ts: 1781777499167 },
    },
    roi: {
      price_change_1_day: '1.23',
      price_change_7_day: '-0.85',
      price_change_1_month: '5.10',
      price_change_1_year: '48.30',
      ref_exchange: 'Hyperliquid',
    },
  },
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    logo: STOCK_LOGO('AAPL'),
    asset_class: 'us_equity',
    listing_market: 'NASDAQ',
    sector: 'Technology',
    session_market: 'US',
    issuances: ['bStock', 'xStock', 'ondo_equity'],
    venues: {
      spot_exchanges: ['Binance', 'OKX', 'Bybit', 'Gate'],
      perp_exchanges: ['Binance', 'OKX', 'Bybit', 'Hyperliquid', 'MEXC'],
    },
    sessions: [
      {
        instrument: 'spot',
        timezone: 'America/New_York',
        pre_market: '04:00-09:30',
        regular: '09:30-16:00',
        post_market: '16:00-20:00',
        is_open: false,
        note: '美股现货代币跟随 NY 时段',
      },
      {
        instrument: 'perp',
        timezone: 'UTC',
        pre_market: null,
        regular: '00:00-24:00',
        post_market: null,
        is_open: true,
        note: '合成永续 24/7',
      },
    ],
    fees: [
      { exchange: 'Binance', instrument: 'spot', taker_fee: '0.1%', maker_fee: '0.1%' },
      { exchange: 'OKX', instrument: 'perp', taker_fee: '0.05%', maker_fee: '0.02%' },
    ],
    price: {
      spot: { last_price: '227.18', price_change_percent: '1.04', exchange: 'Binance', ts: 1781777499167 },
      perp: { last_price: '227.45', price_change_percent: '1.12', exchange: 'OKX', ts: 1781777499167 },
    },
    roi: {
      price_change_1_day: '1.04',
      price_change_7_day: '2.10',
      price_change_1_month: '-1.20',
      price_change_1_year: '22.40',
      ref_exchange: 'Binance',
    },
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    logo: STOCK_LOGO('TSLA'),
    asset_class: 'us_equity',
    listing_market: 'NASDAQ',
    sector: 'Consumer Cyclical',
    session_market: 'US',
    issuances: ['xStock', 'ondo_equity', 'other'],
    venues: {
      spot_exchanges: ['Binance', 'Bitget', 'OKX', 'Kraken'],
      perp_exchanges: ['Binance', 'Bybit', 'HTX', 'Hyperliquid', 'OKX'],
    },
    sessions: [
      {
        instrument: 'spot',
        timezone: 'America/New_York',
        pre_market: '04:00-09:30',
        regular: '09:30-16:00',
        post_market: '16:00-20:00',
        is_open: true,
        note: '美股现货代币跟随 NY 时段',
      },
      {
        instrument: 'perp',
        timezone: 'UTC',
        pre_market: null,
        regular: '00:00-24:00',
        post_market: null,
        is_open: true,
        note: '合成永续 24/7',
      },
    ],
    fees: [
      { exchange: 'Bitget', instrument: 'spot', taker_fee: null, maker_fee: null },
      { exchange: 'Bybit', instrument: 'perp', taker_fee: '0.055%', maker_fee: '0.02%' },
    ],
    price: {
      spot: { last_price: '248.50', price_change_percent: '-2.28', exchange: 'OKX', ts: 1781777499167 },
      perp: { last_price: '249.10', price_change_percent: '-1.95', exchange: 'Hyperliquid', ts: 1781777499167 },
    },
    roi: {
      price_change_1_day: '-2.28',
      price_change_7_day: '3.40',
      price_change_1_month: '8.60',
      price_change_1_year: '35.20',
      ref_exchange: 'Hyperliquid',
    },
  },
};

function formatPct(value) {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return '--';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function pctTag(value) {
  const n = parseFloat(value) || 0;
  return <Tag color={n >= 0 ? 'success' : 'error'}>{formatPct(value)}</Tag>;
}

function instrumentLabel(value, t) {
  if (value === 'perp' || value === 'contract') {
    return t('search.contract', { defaultValue: '合约' });
  }
  return t('search.spot', { defaultValue: '现货' });
}

function formatSessionRange(session) {
  const parts = [];
  if (session.pre_market) parts.push(`盘前 ${session.pre_market}`);
  if (session.regular) parts.push(`盘中 ${session.regular}`);
  if (session.post_market) parts.push(`盘后 ${session.post_market}`);
  return parts.join(' · ') || '--';
}

function buildVenueRows(data) {
  const spot = data?.venues?.spot_exchanges || [];
  const perp = data?.venues?.perp_exchanges || [];
  const feeMap = new Map(
    (data?.fees || []).map((item) => [`${item.exchange}|${item.instrument}`, item])
  );
  const sessionMap = new Map((data?.sessions || []).map((item) => [item.instrument, item]));
  const spotLast = data?.price?.spot?.last_price ?? '--';
  const perpLast = data?.price?.perp?.last_price ?? '--';

  const rows = [];
  spot.forEach((exchange, index) => {
    const fee = feeMap.get(`${exchange}|spot`);
    const session = sessionMap.get('spot');
    rows.push({
      key: `spot-${exchange}-${index}`,
      exchange,
      url: CEX_LOGO(`${exchange}.png`),
      instrument: 'spot',
      price: spotLast,
      isOpen: session?.is_open,
      taker_fee: fee?.taker_fee ?? '--',
      maker_fee: fee?.maker_fee ?? '--',
    });
  });
  perp.forEach((exchange, index) => {
    const fee = feeMap.get(`${exchange}|perp`);
    const session = sessionMap.get('perp');
    rows.push({
      key: `perp-${exchange}-${index}`,
      exchange,
      url: CEX_LOGO(`${exchange}.png`),
      instrument: 'perp',
      price: perpLast,
      isOpen: session?.is_open,
      taker_fee: fee?.taker_fee ?? '--',
      maker_fee: fee?.maker_fee ?? '--',
    });
  });
  return rows;
}

/**
 * 美股搜索页
 * 路由：/pc/us-stock-search?keyword=NVDA
 */
function UsStockSearchContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyword = (searchParams.get('keyword') || '').trim().toUpperCase();
  const [gate, setGate] = useState(keyword ? 'loading' : 'invalid');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!keyword) {
        setGate('invalid');
        return;
      }

      setGate('loading');
      const type = await validateSearchSymbol(keyword);
      if (cancelled) return;

      if (type === 'crypto') {
        router.replace(getPcSearchRoute('crypto', keyword));
        return;
      }

      if (type === 'stock') {
        setGate('ready');
        return;
      }

      setGate('invalid');
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [keyword, router]);

  const data = useMemo(() => {
    if (MOCK_BY_SYMBOL[keyword]) return MOCK_BY_SYMBOL[keyword];
    // 校验通过但暂无定制 mock：用关键字套一层结构，便于联调
    return {
      ...MOCK_BY_SYMBOL.NVDA,
      symbol: keyword,
      name: keyword,
      logo: STOCK_LOGO(keyword),
    };
  }, [keyword]);

  const venueRows = useMemo(() => buildVenueRows(data), [data]);

  const spotPrice = data.price?.spot;

  const assetColumns = [
    {
      title: t('home.columns.symbol'),
      dataIndex: 'symbol',
      key: 'symbol',
      render: (_, record) => (
        <div className={searchStyles.coinCell}>
          <img src={record.logo} alt={record.symbol} className={searchStyles.coinIcon} />
          <div className={styles.symbolBlock}>
            <span className={styles.symbolMain}>{record.symbol}</span>
            <span className={styles.symbolSub}>{record.name}</span>
          </div>
        </div>
      ),
    },
    {
      title: '现货最新价',
      key: 'spotPrice',
      align: 'right',
      render: (_, record) => record.spot?.last_price ?? '--',
    },
    {
      title: '现货涨跌',
      key: 'spotChange',
      align: 'center',
      render: (_, record) => pctTag(record.spot?.price_change_percent),
    },
    {
      title: t('home.columns.addFavorites'),
      key: 'favorite',
      align: 'center',
      render: () => <HeartOutlined className={searchStyles.actionIcon} />,
    },
    {
      title: t('home.columns.addMonitor'),
      key: 'monitor',
      align: 'center',
      render: () => <BellOutlined className={searchStyles.actionIcon} />,
    },
  ];

  const assetRows = [
    {
      key: data.symbol,
      symbol: data.symbol,
      name: data.name,
      logo: data.logo || STOCK_LOGO(data.symbol),
      spot: spotPrice,
    },
  ];

  const venueColumns = [
    {
      title: t('search.platform'),
      dataIndex: 'exchange',
      key: 'exchange',
      width: '22%',
      render: (text, record) => (
        <div className={searchStyles.coinCell}>
          <img src={record.url} alt={text} className={searchStyles.coinIcon} />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: t('search.type', { defaultValue: '类型' }),
      dataIndex: 'instrument',
      key: 'instrument',
      align: 'center',
      width: '14%',
      render: (value) => instrumentLabel(value, t),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      width: '16%',
      render: (value) => value ?? '--',
    },
    {
      title: '状态',
      dataIndex: 'isOpen',
      key: 'isOpen',
      align: 'center',
      width: '12%',
      render: (open) => (
        <Tag color={open ? 'success' : 'default'}>{open ? '开市' : '休市'}</Tag>
      ),
    },
    {
      title: 'Taker',
      dataIndex: 'taker_fee',
      key: 'taker_fee',
      align: 'right',
      width: '12%',
      render: (v) => (v == null || v === '' ? '--' : v),
    },
    {
      title: 'Maker',
      dataIndex: 'maker_fee',
      key: 'maker_fee',
      align: 'right',
      width: '12%',
      render: (v) => (v == null || v === '' ? '--' : v),
    },
  ];

  const sessionColumns = [
    {
      title: t('search.type', { defaultValue: '类型' }),
      dataIndex: 'instrument',
      key: 'instrument',
      width: '12%',
      render: (value) => instrumentLabel(value, t),
    },
    {
      title: '时区',
      dataIndex: 'timezone',
      key: 'timezone',
      width: '18%',
    },
    {
      title: '时段',
      key: 'ranges',
      width: '40%',
      render: (_, record) => formatSessionRange(record),
    },
    {
      title: '状态',
      dataIndex: 'is_open',
      key: 'is_open',
      align: 'center',
      width: '10%',
      render: (open) => (
        <Tag color={open ? 'success' : 'default'}>{open ? '开市' : '休市'}</Tag>
      ),
    },
    {
      title: '说明',
      dataIndex: 'note',
      key: 'note',
      width: '20%',
      render: (text) => <span className={styles.noteText}>{text || '--'}</span>,
    },
  ];

  const roiItems = [
    { label: '1日', value: data.roi?.price_change_1_day },
    { label: '7日', value: data.roi?.price_change_7_day },
    { label: '1月', value: data.roi?.price_change_1_month },
    { label: '1年', value: data.roi?.price_change_1_year },
  ];

  if (gate === 'loading') {
    return (
      <div className={`${searchStyles.searchResults} ${searchStyles.searchResultsLoading}`}>
        <div className={searchStyles.loadingWrapper}>
          <Loading tip={t('common.loading')} size={32} />
        </div>
      </div>
    );
  }

  if (gate === 'invalid') {
    return (
      <div className={searchStyles.searchResults}>
        <Empty description={t('search.invalidCoin')} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={`${searchStyles.searchResults} ${styles.results}`}>
        {/* 1. 标的信息：对齐 price.spot / price.perp */}
        <Card title={`标的 (${data.symbol})`} className={searchStyles.resultCard}>
          <Table
            columns={assetColumns}
            dataSource={assetRows}
            rowKey="key"
            pagination={false}
            onRow={() => ({
              onClick: () => jump2Detail(data.symbol, false, { type: 'usStock' }),
              style: { cursor: 'pointer' },
            })}
          />
        </Card>

        {/* 2. 相关板块：sector */}
        <Card title={`${t('search.relatedSections')} (1)`} className={searchStyles.resultCard}>
          <div className={searchStyles.sectionsGrid}>
            <div className={searchStyles.sectionItem}>
              <span className={searchStyles.sectionName}>{data.sector}</span>
            </div>
          </div>
        </Card>

        {/* 交易时段：sessions */}
        <Card
          title={`交易时段 (${(data.sessions || []).length})`}
          className={searchStyles.resultCard}
        >
          <Table
            columns={sessionColumns}
            dataSource={(data.sessions || []).map((item, index) => ({
              ...item,
              key: `${item.instrument}-${index}`,
            }))}
            rowKey="key"
            pagination={false}
            tableLayout="fixed"
          />
        </Card>

        {/* 5. 可交易平台：venues + fees + session */}
        <Card
          title={`可交易${data.symbol}平台 (${venueRows.length})`}
          className={searchStyles.resultCard}
        >
          <Table
            columns={venueColumns}
            dataSource={venueRows}
            rowKey="key"
            pagination={false}
            tableLayout="fixed"
          />
        </Card>

        {/* 6. 收益表现：roi */}
        <Card
          title="收益表现"
          className={searchStyles.resultCard}
        >
          <div className={styles.roiGrid}>
            {roiItems.map((item) => (
              <div key={item.label} className={styles.roiItem}>
                <span className={styles.roiLabel}>{item.label}</span>
                {pctTag(item.value)}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function UsStockSearchPage() {
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={
        <div className={`${searchStyles.searchResults} ${searchStyles.searchResultsLoading}`}>
          <div className={searchStyles.loadingWrapper}>
            <Loading tip={t('common.loading')} size={32} />
          </div>
        </div>
      }
    >
      <UsStockSearchContent />
    </Suspense>
  );
}
