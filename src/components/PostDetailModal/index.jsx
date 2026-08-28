'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { SpinLoading } from 'antd-mobile';
import styles from './index.module.less';

const CDN_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community';
const likeIcon = `${CDN_ICON}/like-no-active.png`;
const likeActiveIcon = `${CDN_ICON}/like-active.png`;
const commentIcon = `${CDN_ICON}/comment.png`;
const shareIcon = `${CDN_ICON}/share.png`;
const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';

function formatTime(value) {
  if (!value) return '';
  return String(value);
}

function ListRows({ items, emptyText }) {
  if (!items?.length) {
    return <div className={styles.emptyComments}>{emptyText}</div>;
  }
  return items.map((item) => (
    <div key={item.id} className={styles.commentItem}>
      <img className={styles.commentAvatar} src={item.avatar || '/default-avatar.png'} alt="avatar" />
      <div className={styles.commentBody}>
        <div className={styles.commentMeta}>
          <span className={styles.commentUser}>{item.username || '示例用户'}</span>
          <span className={styles.commentTime}>{formatTime(item.time || '')}</span>
        </div>
        <div className={styles.commentText}>{item.content || ''}</div>
      </div>
    </div>
  ));
}

export default function PostDetailModal({
  open = false,
  onClose,
  post = {},
  comments = [],
  /** 话题详情：相关新闻/帖子（与 comments 分离） */
  newsItems = [],
  variant = 'post', // 'post' | 'topic'
  loading = false,
  onFollow,
  onLike,
  onComment,
  onShare,
  onSubmitComment,
}) {
  const [currentUserAvatar, setCurrentUserAvatar] = useState(DEFAULT_AVATAR);
  const [commentValue, setCommentValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  /** 话题详情内容区：comments | news */
  const [topicTab, setTopicTab] = useState('news');
  const commentListRef = useRef(null);

  const resolvedCurrentUserAvatar = useMemo(() => {
    const avatar = String(currentUserAvatar || '').trim();
    return avatar || DEFAULT_AVATAR;
  }, [currentUserAvatar]);

  useEffect(() => {
    if (!open) {
      setTopicTab('news');
      setCommentValue('');
      return undefined;
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    try {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('token');
      if (!token) {
        setCurrentUserAvatar(DEFAULT_AVATAR);
        return;
      }

      const raw = localStorage.getItem('userInfo');
      if (!raw) {
        setCurrentUserAvatar(DEFAULT_AVATAR);
        return;
      }

      const parsed = JSON.parse(raw);
      const nextAvatar =
        parsed?.avatar ||
        parsed?.photoUrl ||
        parsed?.userInfo?.avatar ||
        parsed?.user?.avatar ||
        DEFAULT_AVATAR;
      setCurrentUserAvatar(nextAvatar);
    } catch (_) {
      setCurrentUserAvatar(DEFAULT_AVATAR);
    }
  }, [open]);

  const handleSubmitComment = async () => {
    const next = String(commentValue || '').trim();
    if (!next || submitting) return;
    const previousValue = commentValue;
    setCommentValue('');
    setSubmitting(true);
    try {
      const result = await onSubmitComment?.(next);
      if (result === false) {
        setCommentValue(previousValue);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const {
    coverImage = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/community/post_detail.png',
    authorName = '墨子交易员',
    authorAvatar = '/default-avatar.png',
    timeText = '1小时前',
    title = '大饼即将上涨请注意，指标已经给出明确信号！',
    description = '从4小时级别来看，MACD底背离结构已经完全形成，同时KDJ也在低位金叉向上发散。',
    tags = ['Bitcoin', '行情分析'],
    likeCount = 356,
    commentCount = 211,
    shareCount = 2,
    isFollowing = false,
    isLiked = false,
  } = post;

  const isTopic = variant === 'topic';
  const newsCount = newsItems?.length || 0;
  // 话题评论数以详情接口 commentCnt（映射为 post.commentCount）为准，不用本地列表长度覆盖
  const displayCommentCount = isTopic
    ? Number(commentCount) || 0
    : comments.length || commentCount || 0;
  const showNewsTab = isTopic && topicTab === 'news';
  const listTitle = showNewsTab
    ? `共 ${newsCount} 条资讯`
    : `共 ${displayCommentCount} 条评论`;

  const handleCommentClick = () => {
    if (isTopic) {
      setTopicTab('comments');
      requestAnimationFrame(() => {
        commentListRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      });
      return;
    }
    onComment?.(post);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.leftPane}>
          <img className={styles.cover} src={coverImage} alt="post cover" />
          {!isTopic && (
            <div className={styles.leftFooter}>
              <div className={styles.authorInfo}>
                <img className={styles.avatar} src={authorAvatar} alt="avatar" />
                <div>
                  <div className={styles.authorName}>{authorName}</div>
                  <div className={styles.authorTime}>{formatTime(timeText)}</div>
                </div>
              </div>
              <button type="button" className={styles.followBtn} onClick={() => onFollow?.(post)}>
                {isFollowing ? '已关注' : '+关注'}
              </button>
            </div>
          )}
        </div>

        <div className={styles.rightPane}>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="close">
            ×
          </button>

          {loading ? (
            <div className={styles.loadingWrap} aria-busy="true" aria-live="polite">
              <SpinLoading color="#00b578" style={{ '--size': '28PX' }} />
              <span className={styles.loadingText}>Loading...</span>
            </div>
          ) : (
            <>
              <div className={styles.postHeader}>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.desc}>{description}</p>
                <div className={styles.tagRow}>
                  {tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {isTopic ? (
                <div className={styles.topicTabs} role="tablist" aria-label="话题内容切换">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={topicTab === 'news'}
                    className={`${styles.topicTab}${topicTab === 'news' ? ` ${styles.topicTabActive}` : ''}`}
                    onClick={() => setTopicTab('news')}
                  >
                    新闻资讯
                    <span className={styles.topicTabCount}>{newsCount}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={topicTab === 'comments'}
                    className={`${styles.topicTab}${topicTab === 'comments' ? ` ${styles.topicTabActive}` : ''}`}
                    onClick={() => setTopicTab('comments')}
                  >
                    评论
                    <span className={styles.topicTabCount}>{displayCommentCount}</span>
                  </button>
                </div>
              ) : null}

              <div className={styles.commentTitle} ref={commentListRef}>
                {listTitle}
              </div>
              <div className={styles.commentList}>
                {showNewsTab ? (
                  <ListRows items={newsItems} emptyText="暂无新闻资讯" />
                ) : (
                  <ListRows items={comments} emptyText="暂无评论" />
                )}
              </div>

              <div className={styles.actionBar}>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${isLiked ? styles.actionBtnActive : ''}`}
                  onClick={() => onLike?.(post)}
                >
                  <img
                    className={`${styles.actionIconImg} ${isLiked ? styles.actionIconActive : ''}`}
                    src={isLiked ? likeActiveIcon : likeIcon}
                    alt="like"
                    onError={(e) => {
                      if (e.currentTarget.src.includes('like-active')) {
                        e.currentTarget.src = likeIcon;
                      }
                    }}
                  />
                  <span>{likeCount}</span>
                </button>
                {!showNewsTab ? (
                  <button type="button" className={styles.actionBtn} onClick={handleCommentClick}>
                    <img className={styles.actionIconImg} src={commentIcon} alt="comment" />
                    <span>{displayCommentCount}</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.shareBtn}`}
                  onClick={() => onShare?.(post)}
                >
                  <img className={styles.actionIconImg} src={shareIcon} alt="share" />
                  <span>{shareCount}</span>
                </button>
              </div>

              {!showNewsTab ? (
                <div className={styles.inputBar}>
                  <img
                    className={styles.inputAvatar}
                    src={resolvedCurrentUserAvatar}
                    alt="current user avatar"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_AVATAR;
                    }}
                  />
                  <div className={styles.inputWrap}>
                    <input
                      className={styles.input}
                      placeholder="说点什么..."
                      value={commentValue}
                      maxLength={1000}
                      onChange={(e) => setCommentValue(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSubmitComment();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={styles.sendBtn}
                      onClick={handleSubmitComment}
                      aria-label="send comment"
                      disabled={submitting || !String(commentValue || '').trim()}
                    >
                      发送
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
