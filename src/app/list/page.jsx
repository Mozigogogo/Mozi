'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Grid, InfiniteScroll } from 'antd-mobile';
import { useRouter, useSearchParams } from 'next/navigation';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { jump2Detail } from '../../utils/core';
import { GardenLoading, LogoLoading } from '../../components/Loading';
import MoziGrid from '../../components/MoziGrid';
import HighlightArea from '../../components/HighlightArea';
import AddCollect from '../../components/AddCollect';
import AddMonitor from '../../components/AddMonitor';
import { LeftArrowIcon } from '../../components/Icons';
import styles from './page.module.less';

const loadingImg = '/images/community/loadding.png';

export default function List() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState([]);
  const [renderData, setRenderData] = useState([]);
  const [readyData, setReadyData] = useState([]);
  const [readyIndex, setReadyIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [firstLoading, setFirstLoading] = useState(true); // 首次进入页的全屏加载
  const [hasMore, setHasMore] = useState(true);
  const [selected, setSelected] = useState('');
  const [headerImg, setHeaderImg] = useState('');
  const [showHeader, setShowHeader] = useState(false);
  
  const pageNo = useRef(1);
  const pageSize = useRef(100);
  const pageFinish = useRef(false);
  
  // 从URL参数获取榜单配置
  const type = searchParams.get('type');
  const rankTitle = searchParams.get('rankTitle') || '热门币种';
  const interFace = searchParams.get('interFace') || '/coin/hot_coin';
  const rankName = searchParams.get('rankName') || '';
  const rankDesc = searchParams.get('rankDesc') || '';
  const fromPlatform = searchParams.get('fromPlatform');
  const searchCoin = searchParams.get('searchCoin');

  // 从URL参数解析复杂配置
  const parseJsonParam = (paramName) => {
    const value = searchParams.get(paramName);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error(`解析${paramName}参数失败:`, e);
      return null;
    }
  };

  const gridTitleFromUrl = parseJsonParam('gridTitle');
  const gridConFromUrl = parseJsonParam('gridCon');
  const requestDataFromUrl = parseJsonParam('requestData');
  const selectArrFromUrl = parseJsonParam('selectArr');
  const columnWidthsFromUrl = parseJsonParam('columnWidths'); // 新增：列宽配置
  // showRanking：若未传参（null）则默认开启；否则按传参 true/false 解析
  const showRankingParamRaw = searchParams.get('showRanking');
  const showRankingFromUrl = showRankingParamRaw === null ? null : (showRankingParamRaw === 'true');

  // 判断是否为特殊热门页面
  const isHotSpecial =
    rankTitle === '热门币种' ||
    rankTitle === '热门合约' ||
    rankTitle === '热门版块' ||
    (typeof rankTitle === 'string' && rankTitle.includes('可交易'));

  // 处理 type=exchange 的特殊情况
  let finalGridTitle = gridTitleFromUrl;
  let finalGridCon = gridConFromUrl;
  let finalRequestData = requestDataFromUrl;
  let finalSelectArr = selectArrFromUrl;
  let finalRankTitle = rankTitle;
  let finalInterFace = interFace;
  let finalShowRanking = showRankingFromUrl;

  if (type === 'exchange') {
    finalRankTitle = '交易所排行榜';
    finalInterFace = Interface.hot_exchange;
    finalGridTitle = ['交易所', '24H交易量', '市场', '货币'];
    finalGridCon = [
      { type: 'Img+Text', data: ['url', 'exchange'] },
      { type: 'Text', data: 'usd' },
      { type: 'Text', data: 'markets' },
      { type: 'Text', data: 'coins' },
      { type: 'img', data: 'url' }
    ];
    finalRequestData = [
      { type: 'SPOT' },
      { type: 'Futures' }
    ];
    finalSelectArr = ['现货', '衍生品'];
    finalShowRanking = true;
  }

  // 配置数据（优先使用URL参数，否则使用默认值）
  const config = {
    interFace: finalInterFace,
    gridTitle: finalGridTitle || ['币种', '热门指数', '24H幅度', '加自选', '加监控'],
    gridCon: finalGridCon || [
      { type: 'Img+Text', data: ['url', 'symbol'] },
      { type: 'Text', data: 'last' },
      { type: 'HighlightArea', data: 'priceChangePercent' },
      { type: 'AddCollect', data: ['favorite', 'symbol'] },
      { type: 'AddMonitor', data: 'symbol' }
    ],
    requestData: finalRequestData || {},
    rankTitle: finalRankTitle,
    rankName: rankName,
    rankDesc: rankDesc,
    selectArr: finalSelectArr || [],
    showRanking: finalShowRanking !== null ? finalShowRanking : true, // 默认显示排名序号
    commentCount: 0,
    shareCount: 0,
    fromPlatform: fromPlatform,
    searchCoin: searchCoin,
    headerImg: searchParams.get('headerImg') || '',
    enableLoadMore: true,
    reponseData: parseJsonParam('reponseData') || false, // 是否使用响应数据的多维度结构
    columnWidths: columnWidthsFromUrl || null // 自定义列宽
  };
  
  // 判断是否为可交易平台页面
  const isTradeablePlatform = finalInterFace === '/search/symbolfees';
  
  useEffect(() => {
    init();
    
    // 如果是从可交易平台入口，且没有头图，则使用搜索币种的logo
    if (config.fromPlatform && !config.headerImg && config.searchCoin) {
      (async () => {
        try {
          const info = await request({
            url: Interface.COIN_INFO,
            data: { coin: config.searchCoin }
          });
          if (Array.isArray(info?.data) && info.data[0]?.url) {
            setHeaderImg(info.data[0].url);
          }
        } catch (e) {
          // ignore
        }
      })();
    }
    
    // 如果有selectArr且长度大于0，设置默认选中第一项
    if (Array.isArray(config.selectArr) && config.selectArr.length > 0) {
      setSelected(config.selectArr[0]);
    }
    
    // 统一开启头部容器（即使没有tabs也显示标题区）
    setShowHeader(true);
  }, []);
  
  // 当renderData变化时，转换为grid数据
  useEffect(() => {
    const sourceData = config.reponseData ? (readyData[readyIndex] || []) : renderData;
    console.log('[List useEffect] 数据转换开始:', {
      sourceDataLength: sourceData?.length,
      firstSourceItem: sourceData?.[0],
      gridConConfig: config.gridCon
    });
    
    const tempData = (Array.isArray(sourceData) ? sourceData : []).map((item) => {
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
    
    console.log('[List useEffect] 转换后的数据:', {
      tempDataLength: tempData.length,
      firstTempItem: tempData[0]
    });
    
    setData(tempData);
  }, [renderData, readyData, readyIndex]);
  
  const init = async () => {
    console.log('[List init] 开始初始化，配置:', config);
    try {
      setIsLoading(true);
      setFirstLoading(true);
      const requestData = Array.isArray(config.requestData) && config.requestData.length > 0 
        ? config.requestData[0] 
        : config.requestData;
      
      console.log('[List init] 请求参数:', {
        url: config.interFace,
        data: {
          ...requestData,
          pageNo: pageNo.current,
          pageSize: pageSize.current
        }
      });
      
      const coinData = await request({
        url: config.interFace,
        data: {
          ...requestData,
          pageNo: pageNo.current,
          pageSize: pageSize.current
        }
      });
      
      console.log('[List init] 接口返回原始数据:', coinData);
      console.log('[List init] coinData.data类型:', Array.isArray(coinData?.data) ? '数组' : typeof coinData?.data);
      console.log('[List init] coinData.data长度:', coinData?.data?.length);
      
      if (coinData?.data) {
        // 处理多维度响应数据（如某些榜单返回对象而非数组）
        if (config.reponseData) {
          const tmpResData = Object.keys(coinData?.data).map((resData) => {
            return coinData?.data[resData];
          });
          console.log('[List init] 多维度数据处理结果:', tmpResData);
          setReadyData(tmpResData);
        } else {
          // 普通数组或带list字段的响应
          const listData = Array.isArray(coinData.data) 
            ? coinData.data 
            : (Array.isArray(coinData.data.list) ? coinData.data.list : []);
          console.log('[List init] 列表数据:', {
            isArray: Array.isArray(coinData.data),
            hasListField: coinData.data.list !== undefined,
            listDataLength: listData.length,
            firstItem: listData[0]
          });
          // 首次数据去重（应对接口可能返回重复项）
          const dedupedData = dedupeArray(listData);
          console.log('[List init] 去重后数据长度:', dedupedData.length);
          setRenderData(dedupedData);
        }
        
        // 若未传入headerImg：根据首条symbol调用COIN_INFO获取logo作为头图
        if (!config.headerImg && !headerImg) {
          try {
            const arr = Array.isArray(coinData.data)
              ? coinData.data
              : (Array.isArray(coinData.data.list) ? coinData.data.list : []);
            if (arr && arr.length > 0) {
              const first = arr[0] || {};
              const firstSymbol = first.symbol || first.coin;
              if (firstSymbol) {
                const info = await request({
                  url: Interface.COIN_INFO,
                  data: { coin: firstSymbol }
                });
                if (Array.isArray(info?.data) && info.data[0]?.url) {
                  setHeaderImg(info.data[0].url);
                } else if (info?.data?.url) {
                  setHeaderImg(info.data.url);
                }
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setIsLoading(false);
      setFirstLoading(false);
    }
  };
  
  // 取唯一标识：优先 symbol/coin，其次 id/name/pair
  // 对于可交易平台数据，使用 exchanges+chain 作为唯一标识
  const getItemKey = (item = {}) => {
    // 如果是可交易平台数据（有 exchanges 和 chain 字段），使用组合键
    if (item.exchanges && item.chain) {
      return `${item.exchanges}-${item.chain}`;
    }
    
    return (
      item.symbol ||
      item.coin ||
      item.id ||
      item.pair ||
      item.name ||
      null
    );
  };

  // 对列表去重（同一批数据内部）
  const dedupeArray = (arr = []) => {
    const seen = new Set();
    return arr.filter((it) => {
      const k = getItemKey(it);
      if (!k) return true; // 没有key的保留，避免误删
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  // 合并去重，返回合并结果与新增数量
  const mergeUnique = (prev = [], next = []) => {
    const prevKeys = new Set(
      prev.map((it) => getItemKey(it)).filter(Boolean)
    );
    const uniqueIncoming = [];
    next.forEach((it) => {
      const k = getItemKey(it);
      if (k && prevKeys.has(k)) return;
      if (k) prevKeys.add(k);
      uniqueIncoming.push(it);
    });
    return { merged: [...prev, ...uniqueIncoming], added: uniqueIncoming.length };
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
  
  // Tab切换
  const onTabChange = async (index) => {
    console.log('已选择', index);
    setSelected(config.selectArr[index]);
    
    // 如果是响应数据模式，直接切换索引
    if (config.reponseData) {
      setReadyIndex(index);
    }
    
    // 如果有多个请求参数，切换时重新请求
    if (Array.isArray(config.requestData) && config.requestData.length > 0) {
      // 无感切换：保留当前数据，不触发全屏或局部loading
      // 重置分页计数
      pageNo.current = 1;
      pageFinish.current = false;
      
      try {
        const coinData = await request({
          url: config.interFace,
          data: {
            ...config.requestData[index],
            pageNo: pageNo.current,
            pageSize: pageSize.current
          }
        });
        
        if (coinData?.data) {
          const listData = Array.isArray(coinData.data) 
            ? coinData.data 
            : (Array.isArray(coinData.data.list) ? coinData.data.list : []);
          setRenderData(listData);
        }
      } catch (error) {
        console.error('切换Tab失败:', error);
      }
    }
  };
  
  // 返回按钮
  const goBack = () => {
    router.back();
  };
  
  const loadMore = async () => {
    if (!config.enableLoadMore) return;
    if (pageFinish.current) {
      setHasMore(false);
      return;
    }
    
    try {
      const requestData = Array.isArray(config.requestData) && config.requestData.length > 0 
        ? config.requestData[0] 
        : config.requestData;
        
      const coinData = await request({
        url: config.interFace,
        data: {
          ...requestData,
          pageNo: ++pageNo.current,
          pageSize: pageSize.current
        }
      });
      
      if (coinData?.data) {
        // 检查是否到达最后一页
        if (coinData.data.pageCount && pageNo.current * pageSize.current >= coinData.data.pageCount) {
          pageFinish.current = true;
          setHasMore(false);
        }
        
        // 处理多维度响应数据
        if (config.reponseData) {
          const tmpResData = Object.keys(coinData?.data).map((resData) => {
            return coinData?.data[resData];
          });
          setReadyData(prevData => [...prevData, ...tmpResData]);
        } else {
          const listData = Array.isArray(coinData.data) 
            ? coinData.data 
            : (Array.isArray(coinData.data.list) ? coinData.data.list : []);
          // 合并去重；若本次没有新增唯一数据，则认为没有更多了
          setRenderData(prevData => {
            const { merged, added } = mergeUnique(prevData, listData);
            if (added === 0) {
              pageFinish.current = true;
              setHasMore(false);
            }
            return merged;
          });
        }
      }
    } catch (error) {
      console.error('加载更多数据失败:', error);
    }
  };
  
  return (
    <>
      {/* 进入列表页和切换维度请求时显示全屏品牌Loading */}
      <LogoLoading
        visible={firstLoading}
        fullscreen
        mask
        image={loadingImg}
        size={72}
      />
      
      {!firstLoading && (
        <>
          {isLoading && <GardenLoading />}
          
          <div className={`${styles.scrollList} ${isHotSpecial ? styles.hotcoins : ''} ${isTradeablePlatform ? styles.tradeablePlatform : ''} ${styles.rankLarge}`}>
            {/* 头部区域 */}
            {showHeader && (
              <div className={styles.headerNew}>
            {/* 背景图（img，可拉伸填充容器） */}
            <div className={styles.headerBg}>
              <img
                src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/image/range_bg.png"
                alt="背景"
                className={styles.headerBgImg}
                loading="eager"
              />
            </div>
            
            {/* 返回按钮 */}
            <div className={styles.backBtn} onClick={goBack}>
              <LeftArrowIcon size={24} color="#fff" strokeWidth={2.5} />
            </div>
            
            {/* 头部内容 */}
            <div className={styles.headerCon}>
              <div className={styles.left}>
                <div className={styles.title}>{config.rankTitle}</div>
                {config.rankName && <div className={styles.rankName}>{config.rankName}</div>}
                <div className={styles.desc}>
                  {config.rankDesc && <span className={styles.descCon}>{config.rankDesc}</span>}
                </div>
              </div>
              <div className={styles.right}>
                {(headerImg || data[0]?.img) && (
                  <img src={headerImg || data[0]?.img} className={styles.headerImg} alt="" />
                )}
              </div>
            </div>
            
            {/* Tab切换胶囊 */}
            {config.selectArr && config.selectArr.length > 0 && (
              <div className={styles.tabSelect}>
                {config.selectArr.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className={`${styles.tabItem} ${selected === item ? styles.active : ''}`}
                    onClick={() => onTabChange(index)}
                  >
                    <span className={styles.tabText}>{item}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* 评论/分享胶囊 - 有Tab切换的页面不显示（如交易对、交易所排行榜），可交易平台页面也不显示 */}
            {(!config.selectArr || config.selectArr.length === 0) && 
             !config.rankTitle?.includes('可交易') && 
             !config.rankTitle?.includes('Tradeable') && (
              <div className={styles.actionsCapsule}>
                <div
                  className={styles.capsule}
                  onClick={() => {
                    router.push('/community');
                  }}
                >
                  <img
                    className={styles.capsuleIcon}
                    src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/comment.png"
                    alt="评论"
                  />
                  <span className={styles.capsuleText}>{config.commentCount || 0}</span>
                </div>
                <div className={styles.divider}></div>
                <div
                  className={styles.capsule}
                  onClick={() => {
                    // H5环境下的分享逻辑
                    if (navigator.share) {
                      navigator.share({
                        title: config.rankTitle,
                        text: `查看${config.rankTitle}排行榜`,
                        url: window.location.href
                      }).catch(() => {});
                    }
                  }}
                >
                  <img
                    className={styles.capsuleIcon}
                    src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/share.png"
                    alt="分享"
                  />
                  <span className={styles.capsuleText}>{config.shareCount || 0}</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* 表格标题栏 */}
        {config.gridTitle.length === 4 ? (
          // 四列标题：使用自定义列宽或默认列宽
          <div 
            className={`${styles.gridTitle} ${showHeader ? styles.showHeaderGrid : ''} ${config.showRanking ? styles.withRanking : ''} ${isTradeablePlatform ? styles.tradeablePlatformGrid : ''}`}
          >
            {config.gridTitle.map((colNameItem, colNameIndex) => {
              // 优先使用传入的 columnWidths，否则使用默认值
              const defaultWidths = ['20%', '28%', '25%', '25%'];
              const widths = config.columnWidths || defaultWidths;
              return (
                <div
                  key={colNameIndex}
                  className={`${styles.gridTitleItem} ${colNameIndex !== 0 ? styles.text : ''}`}
                  style={{ width: widths[colNameIndex] || `${100 / config.gridTitle.length}%` }}
                >
                  {colNameItem}
                </div>
              );
            })}
          </div>
        ) : config.gridTitle.length === 3 ? (
          // 三列标题：使用自定义列宽或默认列宽
          <div className={`${styles.gridTitle} ${showHeader ? styles.showHeaderGrid : ''} ${config.showRanking ? styles.withRanking : ''}`}>
            {config.gridTitle.map((colNameItem, colNameIndex) => {
              const defaultWidths = ['10%', '35%', '45%'];
              const widths = config.columnWidths || defaultWidths;
              return (
                <div
                  key={colNameIndex}
                  className={`${styles.gridTitleItem} ${colNameIndex !== 0 ? styles.text : ''}`}
                  style={{ width: widths[colNameIndex] || `${100 / config.gridTitle.length}%` }}
                >
                  {colNameItem}
                </div>
              );
            })}
          </div>
        ) : config.gridTitle.length === 2 ? (
          // 两列标题：使用自定义列宽或默认列宽
          <div className={`${styles.gridTitle} ${showHeader ? styles.showHeaderGrid : ''} ${config.showRanking ? styles.withRanking : ''}`}>
            {config.gridTitle.map((colNameItem, colNameIndex) => {
              const defaultWidths = ['67%', '23%'];
              const widths = config.columnWidths || defaultWidths;
              return (
                <div
                  key={colNameIndex}
                  className={`${styles.gridTitleItem} ${colNameIndex !== 0 ? styles.text : ''}`}
                  style={{ width: widths[colNameIndex] || `${100 / config.gridTitle.length}%` }}
                >
                  {colNameItem}
                </div>
              );
            })}
          </div>
        ) : (
          <Grid 
            className={`${styles.gridTitle} ${showHeader ? styles.showHeaderGrid : ''} ${config.showRanking ? styles.withRanking : ''}`} 
            columns={config.gridTitle.length}
          >
            {config.gridTitle.map((colNameItem, colNameIndex) => (
              <Grid.Item 
                key={colNameIndex} 
                className={`${styles.gridTitleItem} ${colNameIndex !== 0 ? styles.text : ''}`}
              >
                {colNameItem}
              </Grid.Item>
            ))}
          </Grid>
        )}
        
        {/* 滚动列表区域 */}
        <div className={`${styles.scroll} ${showHeader ? styles.showHeader : ''}`}>
          {data.length > 0 ? (
            <>
              <MoziGrid
                length={config.gridTitle.length}
                colName={config.gridTitle}
                gridContent={data}
                callback={(gridCon) => {
                  if (!gridCon.key) return;
                  jump2Detail(gridCon.key);
                }}
                hideTitle={true}
                simpleRanking={config.showRanking}
              />
              
              <InfiniteScroll loadMore={loadMore} hasMore={hasMore}>
                {hasMore ? (
                  <div style={{ textAlign: 'center', padding: '10px', color: '#999', fontSize: '12px' }}>
                    加载中...
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '10px', color: '#999', fontSize: '12px' }}>
                    没有更多了
                  </div>
                )}
              </InfiniteScroll>
            </>
          ) : (
            !isLoading && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '14px' }}>
                暂无数据
              </div>
            )
          )}
        </div>
      </div>
        </>
      )}
    </>
  );
}