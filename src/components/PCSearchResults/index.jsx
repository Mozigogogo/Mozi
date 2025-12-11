'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Tag, Empty, Spin } from 'antd';
import { HeartOutlined, BellOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import isEmpty from 'lodash/isEmpty';
import styles from './index.module.less';

/**
 * PC端搜索结果组件
 */
export default function PCSearchResults({ keyword, onClose }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [isValidCoin, setIsValidCoin] = useState(false);
  
  // 数据状态
  const [coinInfo, setCoinInfo] = useState([]);
  const [relatedSections, setRelatedSections] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [spotPairs, setSpotPairs] = useState([]);
  const [derivativePairs, setDerivativePairs] = useState([]);

  useEffect(() => {
    if (keyword) {
      fetchSearchResults();
    }
  }, [keyword]);

  const fetchSearchResults = async () => {
    setLoading(true);
    
    try {
      // 验证是否为有效币种
      const isCoin = await request({ 
        url: Interface.IS_COIN, 
        data: { coin: keyword } 
      });
      
      if (!isCoin?.data?.isCoin) {
        setIsValidCoin(false);
        setLoading(false);
        return;
      }
      
      setIsValidCoin(true);

      // 并行请求所有数据
      const [coinRes, areaRes, platformRes, spotRes] = await Promise.allSettled([
        request({ url: Interface.COIN_INFO, data: { coin: keyword } }),
        request({ url: Interface.COIN_AREA, data: { coin: keyword } }),
        request({ url: Interface.COIN_PLATFORM, data: { coin: keyword } }),
        request({ url: Interface.COIN_SPOT, data: { coin: keyword } })
      ]);

      // 处理币种信息
      if (coinRes.status === 'fulfilled' && !isEmpty(coinRes.value?.data)) {
        setCoinInfo(coinRes.value.data);
      }

      // 处理相关板块
      if (areaRes.status === 'fulfilled' && !isEmpty(areaRes.value?.data)) {
        setRelatedSections(areaRes.value.data);
      }

      // 处理交易平台
      if (platformRes.status === 'fulfilled' && !isEmpty(platformRes.value?.data)) {
        setPlatforms(platformRes.value.data);
      }

      // 处理交易对
      if (spotRes.status === 'fulfilled' && !isEmpty(spotRes.value?.data)) {
        setSpotPairs(spotRes.value.data.spot || []);
        setDerivativePairs(spotRes.value.data.nonSpot || []);
      }

    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
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
      render: (_, record) => (
        <HeartOutlined 
          className={styles.actionIcon} 
          style={{ color: record.favorite ? '#11B787' : '#999' }}
        />
      ),
    },
    {
      title: t('home.columns.addMonitor'),
      key: 'monitor',
      align: 'center',
      render: () => <BellOutlined className={styles.actionIcon} />,
    },
  ];

  // 交易平台表格列
  const platformColumns = [
    {
      title: t('search.platform'),
      dataIndex: 'exchanges',
      key: 'exchanges',
      render: (text, record) => (
        <div className={styles.coinCell}>
          <img src={record.url} alt={text} className={styles.coinIcon} />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: t('search.chain'),
      dataIndex: 'chain',
      key: 'chain',
    },
    {
      title: t('search.withdrawFee'),
      dataIndex: 'withdrawfee',
      key: 'withdrawfee',
      align: 'right',
    },
    {
      title: t('search.withdrawMin'),
      dataIndex: 'withdrawmin',
      key: 'withdrawmin',
      align: 'right',
    },
  ];

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
      <div className={styles.searchResults}>
        <div className={styles.loadingWrapper}>
          <Spin size="large" tip={t('common.loading')} />
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
              onClick: () => router.push(`/detail?symbol=${record.symbol}`),
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
