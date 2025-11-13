"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Loading } from "@/components/Loading";
import NavBar from "@/components/NavBar";
import { request } from "@/utils/request";
import { Interface } from "@/utils/constants";
import styles from "./page.module.less";

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const date = new Date(timeStr);
  const diff = Date.now() - date.getTime();
  const m = 60 * 1000, h = 60 * m, d = 24 * h;
  if (diff < m) return "刚刚";
  if (diff < h) return Math.floor(diff / m) + "分钟前";
  if (diff < d) return Math.floor(diff / h) + "小时前";
  if (diff < 7 * d) return Math.floor(diff / d) + "天前";
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
};

export default function MyCommentsPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLogin, setIsLogin] = useState(false);

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
    } catch (e) {
      console.error("加载评论失败", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLogin();
    loadComments(true);
  }, []);

  const goToPostDetail = (postId) => {
    window.location.href = `/commentinfo?id=${postId}`;
  };

  return (
    <Layout>
      <div className={styles.container}>
        <NavBar title="我的评论" showBorder={false} />
        {!isLogin ? (
          <div className={styles.empty}>
            <div>请先登录查看评论</div>
            <div className={styles.loginBtn} onClick={goLogin}>去登录</div>
          </div>
        ) : (
          <div className={styles.scroll}>
            {loading && page === 1 ? (
              <Loading />
            ) : list.length === 0 ? (
              <div className={styles.empty}>暂无评论</div>
            ) : (
              <>
                {list.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className={styles.item} onClick={() => goToPostDetail(item.id)}>
                    {item.title && <div className={styles.postTitle}>{item.title}</div>}
                    {item.content && <div className={styles.postContent}>{item.content}</div>}
                    <div className={styles.commentArea}>
                      <div className={styles.commentLabel}>我的评论</div>
                      <div className={styles.myComment}>{item.comments}</div>
                    </div>
                    <div className={styles.footer}>
                      <div>{formatTime(item.createdAt)}</div>
                      {item.userName ? <div className={styles.author}>回复 @{item.userName}</div> : null}
                    </div>
                  </div>
                ))}

                {loading && page > 1 && (
                  <div className={styles.loadingMore}>加载中...</div>
                )}
                {!hasMore && list.length > 0 && (
                  <div className={styles.noMore}>没有更多了</div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}