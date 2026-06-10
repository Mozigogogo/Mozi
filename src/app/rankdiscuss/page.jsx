"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useSearchParams } from "next/navigation";
import { safeBack } from "@/utils/navigation";
import styles from "./page.module.less";

export default function RankDiscussPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const rankName = searchParams?.get("name") || t("home.rank.surge");

  const [content, setContent] = useState("");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateIsDesktop = () => setIsDesktop(mediaQuery.matches);
    updateIsDesktop();
    mediaQuery.addEventListener("change", updateIsDesktop);
    return () => mediaQuery.removeEventListener("change", updateIsDesktop);
  }, []);

  const onBack = () => {
    if (isDesktop) {
      router.push("/find?tab=rank");
      return;
    }
    safeBack(router, { fallback: "/" });
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setLoading(true);
    try {
      const newComment = {
        id: Date.now(),
        content: content.trim(),
        author: "我",
        time: new Date().toLocaleString(),
      };
      setComments([newComment, ...comments]);
      setContent("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pageContent = (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={onBack}
          aria-label={t("common.back", { defaultValue: "返回" })}
        >
          <svg className={styles.backIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
          </svg>
        </button>
        <div className={styles.title}>{t("rankDiscuss.title", { rankName })}</div>
        <div className={styles.placeholder} />
      </div>

      <div className={styles.commentList}>
        {comments.length === 0 ? (
          <div className={styles.empty}>{t("rankDiscuss.noComments")}</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className={styles.commentItem}>
              <div className={styles.commentHeader}>
                <span className={styles.author}>{comment.author}</span>
                <span className={styles.time}>{comment.time}</span>
              </div>
              <div className={styles.commentContent}>{comment.content}</div>
            </div>
          ))
        )}
      </div>

      <div className={styles.inputArea}>
        <input
          type="text"
          className={styles.textarea}
          placeholder={t("rankDiscuss.placeholder", { rankName })}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={loading || !content.trim()}
        >
          {loading ? "..." : t("rankDiscuss.submit")}
        </button>
      </div>
    </div>
  );

  if (isDesktop) {
    return <div className={styles.pcContentArea}>{pageContent}</div>;
  }

  return pageContent;
}
