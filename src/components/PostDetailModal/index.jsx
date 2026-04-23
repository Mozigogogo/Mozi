'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './index.module.less';

const CDN_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community';
const likeIcon = `${CDN_ICON}/like-no-active.png`;
const commentIcon = `${CDN_ICON}/comment.png`;
const shareIcon = `${CDN_ICON}/share.png`;
const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';

function formatTime(value) {
  if (!value) return '';
  return String(value);
}

export default function PostDetailModal({
  open = false,
  onClose,
  post = {},
  comments = [],
  onFollow,
  onLike,
  onComment,
  onShare,
  onSubmitComment,
}) {
  const [currentUserAvatar, setCurrentUserAvatar] = useState(DEFAULT_AVATAR);
  const [commentValue, setCommentValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resolvedCurrentUserAvatar = useMemo(() => {
    const avatar = String(currentUserAvatar || '').trim();
    return avatar || DEFAULT_AVATAR;
  }, [currentUserAvatar]);

  useEffect(() => {
    if (!open) return undefined;
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
    coverImage = '/images/community/post_detail.png',
    authorName = '墨子交易员',
    authorAvatar = '/default-avatar.png',
    timeText = '1小时前',
    title = '大饼即将上涨请注意，指标已经给出明确信号！',
    description = '从4小时级别来看，MACD底背离结构已经完全形成，同时KDJ也在低位金叉向上发散。',
    tags = ['Bitcoin', '行情分析'],
    likeCount = 356,
    commentCount = 211,
    shareCount = 2,
  } = post;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.leftPane}>
          <img className={styles.cover} src={coverImage} alt="post cover" />
          <div className={styles.leftFooter}>
            <div className={styles.authorInfo}>
              <img className={styles.avatar} src={authorAvatar} alt="avatar" />
              <div>
                <div className={styles.authorName}>{authorName}</div>
                <div className={styles.authorTime}>{formatTime(timeText)}</div>
              </div>
            </div>
            <button type="button" className={styles.followBtn} onClick={() => onFollow?.(post)}>
              +关注
            </button>
          </div>
        </div>

        <div className={styles.rightPane}>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="close">
            ×
          </button>

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

          <div className={styles.commentTitle}>共 {comments.length || commentCount} 条评论</div>
          <div className={styles.commentList}>
            {comments.map((item) => (
              <div key={item.id} className={styles.commentItem}>
                <img className={styles.commentAvatar} src={item.avatar || '/default-avatar.png'} alt="avatar" />
                <div className={styles.commentBody}>
                  <div className={styles.commentMeta}>
                    <span className={styles.commentUser}>{item.username || '示例用户'}</span>
                    <span className={styles.commentTime}>{formatTime(item.time || '45分钟前')}</span>
                  </div>
                  <div className={styles.commentText}>{item.content || ''}</div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.actionBar}>
            <button type="button" className={styles.actionBtn} onClick={() => onLike?.(post)}>
              <img className={styles.actionIconImg} src={likeIcon} alt="like" />
              <span>{likeCount}</span>
            </button>
            <button type="button" className={styles.actionBtn} onClick={() => onComment?.(post)}>
              <img className={styles.actionIconImg} src={commentIcon} alt="comment" />
              <span>{commentCount}</span>
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.shareBtn}`}
              onClick={() => onShare?.(post)}
            >
              <img className={styles.actionIconImg} src={shareIcon} alt="share" />
              <span>{shareCount}</span>
            </button>
          </div>

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
        </div>
      </div>
    </div>
  );
}
