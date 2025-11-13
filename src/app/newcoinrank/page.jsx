"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.less";
import MoziGrid from "@/components/MoziGrid";
import { request } from "@/utils/request";
import { Interface } from "@/utils/constants";
import { useRouter } from "next/navigation";

const COMMENT_ICON = "https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/comment.png";
const SHARE_ICON = "https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/share.png";

export default function NewCoinRankPage() {
  const router = useRouter();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [headerImg, setHeaderImg] = useState("");

  const gridTitle = useMemo(() => ["币种", "最新价"], []);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await request({ url: Interface.NEW_COIN, data: {} });
      const data = Array.isArray(res?.data) ? res.data : [];
      const mapped = data.map((item) => ({
        col1: (
          <div className={styles.gridText}>
            <img className={styles.coinIcon} src={item.url} alt={item.symbol} />
            {item.symbol}
          </div>
        ),
        col2: item.volume_24h,
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

  useEffect(() => { fetchData(); }, []);

  const onBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/find?tab=rank');
    }
  };

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: '新币榜', text: '新币榜', url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('链接已复制');
      }
    } catch {}
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
            <div className={styles.title}>新币榜</div>
            <div className={styles.rankName}>Top100</div>
            <div className={styles.desc}><span className={styles.descText}>实时更新</span></div>
          </div>
          <div className={styles.right}>
            {headerImg ? <img className={styles.headerImg} src={headerImg} alt="logo" /> : null}
          </div>
          <div className={styles.actionsCapsule}>
            <div className={styles.capsuleBtn} onClick={() => router.push('/community')}>
              <img className={styles.capsuleIcon} src={COMMENT_ICON} alt="评论" />
              <span className={styles.capsuleText}>0</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.capsuleBtn} onClick={onShare}>
              <img className={styles.capsuleIcon} src={SHARE_ICON} alt="分享" />
              <span className={styles.capsuleText}>0</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.scroll}>
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
        />

        {loading && <div style={{ padding: 16, textAlign: 'center' }}>加载中...</div>}
        {!loading && error && <div style={{ padding: 16, textAlign: 'center' }}>加载失败，请稍后重试</div>}
        {!loading && !error && list.length === 0 && <div style={{ padding: 16, textAlign: 'center' }}>暂无数据</div>}
      </div>
    </div>
  );
}