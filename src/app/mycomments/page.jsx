"use client";

import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import Layout from "@/components/Layout";
import { Loading } from "@/components/Loading";
import NavBar from "@/components/NavBar";
import { request } from "@/utils/request";
import { Interface } from "@/utils/constants";
import styles from "./page.module.less";

const formatTime = (timeStr, t) => {
  if (!timeStr) return "";
  const date = new Date(timeStr);
  const diff = Date.now() - date.getTime();
  const m = 60 * 1000, h = 60 * m, d = 24 * h;
  if (diff < m) return t('time.justNow');
  if (diff < h) return t('time.minutesAgo', { count: Math.floor(diff / m) });
  if (diff < d) return t('time.hoursAgo', { count: Math.floor(diff / h) });
  if (diff < 7 * d) return t('time.daysAgo', { count: Math.floor(diff / d) });
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
};

export default function MyCommentsPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLogin, setIsLogin] = useState(false);
  const [useMock, setUseMock] = useState(false);

  const checkLogin = () => {
    try {
      const token = localStorage.getItem("token");
      setIsLogin(!!token);
    } catch {}
  };

  const goLogin = () => {
    window.location.href = "/user?showLogin=true";
  };

  const loadComments = async (refresh = false) => {
    try {
      if (refresh) {
        setPage(1);
        setLoading(true);
      }
      const currentPage = refresh ? 1 : page;
      if (useMock) {
        const mock = Array.from({ length: 8 }).map((_, i) => ({
          id: 54000 + i,
          title: i % 2 ? 'DeFi 板块出现回暖迹象' : 'BTC 资金费率持续走高，注意回撤风险',
          content: i % 2 ? '链上活跃度提升，TVL 回升，注意龙头带动效应。' : '短线情绪偏热，建议逐步止盈，设置好风控。',
          comments: i % 3 ? '我认为还会冲一波' : '说得很有道理，已减仓',
          createdAt: new Date(Date.now() - (i + 1) * 3600 * 1000).toISOString(),
          userName: i % 2 ? 'MoziUser' : 'TraderX'
        }));
        setList(refresh ? mock : [...list, ...mock]);
        setHasMore(false);
        setPage(currentPage + 1);
      } else {
        const res = await request({
          url: Interface.GET_MY_COMMENTS,
          data: { page: currentPage, size: 20 },
        });
        if (res?.data) {
          const newComments = res.data;
          setList(refresh ? newComments : [...list, ...newComments]);
          setHasMore((newComments?.length || 0) >= 20);
          setPage(currentPage + 1);
        }
      }
    } catch (e) {
      console.error(t('myComments.loadFailed'), e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLogin();
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const params = new URLSearchParams(search);
      const mockFlag = params.get('mock') === '1' || params.get('mock') === 'true';
      if (mockFlag) {
        setUseMock(true);
        setIsLogin(true);
      }
    } catch {}
    loadComments(true);
  }, []);

  const goToPostDetail = (postId) => {
    window.location.href = `/commentinfo?id=${postId}`;
  };

  return (
    <Layout>
      <div className={styles.container}>
        <NavBar title={t('myComments.title')} showBorder={false} />
        {!isLogin ? (
          <div className={styles.empty}>
            <div>{t('myComments.pleaseLogin')}</div>
            <div className={styles.loginBtn} onClick={goLogin}>{t('myComments.goLogin')}</div>
          </div>
        ) : (
          <div className={styles.scroll}>
            {loading && page === 1 ? (
              <Loading />
            ) : list.length === 0 ? (
              <div className={styles.empty}>{t('myComments.empty')}</div>
            ) : (
              <>
                {list.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className={styles.item} onClick={() => goToPostDetail(item.id)}>
                    {item.title && <div className={styles.postTitle}>{item.title}</div>}
                    {item.content && <div className={styles.postContent}>{item.content}</div>}
                    <div className={styles.commentArea}>
                      <div className={styles.commentLabel}>{t('myComments.myCommentLabel')}</div>
                      <div className={styles.myComment}>{item.comments}</div>
                    </div>
                    <div className={styles.footer}>
                      <div>{formatTime(item.createdAt, t)}</div>
                      {item.userName ? (
                        <div className={styles.authorInfo}>
                          {item.avatar && (
                            <img 
                              className={styles.authorAvatar} 
                              src={item.avatar} 
                              alt="" 
                            />
                          )}
                          <span className={styles.author}>{t('myComments.replyTo')}{item.userName}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}

                {loading && page > 1 && (
                  <div className={styles.loadingMore}>{t('myComments.loadingMore')}</div>
                )}
                {!hasMore && list.length > 0 && (
                  <div className={styles.noMore}>{t('myComments.noMore')}</div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}