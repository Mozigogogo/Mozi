"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./page.module.less";
import MoziGrid from "@/components/MoziGrid";
import { Loading } from "@/components/Loading";
import { request } from "@/utils/request";
import { Interface } from "@/utils/constants";
import { useRouter } from "next/navigation";
import { useShareCount } from "@/hooks/useShareCount";
import { safeBack } from "@/utils/navigation";

const COMMENT_ICON = "https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/comment.png";
const SHARE_ICON = "https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/share.png";

export default function DownRankPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { shareCount, incrementShareCount } = useShareCount('pricechangeasc');

  const tabs = useMemo(() => [
    { label: t('discover.range.live'), value: "today" },
    { label: t('discover.range.1d'), value: "1_day" },
    { label: t('discover.range.1w'), value: "7_day" },
    { label: t('discover.range.1m'), value: "1_month" },
    { label: t('discover.range.1y'), value: "1_year" },
  ], [t]);

  const [tabIndex, setTabIndex] = useState(0);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [headerImg, setHeaderImg] = useState("");

  const gridTitle = useMemo(() => [t('priceRank.symbol'), t('priceRank.losers')], [t]);

  const fetchData = async (dim) => {
    setLoading(true);
    setError(false);
    try {
      const res = await request({ url: Interface.PRICE_DOWNCHANGE, data: { dim } });
      const data = Array.isArray(res?.data) ? res.data : [];
      const mapped = data.map((item) => ({
        col1: (
          <div className={styles.gridText}>
            <img className={styles.coinIcon} src={item.url} alt={item.symbol} />
            {item.symbol}
          </div>
        ),
        col2: item.priceRange,
        img: item.url,
        key: item.symbol
      }));
      setList(mapped);
      if (data[0]?.url) setHeaderImg(data[0].url);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(tabs[tabIndex].value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabIndex]);

  const onBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      safeBack(router, { fallback: '/' });
    } else {
      router.push('/find?tab=rank');
    }
  };

  const onShare = () => {
    // 增加分享次数
    incrementShareCount();
    
    const shareUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent(`${t('home.rank.down')} - ${t('exchangeRank.realTimeUpdate')}`);
    const telegramUrl = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;
    window.open(telegramUrl, '_blank');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerBg} />
        <div className={styles.backBtn} onClick={onBack} aria-label="返回">
          <svg className={styles.backIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/>
          </svg>
        </div>
        <div className={styles.headerContent}>
          <div className={styles.left}>
            <div className={styles.title}>{t('home.rank.down')}</div>
            <div className={styles.rankName}>Top100</div>
            <div className={styles.desc}><span className={styles.descText}>{t('exchangeRank.realTimeUpdate')}</span></div>
          </div>
          <div className={styles.right}>
            {headerImg ? <img className={styles.headerImg} src={headerImg} alt="logo" /> : null}
          </div>
          <div className={styles.tabsCapsule}>
            {tabs.map((tab, i) => (
              <div key={tab.value} className={`${styles.tabItem} ${i === tabIndex ? styles.tabItemActive : ''}`} onClick={() => setTabIndex(i)}>{tab.label}</div>
            ))}
          </div>
          <div className={styles.actionsCapsule}>
            <div className={styles.capsuleBtn} onClick={() => router.push(`/rankdiscuss?type=down&name=${encodeURIComponent(t('home.rank.down'))}`)}>
              <img className={styles.capsuleIcon} src={COMMENT_ICON} alt="评论" />
              <span className={styles.capsuleText}>0</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.capsuleBtn} onClick={onShare}>
              <img className={styles.capsuleIcon} src={SHARE_ICON} alt="分享" />
              <span className={styles.capsuleText}>{shareCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.scroll}>
        {loading ? (
          <Loading />
        ) : (
          <>
            <MoziGrid
              length={2}
              colName={gridTitle}
              gridContent={list.map((it) => ({ key1: it.col1, key2: it.col2, img: it.img, key: it.key }))}
              hideTitle={false}
              simpleRanking
              stickyHeader
              stickyTop={0}
              gridTitleBgColor="#dfdfdf"
              gridTitleStyle={{ borderBottom: '1px solid #e6e6e6' }}
              columnWidths={["60%","40%"]}
              className={styles.gridTitleWrap}
              contentFontSize="15px"
              titleFontSize="13px"
              rowPadding="11px 0"
            />

            {error && <div style={{ padding: 16, textAlign: 'center' }}>{t('common.loadFailed')}</div>}
            {!error && list.length === 0 && <div style={{ padding: 16, textAlign: 'center' }}>{t('common.noData')}</div>}
          </>
        )}
      </div>
    </div>
  );
}