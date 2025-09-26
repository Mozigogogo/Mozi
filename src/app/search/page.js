'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Empty } from 'antd-mobile';
import Layout from '../../components/Layout';
import { SearchInput } from '../../components/SearchInput';
import { Loading } from '../../components/Loading';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { jump2Detail, jump2List } from '../../utils/core';
import styles from './page.module.css';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get('keyword') || '';
  
  // 状态定义
  const [searchValue, setSearchValue] = useState(keyword);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('coin');
  
  // 搜索函数
  const handleSearch = async (value) => {
    if (!value) return;
    
    setLoading(true);
    try {
      const response = await request({
        url: Interface.SEARCH,
        data: { keyword: value }
      });
      
      if (response?.data) {
        setSearchResults(response.data);
      }
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 初始加载
  useEffect(() => {
    if (keyword) {
      handleSearch(keyword);
    }
  }, [keyword]);
  
  // 渲染币种结果
  const renderCoinResults = () => {
    if (!searchResults?.coin || searchResults.coin.length === 0) {
      return <Empty description="暂无相关币种" />
    }
    
    return (
      <div className={styles.resultList}>
        {searchResults.coin.map((item, index) => (
          <div 
            key={index} 
            className={styles.resultItem}
            onClick={() => jump2Detail(item.symbol)}
          >
            <div className={styles.itemLeft}>
              <img src={item.url} alt={item.symbol} className={styles.itemImg} />
              <div className={styles.itemInfo}>
                <div className={styles.itemSymbol}>{item.symbol}</div>
                <div className={styles.itemName}>{item.name}</div>
              </div>
            </div>
            <div className={styles.itemRight}>
              <div className={styles.itemPrice}>{item.currentPrice}</div>
              <div className={`${styles.itemChange} ${String(item.priceChange24h).includes('-') ? styles.priceDown : styles.priceUp}`}>
                {item.priceChange24h}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // 渲染行业结果
  const renderIndustryResults = () => {
    if (!searchResults?.industry || searchResults.industry.length === 0) {
      return <Empty description="暂无相关行业" />
    }
    
    return (
      <div className={styles.resultList}>
        {searchResults.industry.map((item, index) => (
          <div 
            key={index} 
            className={styles.resultItem}
            onClick={() => jump2List('industry', { industry: item.name })}
          >
            <div className={styles.itemLeft}>
              <div className={styles.industryIcon}>{item.name.charAt(0)}</div>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{item.name}</div>
                <div className={styles.itemDesc}>{item.description || '暂无描述'}</div>
              </div>
            </div>
            <div className={styles.itemRight}>
              <div className={`${styles.itemChange} ${String(item.change).includes('-') ? styles.priceDown : styles.priceUp}`}>
                {item.change}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // 渲染话题结果
  const renderTopicResults = () => {
    if (!searchResults?.topic || searchResults.topic.length === 0) {
      return <Empty description="暂无相关话题" />
    }
    
    return (
      <div className={styles.resultList}>
        {searchResults.topic.map((item, index) => (
          <div 
            key={index} 
            className={styles.resultItem}
            onClick={() => window.location.href = `/community?topic=${item.id}`}
          >
            <div className={styles.itemLeft}>
              <div className={styles.topicIcon}>#</div>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{item.title}</div>
                <div className={styles.itemDesc}>{`${item.postCount || 0}个帖子`}</div>
              </div>
            </div>
            <div className={styles.itemRight}>
              <div className={styles.itemHot}>{`热度 ${item.hot || 0}`}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <SearchInput 
            placeholder="搜索币种、行业、话题" 
            value={searchValue}
            onChange={setSearchValue}
            onSearch={handleSearch}
            loading={loading}
          />
        </div>
        
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <Loading />
            </div>
          ) : searchResults ? (
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              className={styles.tabs}
            >
              <Tabs.Tab title="币种" key="coin">
                {renderCoinResults()}
              </Tabs.Tab>
              <Tabs.Tab title="行业" key="industry">
                {renderIndustryResults()}
              </Tabs.Tab>
              <Tabs.Tab title="话题" key="topic">
                {renderTopicResults()}
              </Tabs.Tab>
            </Tabs>
          ) : (
            <div className={styles.emptyContainer}>
              <Empty description="请输入关键词搜索" />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}