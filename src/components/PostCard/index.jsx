'use client';

import { Dropdown } from 'antd';
import { EllipsisOutlined, WarningOutlined, DeleteOutlined } from '@ant-design/icons';
import { Toast } from 'antd-mobile';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { removePost } from '@/api/community';
import { confirm } from '@/components/Modal/confirm';
import styles from './index.module.less';

const CDN_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community';
const likeIcon = `${CDN_ICON}/like-no-active.png`;
const likeActiveIcon = `${CDN_ICON}/like-active.png`;
const commentIcon = `${CDN_ICON}/comment.png`;
const shareIcon = `${CDN_ICON}/share.png`;

/**
 * 普通帖子卡片组件
 * @param {Object} post - 帖子数据
 * @param {Function} onPostClick - 点击帖子回调
 * @param {Function} onUserClick - 点击用户回调
 * @param {Function} onLikeClick - 点击点赞回调
 * @param {Function} onShareClick - 点击分享回调
 * @param {Function} onTagClick - 点击标签回调
 * @param {Function} onTopicClick - 点击话题回调
 * @param {boolean} isLiked - 是否已点赞
 * @param {Function} formatTimeAgo - 时间格式化函数
 * @param {boolean} isPC - 是否为PC端
 * @param {boolean} enableReportMenu - 是否显示右上角举报菜单（移动端默认false）
 */
export default function PostCard({
  post,
  onPostClick,
  onUserClick,
  onLikeClick,
  onShareClick,
  onTagClick,
  onTopicClick,
  isLiked = false,
  formatTimeAgo,
  isPC = false,
  showFooterDivider = true,
  enableReportMenu = false,
  onDeletePost,
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const normalizeId = (value) => String(value ?? '').trim();
  const localStorageUserId = (() => {
    if (typeof window === 'undefined') return '';
    const directUserId = localStorage.getItem('userId');
    if (directUserId) return normalizeId(directUserId);
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      return normalizeId(
        userInfo?.userId ||
          userInfo?.id ||
          userInfo?.userInfo?.userId ||
          userInfo?.userInfo?.id ||
          userInfo?.data?.userId ||
          userInfo?.data?.id
      );
    } catch (error) {
      return '';
    }
  })();
  const postOwnerId = normalizeId(post?.userId || post?.authorId || post?.user?.id || post?.user?.userId);
  const isPostOwner = !!localStorageUserId && !!postOwnerId && localStorageUserId === postOwnerId;

  const handleReportNavigate = () => {
    const postId = String(post?.id ?? '').trim();
    const authorId = String(post?.userId ?? '').trim();
    const params = new URLSearchParams();
    if (postId) params.set('postId', postId);
    if (authorId) params.set('authorId', authorId);
    const query = params.toString();
    router.push(query ? `/report/comment?${query}` : '/report/comment');
  };

  const handleDeletePost = async () => {
    const postId = String(post?.id ?? '').trim();
    if (!postId) {
      Toast.show({ content: t('community.messages.invalidPostId'), position: 'bottom' });
      return;
    }
    const confirmed = await confirm({
      content: t('common.confirmDelete'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
    });
    if (!confirmed) return;

    try {
      Toast.show({
        icon: 'loading',
        content: t('common.deleting'),
        duration: 0,
        position: 'center',
      });
      const response = await removePost(postId);
      Toast.clear();
      if (response?.code === 0) {
        Toast.show({ content: t('common.deleteSuccess'), position: 'bottom' });
        if (onDeletePost) {
          await Promise.resolve(onDeletePost(post.id));
        }
        return;
      }
      Toast.show({ content: response?.errorMsg || t('common.deleteFailed'), position: 'bottom' });
    } catch (error) {
      Toast.clear();
      Toast.show({ content: error?.errorMsg || error?.message || t('common.deleteFailed'), position: 'bottom' });
    }
  };

  const menuItems = isPostOwner
    ? [
      {
        key: 'delete',
        label: (
          <span className={styles.deleteMenuItem}>
            <DeleteOutlined />
            <span>{t('common.delete')}</span>
          </span>
        ),
      },
    ]
    : [
      {
        key: 'report',
        label: (
          <span className={styles.reportMenuItem}>
            <WarningOutlined />
            <span>{t('community.reportContent')}</span>
          </span>
        ),
      },
    ];

  return (
    <div 
      className={`${styles.postItem} ${isPC ? styles.pcPostItem : ''}`} 
      onClick={() => onPostClick?.(post.id)}
    >
      <div className={styles.postWatermark} aria-hidden="true" />
      
      <div className={styles.postHeader}>
        <div 
          className={styles.userInfo} 
          onClick={(e) => { 
            e.stopPropagation(); 
            onUserClick?.(post.userId); 
          }}
        >
          <img 
            src={post.avatar || '/default-avatar.png'} 
            alt="avatar" 
            className={styles.avatar} 
          />
          <div className={styles.userMeta}>
            <div className={styles.userRow}>
              <span className={styles.username}>{post.username}</span>
              <span className={styles.badgeLabel}>
                {post.categoryLabel || post.category || post.type || '资讯'}
              </span>
            </div>
            <span className={styles.postTime}>
              {formatTimeAgo ? formatTimeAgo(post.createTime || post.updatedAt) : post.createTime}
            </span>
          </div>
        </div>

        {(isPC || enableReportMenu) && (
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: menuItems,
              onClick: (info) => {
                info?.domEvent?.stopPropagation?.();
                if (info?.key === 'report') {
                  handleReportNavigate();
                }
                if (info?.key === 'delete') {
                  handleDeletePost();
                }
              },
            }}
            overlayClassName={styles.postMoreDropdown}
          >
            <button
              type="button"
              className={styles.moreButton}
              aria-label="more actions"
              onClick={(e) => e.stopPropagation()}
            >
              <EllipsisOutlined />
            </button>
          </Dropdown>
        )}
      </div>
      
      <div className={styles.postContent}>
        <h3 className={styles.postTitle}>{post.title}</h3>
        <p className={styles.postText}>{post.content}</p>
        {post.images && post.images.length > 0 && (
          <div className={styles.postImages}>
            {post.images.map((image, index) => (
              <img key={index} src={image} alt="post" className={styles.postImage} />
            ))}
          </div>
        )}
      </div>
      
      {(post.tags?.length > 0 || post.topics?.length > 0) && (
        <div className={styles.tagsTopicsContainer}>
          {post.tags?.map(tag => (
            <span 
              key={`tag-${tag.id}`} 
              className={styles.coinTag}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(tag.name);
              }}
            >
              ${tag.name}$
            </span>
          ))}
          
          {post.topics?.map(topic => (
            <span 
              key={`topic-${topic.id}`} 
              className={styles.topicTag}
              onClick={(e) => {
                e.stopPropagation();
                onTopicClick?.(topic.id, topic.name);
              }}
            >
              #{topic.name}
            </span>
          ))}
        </div>
      )}
      
      <div className={`${styles.postFooter} ${showFooterDivider ? '' : styles.postFooterNoDivider}`}>
        <div 
          className={styles.postAction} 
          onClick={(e) => {
            e.stopPropagation();
            onShareClick?.(post);
          }}
        >
          <img className={styles.actionIconImg} src={shareIcon} alt="share" />
        </div>
        <div className={styles.postAction}>
          <img className={styles.actionIconImg} src={commentIcon} alt="comment" />
          <span>{post.commentCount || 0}</span>
        </div>
        <div 
          className={styles.postAction} 
          onClick={(e) => { 
            e.stopPropagation(); 
            onLikeClick?.(post.id); 
          }}
        >
          <img
            className={styles.actionIconImg}
            src={isLiked ? likeActiveIcon : likeIcon}
            alt="like"
          />
          <span>{post.likeCount || 0}</span>
        </div>
      </div>
    </div>
  );
}
