"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.less";

export default function RankDiscussPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  
  // 从 URL 获取榜单类型和名称
  const rankType = searchParams?.get('type') || 'surge';
  const rankName = searchParams?.get('name') || t('home.rank.surge');
  
  const [content, setContent] = useState('');
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  const onBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/find?tab=rank');
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    setLoading(true);
    try {
      // TODO: 调用发布评论 API
      // await request({ url: Interface.POST_COMMENT, data: { rankType, content } });
      
      // 模拟添加评论
      const newComment = {
        id: Date.now(),
        content: content.trim(),
        author: '我',
        time: new Date().toLocaleString(),
      };
      setComments([newComment, ...comments]);
      setContent('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* 头部 */}
      <div className={styles.header}>
        <div className={styles.backBtn} onClick={onBack}>
          <svg className={styles.backIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/>
          </svg>
        </div>
        <div className={styles.title}>{t('rankDiscuss.title', { rankName })}</div>
        <div className={styles.placeholder} />
      </div>

      {/* 评论列表 */}
      <div className={styles.commentList}>
        {comments.length === 0 ? (
          <div className={styles.empty}>{t('rankDiscuss.noComments')}</div>
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

      {/* 输入框 */}
      <div className={styles.inputArea}>
        <input
          type="text"
          className={styles.textarea}
          placeholder={t('rankDiscuss.placeholder', { rankName })}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button 
          className={styles.submitBtn} 
          onClick={handleSubmit}
          disabled={loading || !content.trim()}
        >
          {loading ? '...' : t('rankDiscuss.submit')}
        </button>
      </div>
    </div>
  );
}
