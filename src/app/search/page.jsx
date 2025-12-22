'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const isEnglish = (i18n.language || 'zh').startsWith('en');

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
      const isCoin = await request({ url: Interface.IS_COIN, data: { coin: value } });
      if (!isCoin?.data?.isCoin) { setShowType('invalid'); return; }
    } catch (e) {
      return;
    }

    coinRequest(value);

    const requests = [
      request({ url: Interface.COIN_AREA, data: { coin: value } }),
      request({ url: Interface.COIN_PLATFORM, data: { coin: value } }),
      request({ url: Interface.COIN_SPOT, data: { coin: value } })
    ];

    const results = await Promise.allSettled(requests);

    const areaRes = results[0];
    if (areaRes.status === 'fulfilled' && !isEmpty(areaRes.value?.data)) {
      const temp = areaRes.value.data.slice(0, 4);
      setAreaData({ length: areaRes.value.data.length, data: temp, loading: false, close: false });
    } else if (areaRes.status === 'fulfilled') {
      setAreaData({ close: true });
    } else {
      setAreaData(prev => ({ ...prev, loading: false }));
    }

    const platformRes = results[1];
    if (platformRes.status === 'fulfilled' && !isEmpty(platformRes.value?.data)) {
      const temp = platformRes.value.data.slice(0, 3).map((item) => ({
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
      setPlatformData({ length: platformRes.value.data.length, data: temp, loading: false, close: false });
    } else if (platformRes.status === 'fulfilled') {
      setPlatformData({ close: true });
    } else {
      setPlatformData(prev => ({ ...prev, loading: false }));
    }

    const spotRes = results[2];
    if (spotRes.status === 'fulfilled' && !isEmpty(spotRes.value?.data)) {
      const spotArr = [];
      if (!isEmpty(spotRes.value.data?.spot)) {
        const spotTemp = spotRes.value.data.spot.slice(0, 3).map((item) => ({
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
        spotArr.push(spotTemp);
      }
      if (!isEmpty(spotRes.value.data?.nonSpot)) {
        const nonSpotTemp = spotRes.value.data.nonSpot.slice(0, 3).map((item) => ({
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
        spotArr.push(nonSpotTemp);
      }
      setSpotData({
        length: spotRes.value.data.spot?.length > 3 || spotRes.value.data.nonSpot?.length > 3 ? 'more' : false,
        data: spotArr,
        loading: false,
        close: false
      });
    } else if (spotRes.status === 'fulfilled') {
      setSpotData({ close: true });
    } else {
      setSpotData(prev => ({ ...prev, loading: false }));
    }
  };

  const spotColNameList = [
    [<span key="spot" className={styles.pairTitleStrong}>{t('search.spotPairs')}</span>, t('discover.exchange.columns.exchange'), t('home.columns.lastPrice'), t('home.columns.change24hShort')],
    [<span key="nonspot" className={styles.pairTitleStrong}>{t('search.derivativePairs')}</span>, t('discover.exchange.columns.exchange'), t('home.columns.lastPrice'), t('home.columns.change24hShort')]
  ];

  const infoColumnWidths = isEnglish ? ['22%', '24%', '24%', '15%', '15%'] : ['24%', '26%', '20%', '15%', '15%'];
  const spotColumnWidths = isEnglish ? ['28%', '24%', '26%', '22%'] : ['30%', '25%', '25%', '20%'];

  return (
    <div className={styles.indexBox}>
      {/* 顶部区域 */}
      <div className={styles.topArea}>
        {/* 自定义导航栏 */}
        <div className={styles.customNavbar}>
          <div className={styles.navbarLeft} onClick={() => router.back()}>
            <LeftOutline fontSize={24} color="#ffffff" />
          </div>
          <div className={styles.navbarTitle}>{t('common.search')}</div>
          <div className={styles.navbarRight}></div>
        </div>

        {/* 搜索框区域 */}
        <div className={styles.header}>
          <SearchInput reloadFun={reload} value={searchValue} placeholder={t('home.searchPlaceholder')} />
        </div>

        {/* 币种头部信息 */}
        {showType === 'valid' && (
          <div className={styles.coinHeaderInfo}>
            <div className={styles.coinHeaderItem}>
              {t('search.coins')}({infoData.length})
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
          <div className={styles.noSearchBox}>{t('search.inputPrompt')}</div>
        )}

        {showType === 'invalid' && (
          <div className={styles.noSearchBox}>{t('search.invalidCoin')}</div>
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
                    colName={[t('home.columns.symbol'), t('home.columns.lastPrice'), t('home.columns.change24hShort'), t('home.columns.addFavorites'), t('home.columns.addMonitor')]}
                    gridContent={infoData.data || []}
                    callback={(gridCon) => jump2Detail(gridCon.key)}
                    columnWidths={infoColumnWidths}
                    gridTitleBgColor={'transparent'}
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
                    {t('search.relatedSections')}({areaData.length})
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
                    {t('search.tradeablePlatforms', { coin: searchValue })}({platformData.length})
                    {platformData.length > 3 && <RightArrowIcon size={20} color="#666666" />}
                  </div>
                </div>
                <MoziCard>
                  {platformData.loading ? (
                    <Loading />
                  ) : (
                    <MoziGrid
                      length={4}
                      colName={[t('search.platform'), t('search.chain'), t('search.withdrawFee'), t('search.withdrawMin')]}
                      gridContent={platformData.data || []}
                      columnWidths={['28%', '25%', '25%', '22%']}
                      gridTitleBgColor={'transparent'}
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
                    {t('search.pairs')}
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
                            columnWidths={spotColumnWidths}
                            gridTitleBgColor={'transparent'}
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
