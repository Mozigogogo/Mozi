/**
 * 社区相关 API
 */
import { request } from '../utils/request';
import { Interface } from '../utils/constants';

/**
 * 获取指定用户发布的帖子列表
 * GET /posts/user/{userId}?page=1&size=10
 * @param {string} userId - 用户 ID
 * @param {number} page - 页码，默认 1
 * @param {number} size - 每页数量，默认 10
 * @returns {Promise}
 */
export const getPostsByUserId = (userId, page = 1, size = 10) => {
  const targetUserId = String(userId ?? '').trim();
  if (!targetUserId) {
    return Promise.reject(new Error('userId is required'));
  }

  return request({
    url: `${Interface.POSTS_BY_USER}/${encodeURIComponent(targetUserId)}`,
    method: 'GET',
    data: { page, size },
  });
};

/**
 * 获取用户关注列表（可查询自己或他人，登录可选）
 * GET /user/followList/{userId}?page=1&size=20
 * @param {string} userId - 要查询的用户 ID
 * @param {number} page - 页码，默认 1
 * @param {number} size - 每页数量，默认 20
 * @returns {Promise<{
 *   total: number,
 *   page: number,
 *   size: number,
 *   totalPages: number,
 *   data: Array<{
 *     userId: string,
 *     nickName: string,
 *     avatar: string,
 *     followedAt: string
 *   }>
 * }>}
 */
export const getUserFollowList = (userId, page = 1, size = 20) => {
  if (!userId) {
    return Promise.reject(new Error('userId is required'));
  }

  return request({
    url: `${Interface.USER_FOLLOW_LIST}/${encodeURIComponent(String(userId))}`,
    method: 'GET',
    data: {
      page,
      size,
    },
  });
};

/**
 * 获取用户粉丝列表（可查询自己或他人，登录可选）
 * GET /user/fanList/{userId}?page=1&size=20
 * @param {string} userId - 要查询的用户 ID
 * @param {number} page - 页码，默认 1
 * @param {number} size - 每页数量，默认 20
 * @returns {Promise<{
 *   total: number,
 *   page: number,
 *   size: number,
 *   totalPages: number,
 *   data: Array<{
 *     userId: string,
 *     nickName: string,
 *     avatar: string,
 *     isFollowing: boolean,
 *     followedAt: string
 *   }>
 * }>}
 */
export const getUserFanList = (userId, page = 1, size = 20) => {
  if (!userId) {
    return Promise.reject(new Error('userId is required'));
  }

  return request({
    url: `${Interface.USER_FAN_LIST}/${encodeURIComponent(String(userId))}`,
    method: 'GET',
    data: {
      page,
      size,
    },
  });
};

/**
 * 关注用户（登录必填）
 * GET /user/follow/{userId}
 * @param {string} userId - 要关注的目标用户 ID
 * @returns {Promise}
 */
export const followUser = (userId) => {
  if (!userId) {
    return Promise.reject(new Error('userId is required'));
  }

  return request({
    url: `${Interface.USER_FOLLOW}/${encodeURIComponent(String(userId))}`,
    method: 'GET',
  });
};

/**
 * 取关用户（登录必填）
 * GET /user/unfollow/{userId}
 * @param {string} userId - 要取关的目标用户 ID
 * @returns {Promise}
 */
export const unfollowUser = (userId) => {
  if (!userId) {
    return Promise.reject(new Error('userId is required'));
  }

  return request({
    url: `${Interface.USER_UNFOLLOW}/${encodeURIComponent(String(userId))}`,
    method: 'GET',
  });
};

/**
 * 查询是否已关注目标用户（登录必填）
 * GET /user/followStatus/{userId}
 * @param {string} userId - 目标用户 ID
 * @returns {Promise<boolean|Object>} 后端返回 true/false（或包裹在统一响应结构中）
 */
export const getUserFollowStatus = (userId) => {
  if (!userId) {
    return Promise.reject(new Error('userId is required'));
  }

  return request({
    url: `${Interface.USER_FOLLOW_STATUS}/${encodeURIComponent(String(userId))}`,
    method: 'GET',
  });
};

/**
 * 点踩帖子（若已点赞，先自动取消点赞）
 * GET /posts/dislike/{postId}
 * @param {string|number} postId - 帖子 ID
 * @returns {Promise}
 */
export const dislikePost = async (postId) => {
  const targetPostId = String(postId ?? '').trim();
  if (!targetPostId) {
    return Promise.reject(new Error('postId is required'));
  }

  const encodedPostId = encodeURIComponent(targetPostId);

  // 按产品逻辑：点踩时若已点赞应自动取消点赞。
  // 后端若已实现该逻辑，这里是幂等兜底；若未实现，则前端先尝试一次取消点赞。
  try {
    await request({
      url: `${Interface.POSTS_UNLIKE}/${encodedPostId}`,
      method: 'GET',
    });
  } catch (_) {}

  return request({
    url: `${Interface.POSTS_DISLIKE}/${encodedPostId}`,
    method: 'GET',
  });
};

/**
 * 取消点踩
 * GET /posts/undislike/{postId}
 * @param {string|number} postId - 帖子 ID
 * @returns {Promise}
 */
export const undislikePost = (postId) => {
  const targetPostId = String(postId ?? '').trim();
  if (!targetPostId) {
    return Promise.reject(new Error('postId is required'));
  }

  return request({
    url: `${Interface.POSTS_UNDISLIKE}/${encodeURIComponent(targetPostId)}`,
    method: 'GET',
  });
};

/**
 * 举报帖子（同一用户同一帖子仅可举报一次）
 * POST /posts/{id}/report
 * @param {string|number} postId - 帖子 ID
 * @param {string} reason - 举报原因（必填，最多 200 字）
 * @returns {Promise}
 */
export const reportPost = (postId, reason) => {
  const targetPostId = String(postId ?? '').trim();
  if (!targetPostId) {
    return Promise.reject(new Error('postId is required'));
  }

  const reasonText = String(reason ?? '').trim();
  if (!reasonText) {
    return Promise.reject(new Error('reason is required'));
  }
  if (reasonText.length > 200) {
    return Promise.reject(new Error('reason must be <= 200 characters'));
  }

  return request({
    url: Interface.POSTS_REPORT.replace('{id}', encodeURIComponent(targetPostId)),
    method: 'POST',
    data: { reason: reasonText },
  });
};

/**
 * 删除帖子（仅作者可删除）
 * GET /posts/remove/{id}
 * @param {string|number} postId - 帖子 ID
 * @returns {Promise}
 */
export const removePost = (postId) => {
  const targetPostId = String(postId ?? '').trim();
  if (!targetPostId) {
    return Promise.reject(new Error('postId is required'));
  }

  return request({
    url: Interface.POSTS_REMOVE.replace('{id}', encodeURIComponent(targetPostId)),
    method: 'GET',
  });
};

/**
 * 删除评论（仅作者可删除）
 * GET /comments/remove/{id}
 * @param {string|number} commentId - 评论 ID
 * @returns {Promise}
 */
export const removeComment = (commentId) => {
  const targetCommentId = String(commentId ?? '').trim();
  if (!targetCommentId) {
    return Promise.reject(new Error('commentId is required'));
  }

  return request({
    url: Interface.COMMENTS_REMOVE.replace('{id}', encodeURIComponent(targetCommentId)),
    method: 'GET',
  });
};
