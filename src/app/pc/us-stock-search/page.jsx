'use client';

import { useMemo, Suspense, useEffect, useState } from 'react';
import { Card, Table, Tag, Empty, message } from 'antd';
import { HeartOutlined, HeartFilled, BellOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { jump2Detail } from '@/utils/core';
import { getPcSearchRoute, validateSearchSymbol } from '@/utils/searchValidate';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import { completeTask } from '@/api/user';
import { normalizeUsStockReturnResponse, normalizeUsStockHeaderResponse } from '@/utils/usStockMockData';
import { useNavigateToPcAlarm } from '@/hooks/useNavigateToPcAlarm';
import { Loading } from '@/components/Loading';
import searchStyles from '@/components/PCSearchResults/index.module.less';
import styles from './page.module.less';

const CEX_LOGO = (name) =>
  `https://coinlogo-1317406749.cos.ap-shanghai.myqcloud.com/cex_logo/cex_logo/${encodeURIComponent(name)}.png`;

const STOCK_LOGO = (symbol) =>
  `https://coinlogo-1317406749.cos.ap-shanghai.myqcloud.com/stock/${String(symbol || 'NVDA').toUpperCase()}.png`;

/** sessions.status 枚举 → 文案 */
function sessionStatusLabel(status) {
  if (status == null || status === '') return '状态源故障降级';
  const key = String(status).toLowerCase();
  if (key === 'pre_market') return '盘前';
  if (key === 'regular') return '开市';
  if (key === 'break') return '日内休市';
  if (key === 'post_market') return '盘后';
  if (key === 'closed') return '休市';
  return String(status);
}

function sessionStatusColor(status) {
  if (status == null || status === '') return 'default';
  const key = String(status).toLowerCase();
  if (key === 'regular' || key === 'pre_market' || key === 'post_market') return 'success';
  if (key === 'break') return 'warning';
  return 'default';
}

/** 可交易平台状态：开市 / 休市（regular 等可交易态 → 开市） */
function venueStatusLabel(status) {
  if (status == null || status === '') return '状态源故障降级';
  const key = String(status).toLowerCase();
  if (key === 'regular' || key === 'pre_market' || key === 'post_market') return '开市';
  if (key === 'closed' || key === 'break') return '休市';
  return sessionStatusLabel(status);
}

function venueStatusColor(status) {
  if (status == null || status === '') return 'default';
  const key = String(status).toLowerCase();
  if (key === 'regular' || key === 'pre_market' || key === 'post_market') return 'success';
  return 'default';
}

function resolveSessionStatus(session) {
  if (!session || typeof session !== 'object') return null;
  if (session.status != null && session.status !== '') return session.status;
  if (typeof session.is_open === 'boolean') return session.is_open ? 'regular' : 'closed';
  return null;
}

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

function formatVenuePrice(value) {
  if (value == null || value === '') return '--';
  const n = Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return String(value);
  // 整数部分不为 0：最多保留 3 位小数；小于 1 则保留原精度
  const formatted = Math.abs(n) >= 1 ? n.toFixed(3) : String(n);
  return formatted.replace(/\.?0+$/, '') || '0';
}

/**
 * 可交易平台行：只取 prices.spot / prices.perp
 * 现货 → prices.spot；合约 → prices.perp
 * 页面列固定：平台 / 类型 / 发行方类型 / 交易对 / 价格 / 状态
 */
function buildVenueRows(data) {
  const sessionMap = new Map((data?.sessions || []).map((item) => [item.instrument, item]));
  const prices = data?.prices || {};

  const pushFromPriceList = (list, instrument, rows) => {
    (Array.isArray(list) ? list : []).forEach((item, index) => {
      if (!item?.exchange) return;
      const session = sessionMap.get(instrument);
      rows.push({
        key: `${instrument}-${item.exchange}-${item.pair || item.issuance || index}`,
        exchange: item.exchange,
        url: item.logo || CEX_LOGO(`${item.exchange}.png`),
        instrument,
        issuance: item.issuance ?? '--',
        pair: item.pair ?? '--',
        price: formatVenuePrice(item.last_price),
        status: resolveSessionStatus(session),
      });
    });
  };

  const rows = [];
  pushFromPriceList(prices.spot, 'spot', rows);
  pushFromPriceList(prices.perp, 'perp', rows);
  return rows;
}

/**
 * 美股搜索页
 * 路由：/pc/us-stock-search?keyword=NVDA
 */
function UsStockSearchContent() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { navigateToPcAlarm } = useNavigateToPcAlarm();
  const searchParams = useSearchParams();
  const keyword = (searchParams.get('keyword') || '').trim().toUpperCase();
  const [gate, setGate] = useState(keyword ? 'loading' : 'invalid');
  const [assetRow, setAssetRow] = useState(null);
  const [assetLoading, setAssetLoading] = useState(false);
  const [searchDetail, setSearchDetail] = useState(null);
  const [venueTypeFilter, setVenueTypeFilter] = useState(null);

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

  useEffect(() => {
    setVenueTypeFilter(null);
  }, [keyword]);

  // 标的信息行：GET /stock/detail/header?symbol=NVDA（与美股详情一致）
  useEffect(() => {
    if (gate !== 'ready' || !keyword) {
      setAssetRow(null);
      return;
    }

    let cancelled = false;
    const fetchAssetHeader = async () => {
      setAssetLoading(true);
      try {
        const res = await request({
          url: Interface.stock_info,
          data: { symbol: keyword },
        });
        if (cancelled) return;

        const header = normalizeUsStockHeaderResponse(res?.data, { language: i18n.language });
        if (!header) {
          setAssetRow(null);
          return;
        }

        const sym = String(header.symbol || keyword).trim().toUpperCase();
        setAssetRow({
          key: sym,
          symbol: sym,
          name: header.name || sym,
          logo: header.url || STOCK_LOGO(sym),
          spot: {
            last_price: header.currentPrice ?? '--',
            price_change_percent: header.priceChangePercentage_24h ?? header.priceChange_24h,
          },
          isFavorite: Boolean(header.isSelfSelected),
        });
      } catch (error) {
        console.error('获取美股标头信息失败:', error);
        if (!cancelled) setAssetRow(null);
      } finally {
        if (!cancelled) setAssetLoading(false);
      }
    };

    fetchAssetHeader();
    return () => {
      cancelled = true;
    };
  }, [gate, keyword, i18n.language]);

  // 相关板块 / 交易时段 / 可交易平台：GET /stock/search/detail
  useEffect(() => {
    if (gate !== 'ready' || !keyword) {
      setSearchDetail(null);
      return;
    }

    let cancelled = false;
    const fetchSearchDetail = async () => {
      try {
        const res = await request({
          url: Interface.STOCK_SEARCH_DETAIL,
          data: { symbol: keyword },
        });
        if (cancelled) return;
        setSearchDetail(res?.data && typeof res.data === 'object' ? res.data : null);
      } catch (error) {
        console.error('获取美股搜索详情失败:', error);
        if (!cancelled) setSearchDetail(null);
      }
    };

    fetchSearchDetail();
    return () => {
      cancelled = true;
    };
  }, [gate, keyword]);

  const handleToggleFavorite = async (e, record) => {
    e.stopPropagation();

    const sym = record?.symbol;
    if (!sym) return;

    const newIsFavorite = !record.isFavorite;
    setAssetRow((prev) => {
      if (!prev || prev.symbol !== sym) return prev;
      return { ...prev, isFavorite: newIsFavorite };
    });

    try {
      const url = newIsFavorite ? Interface.ADD_OWN : Interface.CANCEL_OWN;
      const res = await request({
        url,
        method: 'GET',
        data: { coin: sym },
      });

      if (res?.data?.isLogin === false) {
        setAssetRow((prev) => {
          if (!prev || prev.symbol !== sym) return prev;
          return { ...prev, isFavorite: !newIsFavorite };
        });
        message.warning(t('common.pleaseLogin', { defaultValue: '请先登录' }));
        return;
      }

      if (res?.code === 0 || res?.data) {
        message.success(
          newIsFavorite
            ? t('common.addSuccess', { defaultValue: '添加成功' })
            : t('common.cancelSuccess', { defaultValue: '取消成功' })
        );
        if (newIsFavorite) {
          try {
            await completeTask('ADD_WATCHLIST');
          } catch (err) {
            console.error('上报 ADD_WATCHLIST 失败', err);
          }
        }
        return;
      }

      setAssetRow((prev) => {
        if (!prev || prev.symbol !== sym) return prev;
        return { ...prev, isFavorite: !newIsFavorite };
      });
      message.error(res?.msg || t('common.operationFailed', { defaultValue: '操作失败' }));
    } catch (error) {
      console.error('自选操作失败:', error);
      setAssetRow((prev) => {
        if (!prev || prev.symbol !== sym) return prev;
        return { ...prev, isFavorite: !newIsFavorite };
      });
      message.error(t('common.operationFailed', { defaultValue: '操作失败' }));
    }
  };

  const handleAddMonitor = (e, record) => {
    e.stopPropagation();
    const sym = record?.symbol || keyword;
    if (!sym) return;
    void navigateToPcAlarm(sym);
  };

  const sectorName = String(searchDetail?.sector || '').trim();
  const sessionRows = useMemo(() => {
    const list = Array.isArray(searchDetail?.sessions) ? searchDetail.sessions : [];
    return list.map((item, index) => ({
      ...item,
      key: `${item.instrument || 'session'}-${index}`,
    }));
  }, [searchDetail]);
  const venueRows = useMemo(() => buildVenueRows(searchDetail), [searchDetail]);
  const filteredVenueRows = useMemo(() => {
    if (!venueTypeFilter) return venueRows;
    return venueRows.filter((row) => row.instrument === venueTypeFilter);
  }, [venueRows, venueTypeFilter]);
  const platformSymbol = String(searchDetail?.symbol || keyword || '').toUpperCase();
  const roiData = useMemo(
    () => normalizeUsStockReturnResponse(searchDetail?.roi ?? null),
    [searchDetail]
  );

  const assetColumns = [
    {
      title: t('home.columns.symbol'),
      dataIndex: 'symbol',
      key: 'symbol',
      render: (_, record) => (
        <div className={searchStyles.coinCell}>
          <img src={record.logo} alt={record.symbol} className={searchStyles.coinIcon} />
          <span className={styles.symbolMain}>{record.symbol}</span>
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
      render: (_, record) =>
        record.isFavorite ? (
          <HeartFilled
            className={`${searchStyles.actionIcon} ${searchStyles.actionIconActive}`}
            onClick={(e) => handleToggleFavorite(e, record)}
          />
        ) : (
          <HeartOutlined
            className={searchStyles.actionIcon}
            onClick={(e) => handleToggleFavorite(e, record)}
          />
        ),
    },
    {
      title: t('home.columns.addMonitor'),
      key: 'monitor',
      align: 'center',
      render: (_, record) => (
        <BellOutlined
          className={searchStyles.actionIcon}
          onClick={(e) => handleAddMonitor(e, record)}
        />
      ),
    },
  ];

  const assetRows = assetRow ? [assetRow] : [];

  const venueColumns = [
    {
      title: t('search.platform'),
      dataIndex: 'exchange',
      key: 'exchange',
      width: '18%',
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
      width: '10%',
      filterMultiple: false,
      filteredValue: venueTypeFilter ? [venueTypeFilter] : null,
      filters: [
        { text: t('search.spot', { defaultValue: '现货' }), value: 'spot' },
        { text: t('search.contract', { defaultValue: '合约' }), value: 'perp' },
      ],
      onFilter: (value, record) => record.instrument === value,
      render: (value) => instrumentLabel(value, t),
    },
    {
      title: '发行方类型',
      dataIndex: 'issuance',
      key: 'issuance',
      align: 'center',
      width: '14%',
      render: (value) => value ?? '--',
    },
    {
      title: '交易对',
      dataIndex: 'pair',
      key: 'pair',
      align: 'center',
      width: '16%',
      render: (value) => value ?? '--',
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      width: '12%',
      render: (value) => value ?? '--',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      width: '10%',
      render: (status) => (
        <Tag color={venueStatusColor(status)}>{venueStatusLabel(status)}</Tag>
      ),
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
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      width: '10%',
      render: (status) => (
        <Tag color={sessionStatusColor(status)}>{sessionStatusLabel(status)}</Tag>
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
    { label: '1日', value: roiData.priceChange1Day },
    { label: '7日', value: roiData.priceChange7Day },
    { label: '1月', value: roiData.priceChange1Month },
    { label: '1年', value: roiData.priceChange1Year },
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
        {/* 1. 标的信息：GET /stock/detail/header */}
        <Card title={`标的 (${assetRow?.symbol || keyword})`} className={searchStyles.resultCard}>
          <Table
            columns={assetColumns}
            dataSource={assetRows}
            rowKey="key"
            pagination={false}
            locale={{ emptyText: assetLoading ? t('common.loading') : t('common.noData') }}
            onRow={(record) => ({
              onClick: () => jump2Detail(record.symbol || keyword, false, { type: 'usStock' }),
              style: { cursor: 'pointer' },
            })}
          />
        </Card>

        {/* 2. 相关板块：sector */}
        <Card
          title={`${t('search.relatedSections')} (${sectorName ? 1 : 0})`}
          className={searchStyles.resultCard}
        >
          {sectorName ? (
            <div className={searchStyles.sectionsGrid}>
              <div className={searchStyles.sectionItem}>
                <span className={searchStyles.sectionName}>{sectorName}</span>
              </div>
            </div>
          ) : (
            <Empty description={t('common.noData')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>

        {/* 3. 交易时段：sessions.status */}
        <Card title={`交易时段 (${sessionRows.length})`} className={searchStyles.resultCard}>
          <Table
            columns={sessionColumns}
            dataSource={sessionRows}
            rowKey="key"
            pagination={false}
            tableLayout="fixed"
            locale={{ emptyText: t('common.noData') }}
          />
        </Card>

        {/* 4. 可交易平台：prices / venues */}
        <Card
          title={`可交易${platformSymbol}平台 (${filteredVenueRows.length})`}
          className={searchStyles.resultCard}
        >
          <Table
            columns={venueColumns}
            dataSource={venueRows}
            rowKey="key"
            pagination={false}
            tableLayout="fixed"
            locale={{ emptyText: t('common.noData') }}
            onChange={(_pagination, filters) => {
              const next = filters?.instrument?.[0];
              setVenueTypeFilter(next || null);
            }}
          />
        </Card>

        {/* 5. 收益表现：searchDetail.roi */}
        <Card title="收益表现" className={searchStyles.resultCard}>
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
