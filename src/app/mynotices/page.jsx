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

export default function MyNoticesPage() {
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

  const markAsRead = async () => {
    try {
      await request({ url: Interface.MARK_NOTICES_READ, method: "POST" });
    } catch {}
  };

  const loadNotices = async (refresh = false) => {
    try {
      if (refresh) {
        setPage(1);
        setLoading(true);
      }
      const currentPage = refresh ? 1 : page;
      const res = await request({
        url: Interface.GET_MY_NOTICES,
        data: { page: currentPage, size: 20 },
      });
      if (res?.data) {
        const newList = res.data;
        setList(refresh ? newList : [...list, ...newList]);
        setHasMore((newList?.length || 0) >= 20);
        setPage(currentPage + 1);
      }
    } catch (e) {
      console.error("加载通知失败", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLogin();
    loadNotices(true);
    markAsRead();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (!hasMore || loading) return;
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
        loadNotices();
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasMore, loading, page, list]);

  const goToPostDetail = (postId) => {
    window.location.href = `/commentinfo?id=${postId}`;
  };

  return (
    <Layout>
      <div className={styles.container}>
        <NavBar title="消息通知" showBorder={false} />
        {!isLogin ? (
          <div className={styles.empty}>
            <div>请先登录查看通知</div>
            <div className={styles.loginBtn} onClick={goLogin}>去登录</div>
          </div>
        ) : (
          <div className={styles.scroll}>
            {loading && page === 1 ? (
              <Loading />
            ) : list.length === 0 ? (
              <div className={styles.empty}>暂无消息通知</div>
            ) : (
              <>
                {list.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className={styles.item} onClick={() => goToPostDetail(item.id)}>
                    <div className={styles.userInfo}>
                      <img className={styles.avatar} src={item.avatar || 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png'} alt="avatar" />
                      <div className={styles.userDetail}>
                        <div className={styles.usernameRow}>
                          <div className={styles.username}>{item.userName || '匿名用户'}</div>
                          <div className={styles.actionText}>评论了你</div>
                        </div>
                        <div className={styles.noticeTime}>{formatTime(item.createdAt)}</div>
                      </div>
                    </div>

                    <div className={styles.commentSnap}>
                      <div className={styles.commentText}>{item.comments}</div>
                    </div>

                    <div className={styles.postInfo}>
                      {item.title && <div className={styles.postTitle}>{item.title}</div>}
                      {item.content && <div className={styles.postContent}>{item.content}</div>}
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