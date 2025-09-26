'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Grid, Picker, InfiniteScroll } from 'antd-mobile';
import { useRouter, useSearchParams } from 'next/navigation';
import { request } from '../../utils/request';
import { jump2Detail } from '../../utils/core';
import { GardenLoading } from '../../components/Loading';
import MoziGrid from '../../components/MoziGrid';
import HighlightAre from '../../components/HighlightArea';
import AddCollect from '../../components/AddCollect';
import AddMonitor from '../../components/AddMonitor';
import Layout from '../../components/Layout';
import { PageLogin } from '../../components/PageLogin';
import styles from './page.module.css';

export default function List() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [selected, setSelected] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 初始未登录状态
  const [showLogin, setShowLogin] = useState(false); // 控制登录弹窗显示
  
  const pageNo = useRef(1);
  const pageSize = useRef(20);
  const pageFinish = useRef(false);
  
  // 配置数据 - 这些应该根据实际需求配置
  const config = {
    interFace: ['/api/list'], // 接口地址
    gridTitle: ['币种', '价格', '涨跌幅', '操作'], // 表格标题
    gridCon: [ // 表格内容配置
      { type: 'Img+Text', data: ['icon', 'symbol'] },
      { type: 'Text', data: 'price' },
      { type: 'HighlightArea', data: 'change' },
      { type: 'AddCollect', data: ['isCollected', 'symbol'] }
    ],
    requestData: [{}], // 请求参数
    rankTitle: 'Mozi列表',
    rankName: '',
    rankDesc: '',
    selectArr: [], // 选择器选项
    selectedPick: ''
  };
  
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = () => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      init();
    } else {
      setShowLogin(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setShowLogin(false);
    init();
  };
  
  const init = async () => {
    try {
      setIsLoading(true);
      const response = await request({
        url: config.interFace[0],
        data: {
          ...config.requestData[0],
          pageNo: pageNo.current,
          pageSize: pageSize.current
        }
      });
      
      if (response && response.data) {
        const tempData = response.data.map((item) => {
          const itemObj = {};
          config.gridCon.forEach((value, index) => {
            if (value.type === 'key' || value.type === 'img') {
              itemObj[value.type] = item[value.data];
            } else {
              itemObj[`key${index + 1}`] = matchDom(value.type, item, value.data);
            }
          });
          return itemObj;
        });
        setData(tempData);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const matchDom = (type, data, dataKey) => {
    if (type === 'Img+Text') {
      return (
        <div className={styles.gridText}>
          <img className={styles.gridIcon} src={data[dataKey[0]]} alt="" />
          {data[dataKey[1]]}
        </div>
      );
    }
    if (type === 'HighlightArea') {
      return <HighlightArea value={data[dataKey]} />;
    }
    if (type === 'AddCollect') {
      return <AddCollect isOwn={data[dataKey[0]]} symbol={data[dataKey[1]]} />;
    }
    if (type === 'AddMonitor') {
      return <AddMonitor symbol={data[dataKey]} />;
    }
    if (type === 'Text') {
      return data[dataKey];
    }
    return null;
  };
  
  const loadMore = async () => {
    if (pageFinish.current) {
      setHasMore(false);
      return;
    }
    
    try {
      const response = await request({
        url: config.interFace[0],
        data: {
          ...config.requestData[0],
          pageNo: ++pageNo.current,
          pageSize: pageSize.current
        }
      });
      
      if (response && response.data) {
        if (pageNo.current * pageSize.current >= response.total) {
          pageFinish.current = true;
          setHasMore(false);
        }
        
        const tempData = response.data.map((item) => {
          const itemObj = {};
          config.gridCon.forEach((value, index) => {
            if (value.type === 'key' || value.type === 'img') {
              itemObj[value.type] = item[value.data];
            } else {
              itemObj[`key${index + 1}`] = matchDom(value.type, item, value.data);
            }
          });
          return itemObj;
        });
        
        setData(prevData => [...prevData, ...tempData]);
      }
    } catch (error) {
      console.error('加载更多数据失败:', error);
    }
  };
  
  const onChange = (value) => {
    setSelected(config.selectArr[value]);
    // 这里可以添加选择器变更的回调逻辑
  };
  
  // 未登录时显示空白页面，登录弹窗会自动弹出
  if (!isLoggedIn) {
    return (
      <Layout>
        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
          请先登录
        </div>
        <PageLogin 
          show={showLogin} 
          hideCb={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </Layout>
    );
  }
  
  if (isLoading) {
    return (
      <Layout>
        <GardenLoading />
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className={styles.scrollList}>
        {config.selectArr.length > 0 && (
          <div className={styles.header}>
            <div className={styles.left}>
              <div className={styles.title}>{config.rankTitle}</div>
              <div>{config.rankName}</div>
              <div className={styles.desc}>
                {config.rankDesc && (
                  <span className={styles.descCon}>{config.rankDesc}</span>
                )}
                {config.selectArr && config.selectedPick && (
                  <Picker
                    columns={[config.selectArr]}
                    value={[selected]}
                    onConfirm={(value) => onChange(value[0])}
                  >
                    {(items) => (
                      <div className={styles.pickerSelect}>
                        <div className={styles.selectIcon}>{config.selectedPick}</div>
                        <span>▼</span>
                      </div>
                    )}
                  </Picker>
                )}
              </div>
            </div>
            <div className={styles.right}>
              {data[0]?.img && (
                <img src={data[0].img} className={styles.headerImg} alt="" />
              )}
            </div>
          </div>
        )}
        
        <Grid className={`${styles.gridTitle} ${config.selectArr.length > 0 ? styles.showHeaderGrid : ''}`} columns={config.gridTitle.length}>
          {config.gridTitle.map((colNameItem, colNameIndex) => (
            <Grid.Item key={colNameIndex} className={`${styles.gridTitleItem} ${colNameIndex !== 0 ? styles.text : ''}`}>
              {colNameItem}
            </Grid.Item>
          ))}
        </Grid>
        
        <div className={`${styles.scroll} ${config.selectArr.length > 0 ? styles.showHeader : ''}`}>
          <MoziGrid
            length={config.gridTitle.length}
            colName={config.gridTitle}
            gridContent={data}
            callback={(gridCon) => {
              if (!gridCon.key) return;
              jump2Detail(gridCon.key);
            }}
            hideTitle={true}
          />
          
          <InfiniteScroll loadMore={loadMore} hasMore={hasMore}>
            {hasMore ? '加载中...' : '没有更多了'}
          </InfiniteScroll>
        </div>
      </div>
    </Layout>
  );
}