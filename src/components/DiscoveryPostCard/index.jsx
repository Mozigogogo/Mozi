'use client';

import { Dropdown } from 'antd';
import { EllipsisOutlined, WarningOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

const CDN_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community';
const findBestCoinIcon = `${CDN_ICON}/find-best-coin.png`;
const integralIcon = `${CDN_ICON}/integral.png`;
const plateIcon = `${CDN_ICON}/plate.png`;
const reasonIcon = `${CDN_ICON}/reason.png`;
const messagesLikeActiveIcon = `${CDN_ICON}/messages-like-active.png`;
const messagesLikeNoActivedIcon = `${CDN_ICON}/messages-like-no-actived.png`;
const messagesShareIcon = `${CDN_ICON}/messages-share.png`;
const messagesCommentIcon = `${CDN_ICON}/messages-comment.png`;

/**
 * 发现好币帖子卡片组件
 * @param {Object} post - 帖子数据
 * @param {Function} onPostClick - 点击帖子回调
 * @param {Function} onUserClick - 点击用户回调
 * @param {Function} onLikeClick - 点击点赞回调
 * @param {Function} onDislikeClick - 点击点踩回调
 * @param {Function} onShareClick - 点击分享回调
 * @param {boolean} isLiked - 是否已点赞
 * @param {boolean} isDisliked - 是否已点踩
 * @param {Function} formatTimeAgo - 时间格式化函数
 * @param {boolean} isPC - 是否为PC端，默认false
 */
export default function DiscoveryPostCard({
  post,
  onPostClick,
  onUserClick,
  onLikeClick,
  onDislikeClick,
  onShareClick,
  isLiked = false,
  isDisliked = false,
  formatTimeAgo,
  isPC = false,
  showDislike = true,
  contentTemplate = 'coinInfo',
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const menuItems = [
    {
      key: 'report',
      label: (
        <span className={styles.reportMenuItem}>
          <WarningOutlined />
          <span>举报内容</span>
        </span>
      ),
    },
  ];

  const handleReportNavigate = () => {
    const postId = String(post?.id ?? '').trim();
    const authorId = String(post?.userId ?? '').trim();
    const params = new URLSearchParams();
    if (postId) params.set('postId', postId);
    if (authorId) params.set('authorId', authorId);
    const query = params.toString();
    router.push(query ? `/report/comment?${query}` : '/report/comment');
  };

  return (
    <div 
      className={`${styles.discoveryCard} ${isPC ? styles.pcCard : styles.mobileCard} ${contentTemplate === 'titleDesc' ? styles.qaCardTemplate : ''}`} 
      onClick={() => onPostClick?.(post.id)}
    >
      {/* 右上角装饰图标 */}
      <img src={findBestCoinIcon} className={styles.findBestCoinBg} alt="" />
      
      {/* 用户信息 */}
      <div className={styles.discoveryHeader}>
        <div className={styles.discoveryUserInfo}>
          <img 
            src={post.avatar || '/default-avatar.png'} 
            alt="avatar" 
            className={styles.discoveryAvatar}
            onClick={(e) => {
              e.stopPropagation();
              onUserClick?.(post.userId);
            }}
          />
          <div className={styles.discoveryUserContent}>
            <span className={styles.discoveryNickname}>{post.username}</span>
            <span className={styles.discoveryTime}>
              {formatTimeAgo ? formatTimeAgo(post.createTime || post.updatedAt) : post.createTime}
            </span>
          </div>
        </div>

        {isPC ? (
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
        ) : null}
      </div>

      {/* 内容区域：发现好币=币种信息，不懂就问=标题+描述 */}
      {contentTemplate === 'titleDesc' ? (
        <div className={styles.qaContentSection}>
          <div className={styles.qaTitle}>{post.title || '暂无标题'}</div>
          <div className={styles.qaDesc}>{post.content || '暂无内容'}</div>
        </div>
      ) : (
        <div className={styles.coinInfoSection}>
          <div className={styles.coinInfoRow}>
            <img className={styles.coinInfoIconImg} src={integralIcon} alt="" />
            <span className={styles.coinInfoLabel}>{t('community.coinInfo.coinName')}</span>
            <span className={styles.coinInfoValue}>
              {post.tags && post.tags.length > 0 ? post.tags[0].name : 'N/A'}
            </span>
          </div>
          
          <div className={styles.coinInfoRow}>
            <img className={styles.coinInfoIconImg} src={plateIcon} alt="" />
            <span className={styles.coinInfoLabel}>{t('community.coinInfo.sector')}</span>
            <span className={styles.coinInfoValue}>{post.sector || 'DeFi'}</span>
          </div>
          
          <div className={styles.coinInfoRow}>
            <img className={styles.coinInfoIconImg} src={reasonIcon} alt="" />
            <span className={styles.coinInfoLabel}>{t('post.recommendReason')}：</span>
            <span className={styles.coinInfoValue}>{post.content || ''}</span>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className={styles.discoveryActionButtons}>
        <button 
          className={`${styles.discoveryActionBtn} ${styles.likeBtn} ${isLiked ? styles.liked : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onLikeClick?.(post.id);
          }}
        >
          <img
            className={`${styles.discoveryActionIcon} ${isPC ? styles.pcIcon : ''}`}
            src={isLiked ? messagesLikeActiveIcon : messagesLikeNoActivedIcon}
            alt="like"
          />
          <span className={styles.actionCount}>{post.likeCount || 0}</span>
        </button>

        {showDislike ? (
          <button
            className={`${styles.discoveryActionBtn} ${styles.dislikeBtn} ${isDisliked ? styles.disliked : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onDislikeClick?.(post.id);
            }}
          >
            <img
              className={`${styles.discoveryActionIcon} ${styles.dislikeIcon} ${isPC ? styles.pcIcon : ''}`}
              src={isDisliked ? messagesLikeActiveIcon : messagesLikeNoActivedIcon}
              alt="dislike"
            />
            <span className={styles.actionCount}>{post.dislikeCount || 0}</span>
          </button>
        ) : null}
        
        <button 
          className={`${styles.discoveryActionBtn} ${styles.shareBtn}`}
          onClick={(e) => {
            e.stopPropagation();
            onShareClick?.(post);
          }}
        >
          <img className={`${styles.discoveryActionIcon} ${isPC ? styles.pcIcon : ''}`} src={messagesShareIcon} alt="share" />
        </button>
        
        <button className={`${styles.discoveryActionBtn} ${styles.commentBtn}`}>
          <img className={`${styles.discoveryActionIcon} ${isPC ? styles.pcIcon : ''}`} src={messagesCommentIcon} alt="comment" />
          <span className={styles.actionCount}>{post.commentCount || 0}</span>
        </button>
      </div>
    </div>
  );
}
