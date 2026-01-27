'use client';

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TabBar } from 'antd-mobile';
import { RightOutline } from 'antd-mobile-icons';
import MoziCard from '@/components/MoziCard';
import MoziGrid from '@/components/MoziGrid';
import { Loading } from '@/components/Loading';
import styles from './index.module.less';

export default function RealTimeRanking({
  activeArr = [],
  footerArr = [],
  rankActiveKey = 'zixuan',
  rankLoadingStates = {},
  rankLoadedStates = {},
  onRankActiveClick,
  onJump2Detail,
  onGo2List
}) {
  const { t } = useTranslation();
  const rankingSectionRef = useRef(null);

  const currentIndex = activeArr.indexOf(rankActiveKey);
  const currentRankData = footerArr[currentIndex] || [];
  const isLoading = rankLoadingStates[currentIndex];
  const isLoaded = rankLoadedStates[currentIndex];

  return (
    <div ref={rankingSectionRef} className={styles.realTimeRankingSection}>
      {/* 标题在外面 */}
      <div className={styles.rankingTitle}>{t('home.rankList')}</div>
      
      {/* 内容在白色背景容器内 */}
      <MoziCard
        hideHeader={true}
        borderRadius="20px"
        customStyle={{
          boxShadow: '0px 0px 4px 0px rgba(0, 0, 0, 0.05)'
        }}
      >
        <TabBar className={styles.tabBox} activeKey={rankActiveKey} onChange={onRankActiveClick}>
          <TabBar.Item key='zixuan' title={t('home.rank.self')} />
          <TabBar.Item key='zhangfu' title={t('home.rank.up')} />
          <TabBar.Item key='diefu' title={t('home.rank.down')} />
          <TabBar.Item key='zhenfu' title={t('home.rank.wave')} />
          <TabBar.Item key='chengjiaoe' title={t('home.rank.volume')} />
          <TabBar.Item key='xinbi' title={t('home.rank.new')} />
          <TabBar.Item key='biaosheng' title={t('home.rank.surge')} />
        </TabBar>
        
        {/* 始终保持内容区域，避免折叠 */}
        <div style={{ minHeight: '180px' }}>
          {isLoading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Loading tip={t('common.loading')} />
            </div>
          ) : currentRankData.length > 0 ? (
            <div>
              <MoziGrid
                length={5}
                colName={[
                  t('home.columns.symbol'),
                  rankActiveKey === 'chengjiaoe' ? t('home.columns.lastVolume') : t('home.columns.lastPrice'),
                  t('home.columns.change24h'),
                  t('home.columns.addFavorites'),
                  t('home.columns.addMonitor')
                ]}
                gridContent={currentRankData}
                callback={(gridCon) => { 
                  // 如果币种已收藏（isFavorite为true），传入 fromFavorite 参数
                  onJump2Detail?.(gridCon.key, gridCon.isFavorite === true); 
                }}
                maxRows={10}
                minRows={10}
                gridTitleBgColor="transparent"
                columnWidths={['32%', '23%', '25%', '15%', '15%']}
              />
              <div className={styles.listMore} onClick={onGo2List}>
                {t('user.viewMore')} <RightOutline fontSize={12} />
              </div>
            </div>
          ) : isLoaded ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#999' }}>
              {rankActiveKey === 'zixuan' ? t('home.noFavorites') : t('common.noData')}
            </div>
          ) : null}
        </div>
      </MoziCard>
    </div>
  );
}
