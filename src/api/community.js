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
