'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Input, Dialog, Toast, Divider } from 'antd-mobile';
import { MoreOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import NavBar from '@/components/NavBar';
import Layout from '@/components/Layout';
import { Loading } from '@/components/Loading';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import styles from './page.module.less';

// 图标资源
const CDN_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community';
const likeActiveIcon = `${CDN_ICON}/like-active.png`;
const likeNoActiveIcon = `${CDN_ICON}/like-no-active.png`;
const shareIcon = `${CDN_ICON}/share.png`;
const editIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/edit.png';

export default function CommentInfo() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const commentId = searchParams.get('id');
  
  const [detail, setDetail] = useState({
    id: null,
    userId: '',
    title: '',
    content: '',
    category: '',
    createdAt: '',
    updatedAt: '',
    topics: [],
    tags: [],
    likeCnt: 0,
    commentCnt: 0,
    avatar: '',
    nickName: '',
    commentIds: [],
    isLikedByCurrentUser: false,
    voteInfo: null,
  });

  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [commentContent, setCommentContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [likedPosts, setLikedPosts] = useState({});
  const [likedComments, setLikedComments] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  // 获取当前用户信息
  const getCurrentUser = async () => {
    try {
      // 从localStorage中获取用户信息
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        setCurrentUser(JSON.parse(userInfo));
      }
    } catch (error) {
      console.log('获取用户信息失败:', error);
    }
  };

  // 初始化点赞状态
  const initLikeStatus = async (postId) => {
    try {
      // 这里可以调用接口获取用户对该帖子和评论的点赞状态
      // 由于没有提供获取点赞状态的接口，这里模拟一个空的初始状态
      setLikedPosts({});
      setLikedComments({});
    } catch (error) {
      console.error('初始化点赞状态失败:', error);
    }
  };

  // 加载帖子详情数据
  const loadCommentData = async (id) => {
    try {
      const response = await request({
        url: Interface.POST_DETAIL_API.replace('{id}', id)
      });
      
      if (response?.data) {
        console.log('获取帖子详情成功:', response.data);
        setDetail(response.data);
      }
    } catch (error) {
      console.error('获取帖子详情失败:', error);
      Toast.show({
        content: '获取数据失败',
        icon: 'fail',
      });
    }
  };

  // 加载评论列表
  const loadComments = async (isInitialLoad = true) => {
    if (allLoaded) return;
    
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const response = await request({
        url: Interface.COMMENTS_API.replace('{postId}', commentId),
        data: {
          page,
          size
        }
      });
      if (response?.data) {
        const { data, totalPages: total, page: currentPage } = response.data;
        setList(prevList => currentPage === 1 ? data : [...prevList, ...data]);
        setTotalPages(total);
        setPage(currentPage + 1);
        setAllLoaded(currentPage >= total);
      }
    } catch (error) {
      console.error('获取评论列表失败:', error);
      Toast.show({
        content: t('comment.messages.fetchFailed'),
        icon: 'fail',
      });
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  // 处理帖子点赞/取消点赞
  const handlePostLike = async () => {
    try {
      const isLiked = likedPosts[detail.id];
      const response = await request({
        url: isLiked ? Interface.POSTS_UNLIKE + '/' + detail.id : Interface.POSTS_LIKE + '/' + detail.id,
        method: 'get'
      });

      if (response?.code === 0) {
        // 更新点赞状态
        setLikedPosts(prev => ({
          ...prev,
          [detail.id]: !isLiked
        }));
        
        // 更新点赞数
        setDetail(prev => ({
          ...prev,
          likeCnt: isLiked ? prev.likeCnt - 1 : prev.likeCnt + 1
        }));

        // 点赞成功后，调用每日点赞任务完成接口
        if (!isLiked) {
          try {
            await request({
              url: Interface.TASK_COMPLETE,
              method: 'POST',
              data: { taskCode: 'DAILY_LIKE' }
            });
            console.log('🔍 [DEBUG] 每日点赞任务上报成功');
          } catch (taskError) {
            console.error('每日点赞任务上报失败:', taskError);
          }
        }
      }
    } catch (error) {
      console.error('点赞操作失败:', error);
      Toast.show({
        content: '操作失败',
        icon: 'fail',
      });
    }
  };

  // 处理分享到Telegram
  const handleShare = (e) => {
    if (e) e.stopPropagation();
    const shareUrl = `${window.location.origin}/commentinfo?id=${detail.id}`;
    const shareText = detail.title || '来自 Mozi 社区的帖子';
    
    // 检查是否在Telegram环境中
    const isTelegram = localStorage.getItem('appChannel') === 'tg';
    
    if (isTelegram && window.Telegram?.WebApp) {
      // 使用Telegram Web App API分享
      try {
        window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`);
      } catch (error) {
        console.error('Telegram分享失败:', error);
        // 降级到Telegram分享链接
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
      }
    } else {
      // 非Telegram环境，使用Telegram分享链接
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  // 处理评论点赞/取消点赞
  const handleCommentLike = async (commentId) => {
    try {
      const isLiked = likedComments[commentId];
      const response = await request({
        url: isLiked 
          ? Interface.COMMENTS_UNLIKE.replace('{id}', commentId) 
          : Interface.COMMENTS_LIKE.replace('{id}', commentId),
        method: 'get'
      });

      if (response?.code === 0) {
        // 更新点赞状态
        setLikedComments(prev => ({
          ...prev,
          [commentId]: !isLiked
        }));

        // 点赞成功后，调用每日点赞任务完成接口
        if (!isLiked) {
          try {
            await request({
              url: Interface.TASK_COMPLETE,
              method: 'POST',
              data: { taskCode: 'DAILY_LIKE' }
            });
            console.log('🔍 [DEBUG] 评论点赞任务上报成功');
          } catch (taskError) {
            console.error('评论点赞任务上报失败:', taskError);
          }
        }
        
        // 更新评论列表中的点赞数
        setList(prevList => prevList.map(item => {
          if (item.id === commentId) {
            return {
              ...item,
              likeCount: isLiked ? item.likeCount - 1 : item.likeCount + 1
            };
          }
          // 检查回复列表
          if (item.replies && item.replies.length > 0) {
            const updatedReplies = item.replies.map(reply => {
              if (reply.commentId === commentId) {
                return {
                  ...reply,
                  likeCount: isLiked ? reply.likeCount - 1 : reply.likeCount + 1
                };
              }
              return reply;
            });
            return {
              ...item,
              replies: updatedReplies
            };
          }
          return item;
        }));
      }
    } catch (error) {
      console.error('评论点赞操作失败:', error);
      Toast.show({
        content: t('comment.messages.operationFailed'),
        icon: 'fail',
      });
    }
  };

  // 处理删除评论
  const handleDeleteComment = async (commentId) => {
    try {
      Dialog.confirm({
        content: t('comment.messages.confirmDelete'),
        onConfirm: async () => {
          Toast.show({
            icon: 'loading',
            content: '删除中...',
            duration: 0,
          });
          
          const response = await request({
            url: Interface.COMMENTS_DELETE.replace('{id}', commentId)
          });
          
          Toast.clear();
          
          if (response?.data) {
            Toast.show({
              icon: 'success',
              content: '删除成功',
            });
            
            // 从列表中移除已删除的评论
            setList(prevList => prevList.filter(item => item.id !== commentId));
          }
        },
      });
    } catch (error) {
      console.error('删除评论失败:', error);
      Toast.show({
        content: t('comment.messages.deleteFailed'),
        icon: 'fail',
      });
    }
  };

  // 处理删除帖子
  const handleDeletePost = async (e, postId) => {
    if (e) e.stopPropagation();
    
    Dialog.confirm({
      content: '确定要删除这条帖子吗？',
      onConfirm: async () => {
        try {
          Toast.show({
            icon: 'loading',
            content: '删除中...',
            duration: 0,
          });
          
          const response = await request({
            url: `${Interface.POSTS_DELETE}/${postId}`,
            method: 'get'
          });
          
          Toast.clear();
          
          if (response?.code === 0) {
            Toast.show({
              icon: 'success',
              content: '删除成功',
            });
            
            // 删除成功后返回上一页
            window.history.back();
          } else {
            Toast.show({
              icon: 'fail',
              content: t('comment.messages.deleteFailed'),
            });
          }
        } catch (error) {
          console.error('删除帖子失败:', error);
          Toast.show({
            icon: 'fail',
            content: '删除失败',
          });
        }
      },
    });
  };

  // 处理更新帖子
  const handleUpdatePost = (e, post) => {
    if (e) e.stopPropagation();
    
    // 跳转到发帖页面，并传递帖子信息
    window.location.href = `/post?id=${post.id}&title=${encodeURIComponent(post.title)}&content=${encodeURIComponent(post.content)}&isUpdate=true`;
  };

  // 设置回复对象
  const handleReply = (comment, user) => {
    setReplyTo({
      commentId: comment.id,
      userId: user.userId || user.id,
      nickname: user.nickname
    });
    // 聚焦到输入框
    document.querySelector(`.${styles.commentInput}`).focus();
  };

  // 取消回复
  const cancelReply = () => {
    setReplyTo(null);
  };

  // 提交评论或回复
  const handleSubmitComment = async () => {
    if (!commentContent.trim()) {
      Toast.show({
        content: t('comment.messages.inputRequired'),
        icon: 'fail',
      });
      return;
    }

    setSubmitting(true);
    Toast.show({
      icon: 'loading',
      content: '提交中...',
      duration: 0,
    });
    
    try {
      let response;
      
      if (replyTo) {
        // 提交回复
        response = await request({
          url: Interface.COMMENTS_REPLIES,
          method: 'POST',
          data: {
            commentId: replyTo.commentId,
            replyToUserId: replyTo.userId,
            content: commentContent.trim()
          }
        });
      } else {
        // 提交评论
        response = await request({
          url: Interface.COMMENTS_NEW,
          method: 'POST',
          data: {
            postId: commentId,
            content: commentContent.trim()
          }
        });
      }

      Toast.clear();

      if (response?.data) {
        Toast.show({
          icon: 'success',
          content: replyTo ? t('comment.messages.replySuccess') : t('comment.messages.commentSuccess'),
        });

        // 回复/评论成功后，调用回复任务完成接口
        try {
          await request({
            url: Interface.TASK_COMPLETE,
            method: 'POST',
            data: { taskCode: 'REPLY' }
          });
          console.log('🔍 [DEBUG] 回复任务上报成功');
        } catch (taskError) {
          console.error('回复任务上报失败:', taskError);
        }

        // 清空评论内容和回复对象
        setCommentContent('');
        setReplyTo(null);
        // 重置页码为1并重新加载评论列表
        setPage(1);
        setAllLoaded(false);
        // 手动请求第一页数据
        request({
          url: Interface.COMMENTS_API.replace('{postId}', commentId),
          data: {
            page: 1,
            size
          }
        }).then(response => {
          if (response?.data) {
            const { data, totalPages: total } = response.data;
            setList(data);
            setTotalPages(total);
            setPage(2); // 设置为第2页，因为第1页已加载
            setAllLoaded(1 >= total);
          }
        }).catch(error => {
          console.error('刷新评论列表失败:', error);
        });
      }
    } catch (error) {
      console.error(replyTo ? '回复失败:' : '提交评论失败:', error);
      Toast.show({
        icon: 'fail',
        content: replyTo ? t('comment.messages.replyFailed') : t('comment.messages.commentFailed'),
      });
    } finally {
      setSubmitting(false);
      Toast.clear();
    }
  };

  // 处理操作菜单选择
  const handleActionClick = (type) => {
    if (!selectedPost) return;
    
    if (type === 'edit') {
      handleUpdatePost(null, selectedPost);
    } else if (type === 'delete') {
      // 判断是否为评论（有user属性）或帖子
      if (selectedPost.user) {
        handleDeleteComment(selectedPost.id);
      } else {
        handleDeletePost(null, selectedPost.id);
      }
    }
    setShowActionSheet(false);
  };

  // 处理投票提交
  const handleVoteSubmit = async (optionId) => {
    if (!currentUser) {
      Toast.show({
        content: '请先登录',
        icon: 'fail',
      });
      return;
    }
    
    try {
      Toast.show({
        icon: 'loading',
        content: '提交投票中...',
        duration: 0,
      });
      
      const response = await request({
        url: Interface.CREATE_VOTE.replace('create', 'submit'),
        method: 'POST',
        data: { optionId }
      });
      
      Toast.clear();
      
      if (response?.code === 0) {
        Toast.show({
          icon: 'success',
          content: '投票成功',
        });
        
        // 重新加载帖子详情，获取最新的投票结果
        loadCommentData(commentId);
      } else {
        Toast.show({
          icon: 'fail',
          content: response?.errorMsg || '投票失败',
        });
      }
    } catch (error) {
      console.error('投票失败:', error);
      Toast.clear();
      Toast.show({
        icon: 'fail',
        content: '投票失败',
      });
    }
  };

  // 加载更多评论
  const loadMoreComments = () => {
    if (!allLoaded && !loading && !loadingMore) {
      loadComments(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    if (commentId) {
      loadCommentData(commentId);
      getCurrentUser();
      initLikeStatus(commentId);
      loadComments(true);
    }
  }, [commentId]);

  // 监听滚动加载更多
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
        loadMoreComments();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [allLoaded, loading, loadingMore]);

  // 点击页面其他地方取消回复
  const handlePageClick = (e) => {
    // 如果点击的不是输入框和提交按钮，则取消回复
    if (replyTo && 
        !e.target.closest(`.${styles.commentInputContainer}`) &&
        !e.target.closest(`.${styles.commentContent}`)) {
      setReplyTo(null);
    }
  };

  return (
    <Layout>
      <NavBar title={t('comment.title')} showBack={true} backgroundColor="#EEF0F3" showBorder={false} />
      <div className={styles.commentDetail} onClick={handlePageClick}>
        {/* 操作菜单 */}
        {showActionSheet && (
          <div className={styles.actionSheetMask} onClick={() => setShowActionSheet(false)}>
            <div className={styles.actionSheet} onClick={(e) => e.stopPropagation()}>
              <div className={styles.actionSheetTitle}>请选择操作</div>
              {!selectedPost?.user && (
                <div className={styles.actionSheetItem} onClick={() => handleActionClick('edit')}>
                  编辑
                </div>
              )}
              <div className={styles.actionSheetItem} onClick={() => handleActionClick('delete')}>
                删除
              </div>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className={styles.loadingContainer}>
            <Loading />
          </div>
        ) : (
          <>
            {/* 一级评论 */}
            <div className={styles.firstComment}>
              <div className={styles.header}>
                <img className={styles.avatar} src={detail.avatar || 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'} alt="avatar" />
                <span className={styles.nickname}>{detail.nickName || '匿名用户'}</span>
                <span className={styles.category}>{detail.category || '普通'}</span>
                {currentUser && currentUser.userId === detail.userId && (
                  <div className={styles.editActions}>
                    <div onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPost(detail);
                      setShowActionSheet(true);
                    }}>
                      <MoreOutline fontSize={24} />
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.postInfo}>
                <div className={styles.title}>{detail.title}</div>
                <div className={styles.content}>{detail.content}</div>
                
                {/* 投票区域 */}
                {detail.voteInfo && detail.voteInfo?.options && (
                  <div className={styles.voteContainer}>
                    <div className={styles.voteTitle}>{detail.voteInfo.voteTitle}</div>
                    <div className={styles.voteOptions}>
                      {detail.voteInfo?.options.length > 0 && detail.voteInfo?.options.map(option => (
                        <div 
                          key={option.id} 
                          className={styles.voteOption}
                          onClick={() => handleVoteSubmit(option.id)}
                        >
                          <div className={styles.optionText}>{option.optionText}</div>
                          <div className={styles.voteProgress}>
                            <div 
                              className={styles.progressBar} 
                              style={{ width: `${option.percentage}%` }}
                            />
                          </div>
                          <div className={styles.voteCount}>{option.voteCount} 票 ({option.percentage}%)</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 币种和话题标签 */}
                {(detail.tags?.length > 0 || detail.topics?.length > 0) && (
                  <div className={styles.tagsTopicsContainer}>
                    {/* 币种标签 */}
                    {detail.tags?.map(tag => (
                      <span 
                        key={`tag-${tag.id}`} 
                        className={styles.coinTag}
                        onClick={() => window.location.href = `/detail?symbol=${tag.name}`}
                      >
                        @{tag.name}
                      </span>
                    ))}
                    
                    {/* 话题标签 */}
                    {detail.topics?.map(topic => (
                      <span 
                        key={`topic-${topic.id}`} 
                        className={styles.topicTag}
                        onClick={() => window.location.href = `/topicinfo?id=${topic.id}`}
                      >
                        #{topic.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className={styles.postStats}>
                  <span className={styles.time}>{(detail.createdAt|| '').replace('T', '    ')}</span>
                  <div className={styles.actionGroup}>
                    <div className={styles.likeBtn} onClick={handlePostLike}>
                      <img 
                        className={styles.likeIcon} 
                        src={detail.isLikedByCurrentUser || likedPosts[detail.id] ? likeActiveIcon : likeNoActiveIcon} 
                        alt="点赞" 
                      />
                      <span className={`${styles.likes} ${likedPosts[detail.id] ? styles.liked : ''}`}>
                        {detail.likeCnt || 0}
                      </span>
                    </div>
                    <div className={styles.shareBtn} onClick={handleShare}>
                      <img className={styles.shareIcon} src={shareIcon} alt="share" />
                      <span className={styles.shareText}>{t('comment.share')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 评论列表 */}
            <div className={styles.commentSection}>
              <div className={styles.listHeader}>
                <span className={styles.total}>{t('comment.allComments')}</span>
                <span className={styles.count}>{t('comment.replyCount', { count: list.length })}</span>
              </div>

              <div className={styles.commentList}>
              {list.map(item => (
                <div key={item.id} className={styles.secondComment}>
                  <div className={styles.commentHeader}>
                    <img src={item.user.avatar} className={styles.avatar} alt="avatar" />
                    <span className={styles.nickname}>{item.user.nickname}</span>
                    <div className={styles.headerRight}>
                      <div className={styles.likeBtn} onClick={(e) => {
                        e.stopPropagation();
                        handleCommentLike(item.id);
                      }}>
                        <img 
                          className={styles.commentLikeIcon} 
                          src={likedComments[item.id] ? likeActiveIcon : likeNoActiveIcon} 
                          alt="点赞" 
                        />
                        <span className={`${styles.likeCount} ${likedComments[item.id] ? styles.liked : ''}`}>
                          {item.likeCount || 0}
                        </span>
                      </div>
                      {currentUser && currentUser.userId === item.user.id && (
                        <div className={styles.commentHandle} onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPost(item);
                          setShowActionSheet(true);
                        }}>
                          <MoreOutline fontSize={20} />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.commentContent} onClick={() => handleReply(item, item.user)}>
                    <div className={styles.text}>{item.content}</div>
                    <div className={styles.meta}>
                      <span className={styles.time}>{item.createdAt.replace('T', '   ')}</span>
                    </div>
                  </div>

                  {/* 回复列表 */}
                  {item.replies && item.replies.length > 0 && item.replies?.slice(0, expandedComments[item.id] ? undefined : 3).map(reply => (
                    <div key={reply.commentId} className={styles.thirdComment}>
                      <div className={styles.commentHeader}>
                        <img src={reply.user.avatar} className={styles.avatar} alt="avatar" />
                        <span className={styles.nickname}>{reply.user.nickname}</span>
                      </div>
                      
                      <div className={styles.commentContent}>
                        <div onClick={() => handleReply(item, reply.user)}>
                          {reply.replyToUser && (
                            <span className={styles.replyHint}>回复@{reply.replyToUser.nickname}：</span>
                          )}
                          <span className={styles.text}>{reply.content}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {item.replies && item.replies.length > 3 && !expandedComments[item.id] && (
                    <div className={styles.viewMore} onClick={() => setExpandedComments(prev => ({ ...prev, [item.id]: true }))}>
                      查看更多回复 ({item.replies.length - 3})
                    </div>
                  )}
                  {item.replies && item.replies.length > 3 && expandedComments[item.id] && (
                    <div className={styles.viewMore} onClick={() => setExpandedComments(prev => ({ ...prev, [item.id]: false }))}>
                      收起回复
                    </div>
                  )}
                </div>
              ))}

              {/* 加载更多状态 */}
              {loadingMore && (
                <div className={styles.loadingMore}>
                  <Loading />
                </div>
              )}
              </div>

              {/* 底部提示 */}
              {allLoaded && (
                <div className={styles.listFooter}>
                  <span className={styles.footerText}>{t('comment.endOfList')}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* 评论输入框 */}
        <div className={styles.commentInputContainer}>
          {/* 回复提示条已隐藏 */}
          <input
            className={styles.commentInput}
            value={commentContent}
            onChange={(e)=>setCommentContent(e.target.value)}
            placeholder={replyTo ? t('comment.replyPlaceholder', { nickname: replyTo.nickname }) : t('comment.inputPlaceholder')}
            maxLength={200}
          />
          <Button
            className={styles.submitBtn}
            onClick={handleSubmitComment}
            disabled={submitting || !commentContent.trim()}
            loading={submitting}
            color="primary"
          >
            {t('comment.send')}
          </Button>
        </div>
      </div>
    </Layout>
  );
}