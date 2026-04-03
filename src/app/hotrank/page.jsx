"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../pricerank/page.module.less";
import MoziGrid from "@/components/MoziGrid";
import HighlightArea from "@/components/HighlightArea";
import { Loading } from "@/components/Loading";
import { request } from "@/utils/request";
import { Interface } from "@/utils/constants";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

const COMMENT_ICON = "https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/comment.png";
const SHARE_ICON = "https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/share.png";

export default function HotRankPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const type = (searchParams.get("type") || "coin").toLowerCase();

  const title = useMemo(() => {
    if (type === "industry") return t("home.hotSectors");
    if (type === "contract") return t("home.hotContracts");
    return t("home.hotCoins");
  }, [type, t]);

  const gridTitle = useMemo(() => {
    if (type === "industry") return [t("home.columns.section"), t("home.columns.change24h")];
    return [t("home.columns.symbol"), t("home.columns.hotIndex"), t("home.columns.change24h")];
  }, [type, t]);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [headerImg, setHeaderImg] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      let url = Interface.hot_coin;
      if (type === "industry") url = Interface.SECTION_LIST;
      else if (type === "contract") url = Interface.hot_contract;

      const res = await request({ url, data: { pageSize: 100, pageNo: 1 } });
      const data = Array.isArray(res?.data) ? res.data : [];

      const mapped = data.map((item) => {
        if (type === "industry") {
          const raw = item.priceChange24h ?? 0;
          const change = Math.abs(raw) <= 1 ? raw * 100 : raw;
          const changeStr = `${change.toFixed(2)}%`;
          return {
            col1: item.category,
            col2: <HighlightArea value={changeStr} />,
            img: item.url,
            key: item.category || item.url || Math.random()
          };
        }
        return {
          col1: (
            <div className={styles.gridText}>
              {item.url ? <img className={styles.coinIcon} src={item.url} alt={item.coin || item.symbol} /> : null}
              {item.coin || item.symbol}
            </div>
          ),
          col2: item.hot,
          col3: <HighlightArea value={item.priceChangePercent} />,
          img: item.url,
          key: item.coin || item.symbol
        };
      });

      setList(mapped);
      if (type === 'coin') {
        const firstSymbol = data[0]?.coin || data[0]?.symbol;
        if (data[0]?.url) {
          setHeaderImg(data[0].url);
        } else if (firstSymbol) {
          try {
            const info = await request({ url: Interface.COIN_INFO, data: { coin: firstSymbol } });
            if (Array.isArray(info?.data) && info.data[0]?.url) {
              setHeaderImg(info.data[0].url);
            } else if (info?.data?.url) {
              setHeaderImg(info.data.url);
            }
          } catch {}
        }
      } else {
        if (type === 'contract') {
          const firstSymbol = data[0]?.coin || data[0]?.symbol;
          if (data[0]?.url) {
            setHeaderImg(data[0].url);
          } else if (firstSymbol) {
            try {
              const info = await request({ url: Interface.COIN_INFO, data: { coin: firstSymbol } });
              if (Array.isArray(info?.data) && info.data[0]?.url) {
                setHeaderImg(info.data[0].url);
              } else if (info?.data?.url) {
                setHeaderImg(info.data.url);
              }
            } catch {}
          }
        } else {
          if (data[0]?.url) setHeaderImg(data[0].url);
        }
      }
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [type]);

  const onBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/find?tab=rank');
    }
  };

  const onShare = () => {
    const shareUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent(title);
    const telegramUrl = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;
    window.open(telegramUrl, '_blank');
  };

  const toCommunity = () => router.push(`/rankdiscuss?type=hot&name=${encodeURIComponent(title)}`);

  const isIndustry = type === "industry";
  const columnWidths = isIndustry ? ["60%", "40%"] : ["50%", "25%", "25%"];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div
          className={styles.headerBg}
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '120vw',
            maxWidth: '120vw',
            height: 200,
            backgroundImage: "url('https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/image/range_bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className={styles.backBtn} onClick={onBack} aria-label="返回">
          <svg className={styles.backIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/>
          </svg>
        </div>
        <div className={styles.headerContent}>
          <div className={styles.left}>
            <div className={styles.title}>{title}</div>
          </div>
          <div className={styles.right}>{headerImg ? <img className={styles.headerImg} src={headerImg} alt="logo" /> : null}</div>
        </div>
      </div>

      <div className={styles.scroll}>
        {loading ? (
          <Loading />
        ) : (
          <>
            <MoziGrid
              length={gridTitle.length}
              colName={gridTitle}
              gridContent={list.map((it) => (
                isIndustry
                  ? { key1: it.col1, key2: it.col2, img: it.img, key: it.key }
                  : { key1: it.col1, key2: it.col2, key3: it.col3, img: it.img, key: it.key }
              ))}
              hideTitle={false}
              simpleRanking
              stickyHeader
              stickyTop={0}
              gridTitleBgColor="#dfdfdf"
              gridTitleStyle={{ borderBottom: '1px solid #e6e6e6', paddingLeft: 28 }}
              columnWidths={columnWidths}
              className={styles.gridTitleWrap}
            />

            {error && <div style={{ padding: 16, textAlign: 'center' }}>{t('common.error')}</div>}
            {!error && list.length === 0 && <div style={{ padding: 16, textAlign: 'center' }}>{t('common.noData')}</div>}
          </>
        )}
      </div>
    </div>
  );
}