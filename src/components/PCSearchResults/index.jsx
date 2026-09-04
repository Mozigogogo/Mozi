'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Tag, Empty, message } from 'antd';
import { HeartOutlined, HeartFilled, BellOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { completeTask } from '@/api/user';
import { jump2Detail } from '@/utils/core';
import { getPcSearchRoute, validateSearchSymbol } from '@/utils/searchValidate';
import { useNavigateToPcAlarm } from '@/hooks/useNavigateToPcAlarm';
import { Loading } from '@/components/Loading';
import isEmpty from 'lodash/isEmpty';
import styles from './index.module.less';

/**
 * PC端搜索结果组件
 */
export default function PCSearchResults({ keyword }) {
  const router = useRouter();
  const { navigateToPcAlarm } = useNavigateToPcAlarm();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [isValidCoin, setIsValidCoin] = useState(false);
  /** 美股搜索：展示类型 / 可交易时间段，隐藏所属链 */
  const [isUsStock, setIsUsStock] = useState(false);
  
  // 数据状态
  const [coinInfo, setCoinInfo] = useState([]);
  const [relatedSections, setRelatedSections] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [spotPairs, setSpotPairs] = useState([]);
  const [derivativePairs, setDerivativePairs] = useState([]);

  useEffect(() => {
    if (keyword) {
      fetchSearchResults();
    } else {
      setLoading(false);
      setIsValidCoin(false);
      setCoinInfo([]);
      setRelatedSections([]);
      setPlatforms([]);
      setSpotPairs([]);
      setDerivativePairs([]);
    }
  }, [keyword]);

  const navigateToDetail = (symbol) => {
    const sym = symbol || keyword;
    if (!sym) return;
    jump2Detail(sym, false, isUsStock ? { type: 'usStock' } : undefined);
  };

  const fetchSearchResults = async () => {
    setLoading(true);
    setIsUsStock(false);
    
    try {
      // 先校验标的类型，再拉搜索数据
      const type = await validateSearchSymbol(keyword);

      if (type === 'stock') {
        router.replace(getPcSearchRoute('stock', keyword));
        return;
      }

      if (type !== 'crypto') {
        setIsValidCoin(false);
        setLoading(false);
        return;
      }

      setIsValidCoin(true);
      setIsUsStock(false);

      // 并行请求加密货币搜索数据
      const [coinRes, areaRes, platformRes, spotRes] = await Promise.allSettled([
        request({ url: Interface.COIN_INFO, data: { coin: keyword } }),
        request({ url: Interface.COIN_AREA, data: { coin: keyword } }),
        request({ url: Interface.COIN_PLATFORM, data: { coin: keyword } }),
        request({ url: Interface.COIN_SPOT, data: { coin: keyword } })
      ]);

      // 处理币种信息
      if (coinRes.status === 'fulfilled' && !isEmpty(coinRes.value?.data)) {
        setCoinInfo(
          coinRes.value.data.map((item) => ({
            ...item,
            isFavorite: Boolean(item.favorite || item.isSelfSelected || item.isLiked),
          }))
        );
      } else {
        setCoinInfo([]);
      }

      // 处理相关板块
      if (areaRes.status === 'fulfilled' && !isEmpty(areaRes.value?.data)) {
        setRelatedSections(areaRes.value.data);
      } else {
        setRelatedSections([]);
      }

      // 处理交易平台
      if (platformRes.status === 'fulfilled' && !isEmpty(platformRes.value?.data)) {
        setPlatforms(platformRes.value.data);
      } else {
        setPlatforms([]);
      }

      // 处理交易对
      if (spotRes.status === 'fulfilled' && !isEmpty(spotRes.value?.data)) {
        setSpotPairs(spotRes.value.data.spot || []);
        setDerivativePairs(spotRes.value.data.nonSpot || []);
      } else {
        setSpotPairs([]);
        setDerivativePairs([]);
      }

    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (e, record) => {
    e.stopPropagation();

    const symbol = record?.symbol;
    if (!symbol) return;

    const newIsFavorite = !record.isFavorite;
    setCoinInfo((prev) =>
      prev.map((item) =>
        item.symbol === symbol
          ? { ...item, isFavorite: newIsFavorite, favorite: newIsFavorite }
          : item
      )
    );

    try {
      const url = newIsFavorite ? Interface.ADD_OWN : Interface.CANCEL_OWN;
      const res = await request({
        url,
        method: 'GET',
        data: { coin: symbol },
      });

      if (res?.data?.isLogin === false) {
        setCoinInfo((prev) =>
          prev.map((item) =>
            item.symbol === symbol
              ? { ...item, isFavorite: !newIsFavorite, favorite: !newIsFavorite }
              : item
          )
        );
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

      setCoinInfo((prev) =>
        prev.map((item) =>
          item.symbol === symbol
            ? { ...item, isFavorite: !newIsFavorite, favorite: !newIsFavorite }
            : item
        )
      );
      message.error(res?.msg || t('common.operationFailed', { defaultValue: '操作失败' }));
    } catch (error) {
      console.error('操作失败:', error);
      setCoinInfo((prev) =>
        prev.map((item) =>
          item.symbol === symbol
            ? { ...item, isFavorite: !newIsFavorite, favorite: !newIsFavorite }
            : item
        )
      );
      message.error(t('common.operationFailed', { defaultValue: '操作失败' }));
    }
  };

  const handleAddMonitor = (e, record) => {
    e.stopPropagation();
    const symbol = record?.symbol || record?.key || keyword;
    if (!symbol) return;
    void navigateToPcAlarm(symbol);
  };

  // 币种信息表格列
  const coinColumns = [
    {
      title: t('home.columns.symbol'),
      dataIndex: 'symbol',
      key: 'symbol',
      render: (text, record) => (
        <div className={styles.coinCell}>
          <img src={record.url} alt={text} className={styles.coinIcon} />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: t('home.columns.lastPrice'),
      dataIndex: 'last',
      key: 'last',
      align: 'right',
    },
    {
      title: t('home.columns.change24h'),
      dataIndex: 'price24h',
      key: 'price24h',
      align: 'center',
      render: (value) => {
        const numValue = parseFloat(value) || 0;
        return (
          <Tag color={numValue >= 0 ? 'success' : 'error'}>
            {numValue >= 0 ? '+' : ''}{numValue.toFixed(2)}%
          </Tag>
        );
      },
    },
    {
      title: t('home.columns.addFavorites'),
      key: 'favorite',
      align: 'center',
      render: (_, record) =>
        record.isFavorite ? (
          <HeartFilled
            className={`${styles.actionIcon} ${styles.actionIconActive}`}
            onClick={(e) => handleToggleFavorite(e, record)}
          />
        ) : (
          <HeartOutlined
            className={styles.actionIcon}
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
          className={styles.actionIcon}
          onClick={(e) => handleAddMonitor(e, record)}
        />
      ),
    },
  ];

  // 交易平台表格列：
  // - 美股：平台 + 类型 + 可交易时间段 + 手续费列（不展示所属链）
  // - 币种：平台 + 所属链 + 手续费列（不展示类型 / 时间段）
  const platformColumns = [
    {
      title: t('search.platform'),
      dataIndex: 'exchanges',
      key: 'exchanges',
      width: isUsStock ? '22%' : '28%',
      render: (text, record) => (
        <div className={styles.coinCell}>
          <img src={record.url} alt={text} className={styles.coinIcon} />
          <span>{text}</span>
        </div>
      ),
    },
    isUsStock && {
      title: t('search.type', { defaultValue: '类型' }),
      dataIndex: 'pairType',
      key: 'pairType',
      align: 'center',
      width: '14%',
      render: (value) =>
        value === 'contract'
          ? t('search.contract', { defaultValue: '合约' })
          : t('search.spot', { defaultValue: '现货' }),
    },
    isUsStock && {
      title: t('search.tradePeriod', { defaultValue: '可交易时间段' }),
      dataIndex: 'tradePeriod',
      key: 'tradePeriod',
      align: 'center',
      width: '22%',
    },
    !isUsStock && {
      title: t('search.chain'),
      dataIndex: 'chain',
      key: 'chain',
      width: '28%',
    },
    {
      title: t('search.withdrawFee'),
      dataIndex: 'withdrawfee',
      key: 'withdrawfee',
      align: 'right',
      width: isUsStock ? '21%' : '22%',
    },
    {
      title: t('search.withdrawMin'),
      dataIndex: 'withdrawmin',
      key: 'withdrawmin',
      align: 'right',
      width: isUsStock ? '21%' : '22%',
    },
  ].filter(Boolean);

  // 交易对表格列
  const pairColumns = [
    {
      title: t('home.columns.symbol'),
      dataIndex: 'symbol',
      key: 'symbol',
      render: (text, record) => (
        <div className={styles.coinCell}>
          <img src={record.url} alt={text} className={styles.coinIcon} />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: t('discover.exchange.columns.exchange'),
      dataIndex: 'exchanges',
      key: 'exchanges',
    },
    {
      title: t('home.columns.lastPrice'),
      dataIndex: 'lasts',
      key: 'lasts',
      align: 'right',
    },
    {
      title: t('home.columns.change24h'),
      dataIndex: 'price24h',
      key: 'price24h',
      align: 'center',
      render: (value) => {
        const numValue = parseFloat(value) || 0;
        return (
          <Tag color={numValue >= 0 ? 'success' : 'error'}>
            {numValue >= 0 ? '+' : ''}{numValue.toFixed(2)}%
          </Tag>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className={`${styles.searchResults} ${styles.searchResultsLoading}`}>
        <div className={styles.loadingWrapper}>
          <Loading tip={t('common.loading')} size={32} />
        </div>
      </div>
    );
  }

  if (!isValidCoin) {
    return (
      <div className={styles.searchResults}>
        <Empty description={t('search.invalidCoin')} />
      </div>
    );
  }

  return (
    <div className={styles.searchResults}>
      {/* 币种信息 */}
      {coinInfo.length > 0 && (
        <Card 
          title={`${t('search.coins')} (${coinInfo.length})`}
          className={styles.resultCard}
        >
          <Table
            columns={coinColumns}
            dataSource={coinInfo}
            rowKey="symbol"
            pagination={false}
            onRow={(record) => ({
              onClick: () => navigateToDetail(record.symbol),
              style: { cursor: 'pointer' },
            })}
          />
        </Card>
      )}

      {/* 相关板块 */}
      {relatedSections.length > 0 && (
        <Card 
          title={`${t('search.relatedSections')} (${relatedSections.length})`}
          className={styles.resultCard}
        >
          <div className={styles.sectionsGrid}>
            {relatedSections.map((item, index) => {
              const changeValue = parseFloat(item.changes) || 0;
              return (
                <div key={index} className={styles.sectionItem}>
                  <span className={styles.sectionName}>{item.section}</span>
                  <Tag color={changeValue >= 0 ? 'success' : 'error'}>
                    {changeValue >= 0 ? '+' : ''}{changeValue.toFixed(2)}%
                  </Tag>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 可交易平台 */}
      {platforms.length > 0 && (
        <Card 
          title={`${t('search.tradeablePlatforms', { coin: keyword })} (${platforms.length})`}
          className={styles.resultCard}
        >
          <Table
            columns={platformColumns}
            dataSource={platforms}
            rowKey={(record, index) => `${record.exchanges}-${index}`}
            pagination={false}
            tableLayout="fixed"
          />
        </Card>
      )}

      {/* 现货交易对 */}
      {spotPairs.length > 0 && (
        <Card 
          title={`${t('search.spotPairs')} (${spotPairs.length})`}
          className={styles.resultCard}
        >
          <Table
            columns={pairColumns}
            dataSource={spotPairs}
            rowKey={(record, index) => `spot-${record.symbol}-${index}`}
            pagination={false}
          />
        </Card>
      )}

      {/* 衍生品交易对 */}
      {derivativePairs.length > 0 && (
        <Card 
          title={`${t('search.derivativePairs')} (${derivativePairs.length})`}
          className={styles.resultCard}
        >
          <Table
            columns={pairColumns}
            dataSource={derivativePairs}
            rowKey={(record, index) => `derivative-${record.symbol}-${index}`}
            pagination={false}
          />
        </Card>
      )}
    </div>
  );
}
