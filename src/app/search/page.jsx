'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LeftOutline } from 'antd-mobile-icons';
import { SearchInput } from '../../components/SearchInput';
import MoziCard from '../../components/MoziCard';
import MoziGrid from '../../components/MoziGrid';
import HighlightArea from '../../components/HighlightArea';
import { Loading } from '../../components/Loading';
import { FavoriteIcon, BellIcon, RightArrowIcon } from '../../components/Icons';
import { request } from '../../utils/request';
import { Interface, LOOPTIME } from '../../utils/constants';
import { jump2Detail, jump2List } from '../../utils/core';
import isEmpty from 'lodash/isEmpty';
import styles from './page.module.less';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyword = searchParams.get('keyword') || '';

  const [showType, setShowType] = useState('none');
  const [searchValue, setSearchValue] = useState(keyword);

  // 四个数据模块的状态
  const [infoData, setInfoData] = useState({
    length: 0,
    data: null,
    loading: true,
    close: false
  });

  const [areaData, setAreaData] = useState({
    length: 0,
    data: null,
    loading: true,
    close: false
  });

  const [platformData, setPlatformData] = useState({
    length: 0,
    data: null,
    loading: true,
    close: false
  });

  const [spotData, setSpotData] = useState({
    length: 0,
    data: null,
    loading: true,
    close: false
  });

  const needLoop = useRef(true);

  // 页面显示/隐藏控制
  useEffect(() => {
    needLoop.current = true;
    
    return () => {
      needLoop.current = false;
    };
  }, []);

  // 初始搜索
  useEffect(() => {
    if (keyword) {
      reload(keyword);
    }
  }, [keyword]);

  // 币种信息轮询请求
  const coinRequest = async (value) => {
    try {
      const sectionRes = await request({
        url: Interface.COIN_INFO,
        data: { coin: value }
      });

      if (sectionRes?.data && !isEmpty(sectionRes.data)) {
        const tempData = sectionRes.data.slice(0, 3).map((item) => ({
          title: (
            <div className={styles.gridText}>
              <img className={styles.gridIcon} src={item.url} alt={item.symbol} />
              <div className={styles.gridName}>{item.symbol}</div>
            </div>
          ),
          last: item.last,
          price24h: <HighlightArea value={item.price24h} />,
          isOwn: <FavoriteIcon filled={item.favorite} size={18} />,
          monitor: <BellIcon active={false} size={18} />,
          key: item.symbol
        }));

        setInfoData({
          length: sectionRes.data.length,
          data: tempData,
          loading: false,
          close: false
        });
      }

      // 继续轮询
      setTimeout(() => {
        if (needLoop.current) coinRequest(value);
      }, LOOPTIME);
    } catch (error) {
      console.error('币种信息请求失败:', error);
    }
  };

  // 主搜索函数
  const reload = async (value) => {
    if (!value) return;

    setSearchValue(value);
    setShowType('valid');

    try {
      // 1. 验证币种
      const isCoin = await request({
        url: Interface.IS_COIN,
        data: { coin: value }
      });

      if (!isCoin?.data?.isCoin) {
        setShowType('invalid');
        return;
      }

      // 2. 启动币种信息轮询
      coinRequest(value);

      // 3. 并发请求其他接口
      const interfaceList = [Interface.COIN_AREA, Interface.COIN_PLATFORM, Interface.COIN_SPOT];

      for (let i = 0; i < interfaceList.length; i++) {
        const sectionRes = await request({
          url: interfaceList[i],
          data: { coin: value }
        });

        if (!isEmpty(sectionRes?.data)) {
          let tempData = null;

          // 相关版块
          if (interfaceList[i] === Interface.COIN_AREA) {
            tempData = sectionRes.data.slice(0, 4);
            setAreaData({
              length: sectionRes.data.length,
              data: tempData,
              loading: false,
              close: false
            });
          }

          // 可交易平台
          if (interfaceList[i] === Interface.COIN_PLATFORM) {
            tempData = sectionRes.data.slice(0, 3).map((item) => ({
              title: (
                <div className={styles.gridText}>
                  <img className={styles.gridIcon} src={item.url} alt={item.exchanges} />
                  <div className={styles.gridName}>{item.exchanges}</div>
                </div>
              ),
              chain: item.chain,
              withdrawfee: item.withdrawfee,
              withdrawmin: item.withdrawmin
            }));
            setPlatformData({
              length: sectionRes.data.length,
              data: tempData,
              loading: false,
              close: false
            });
          }

          // 交易对
          if (interfaceList[i] === Interface.COIN_SPOT) {
            const spotArr = [];
            if (!isEmpty(sectionRes.data?.spot)) {
              tempData = sectionRes.data.spot.slice(0, 3).map((item) => ({
                title: (
                  <div className={styles.gridText}>
                    <img className={styles.gridIcon} src={item.url} alt={item.symbol} />
                    <div className={styles.gridName}>{item.symbol}</div>
                  </div>
                ),
                symbol: item.exchanges,
                lasts: item.lasts,
                price24h: <HighlightArea value={item.price24h} />
              }));
              spotArr.push(tempData);
            }
            if (!isEmpty(sectionRes.data?.nonSpot)) {
              tempData = sectionRes.data.nonSpot.slice(0, 3).map((item) => ({
                title: (
                  <div className={styles.gridText}>
                    <img className={styles.gridIcon} src={item.url} alt={item.symbol} />
                    <div className={styles.gridName}>{item.symbol}</div>
                  </div>
                ),
                symbol: item.exchanges,
                lasts: item.lasts,
                price24h: <HighlightArea value={item.price24h} />
              }));
              spotArr.push(tempData);
            }
            setSpotData({
              length: sectionRes.data.spot?.length > 3 || sectionRes.data.nonSpot?.length > 3 ? 'more' : false,
              data: spotArr,
              loading: false,
              close: false
            });
          }
        } else {
          // 数据为空，关闭对应模块
          if (interfaceList[i] === Interface.COIN_AREA) {
            setAreaData({ close: true });
          }
          if (interfaceList[i] === Interface.COIN_PLATFORM) {
            setPlatformData({ close: true });
          }
          if (interfaceList[i] === Interface.COIN_SPOT) {
            setSpotData({ close: true });
          }
        }
      }
    } catch (error) {
      console.error('搜索失败:', error);
      setShowType('invalid');
    }
  };

  const spotColNameList = [
    [<span key="spot" className={styles.pairTitleStrong}>现货交易对</span>, '交易所', '最新价', '24H变化'],
    [<span key="nonspot" className={styles.pairTitleStrong}>衍生品交易对</span>, '交易所', '最新价', '24H变化']
  ];

  return (
    <div className={styles.indexBox}>
      {/* 顶部区域 */}
      <div className={styles.topArea}>
        {/* 自定义导航栏 */}
        <div className={styles.customNavbar}>
          <div className={styles.navbarLeft} onClick={() => router.back()}>
            <LeftOutline fontSize={24} color="#ffffff" />
          </div>
          <div className={styles.navbarTitle}>搜索</div>
          <div className={styles.navbarRight}></div>
        </div>

        {/* 搜索框区域 */}
        <div className={styles.header}>
          <SearchInput reloadFun={reload} value={searchValue} />
        </div>

        {/* 币种头部信息 */}
        {showType === 'valid' && (
          <div className={styles.coinHeaderInfo}>
            <div className={styles.coinHeaderItem}>
              币种({infoData.length})
              {infoData.length > 3 && <RightArrowIcon size={20} color="#666666" />}
            </div>
          </div>
        )}
        
        {/* 空状态头部 */}
        {(showType === 'none' || showType === 'invalid') && (
          <div className={styles.coinHeaderInfo}></div>
        )}
      </div>

      {/* 内容区域 */}
      <div className={styles.contentArea}>
        {showType === 'none' && (
          <div className={styles.noSearchBox}>请输入您想搜索的币种</div>
        )}

        {showType === 'invalid' && (
          <div className={styles.noSearchBox}>请输入正确的币种</div>
        )}

        {showType === 'valid' && (
          <div className={styles.searchBox}>
            {/* 币种信息 */}
            {!infoData.close && (
              <MoziCard
                type={infoData.length > 3 ? 'more' : null}
                callback={() => {
                  if (infoData.length > 3) {
                    jump2List({
                      showHeader: true,
                      rankTitle: searchValue,
                      interFace: Interface.COIN_INFO,
                      requestData: { coin: searchValue }
                    });
                  }
                }}
              >
                {infoData.loading ? (
                  <Loading />
                ) : (
                  <MoziGrid
                    length={5}
                    colName={['名称', '最新价', '24H涨幅', '加自选', '加监控']}
                    gridContent={infoData.data || []}
                    callback={(gridCon) => jump2Detail(gridCon.key)}
                    columnWidths={['24%', '26%', '20%', '15%', '15%']}
                  />
                )}
              </MoziCard>
            )}

            {/* 相关版块 */}
            {!areaData.close && (
              <>
                <div className={styles.headerInfo}>
                  <div 
                    className={styles.headerInfoItem}
                    onClick={() => {
                      if (areaData.length > 4) {
                        jump2List({
                          showHeader: true,
                          rankTitle: searchValue,
                          interFace: Interface.COIN_AREA,
                          requestData: { coin: searchValue }
                        });
                      }
                    }}
                    style={{ cursor: areaData.length > 4 ? 'pointer' : 'default' }}
                  >
                    相关版块({areaData.length})
                    {areaData.length > 4 && <RightArrowIcon size={20} color="#666666" />}
                  </div>
                </div>
                <MoziCard>
                  {areaData.loading ? (
                    <Loading />
                  ) : (
                    <div className={styles.areaFlex}>
                      {areaData.data &&
                        areaData.data.map((item, index) => (
                          <HighlightArea key={index} title={item.section} value={item.changes} variant="section" />
                        ))}
                    </div>
                  )}
                </MoziCard>
              </>
            )}

            {/* 可交易平台 */}
            {!platformData.close && (
              <>
                <div className={styles.headerInfo}>
                  <div 
                    className={styles.headerInfoItem}
                    onClick={() => {
                      if (platformData.length > 3) {
                        jump2List({
                          showHeader: true,
                          rankTitle: `可交易${searchValue.toUpperCase()}平台`,
                          interFace: Interface.COIN_PLATFORM,
                          requestData: { coin: searchValue }
                        });
                      }
                    }}
                    style={{ cursor: platformData.length > 3 ? 'pointer' : 'default' }}
                  >
                    可交易{searchValue}平台({platformData.length})
                    {platformData.length > 3 && <RightArrowIcon size={20} color="#666666" />}
                  </div>
                </div>
                <MoziCard>
                  {platformData.loading ? (
                    <Loading />
                  ) : (
                    <MoziGrid
                      length={4}
                      colName={['平台', '所属链', '提取手续费', '最小提币量']}
                      gridContent={platformData.data || []}
                      columnWidths={['28%', '25%', '25%', '22%']}
                    />
                  )}
                </MoziCard>
              </>
            )}

            {/* 交易对 */}
            {!spotData.close && (
              <>
                <div className={styles.headerInfo}>
                  <div 
                    className={styles.headerInfoItem}
                    onClick={() => {
                      jump2List({
                        showHeader: true,
                        rankTitle: `${searchValue.toUpperCase()}交易对`,
                        interFace: Interface.COIN_SPOT,
                        requestData: { coin: searchValue }
                      });
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    交易对
                    <RightArrowIcon size={20} color="#666666" />
                  </div>
                </div>
                <MoziCard>
                  {spotData.loading ? (
                    <Loading />
                  ) : (
                    <>
                      {spotData.data &&
                        spotData.data.map((pairItem, pairIndex) => (
                          <MoziGrid
                            key={pairIndex}
                            length={4}
                            colName={spotColNameList[pairIndex]}
                            gridContent={pairItem}
                            columnWidths={['30%', '25%', '25%', '20%']}
                          />
                        ))}
                    </>
                  )}
                </MoziCard>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
