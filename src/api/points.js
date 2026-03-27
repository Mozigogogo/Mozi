/**
 * 积分/任务相关 API
 */
import { request } from '../utils/request';
import { Interface } from '../utils/constants';

/**
 * 获取本月积分公共池状态
 * 
 * 响应结构:
 * {
 *   "code": 0,
 *   "data": {
 *     "totalCapacity": 2400000, // 本月积分池总容量
 *     "issuedPoints": 768000,   // 本月已发放积分
 *     "remainingPoints": 1632000, // 剩余可发放积分
 *     "usedPercent": 32,        // 已用百分比
 *     "daysToReset": 12,        // 距下月1日重置的天数
 *     "mode": "BOOST",          // 当前模式：NORMAL / SCARCE / BOOST
 *     "multiplier": 1.5,        // 当前任务奖励倍率
 *     "displayMessage": "周末积分加倍活动！" // 前端提示文案
 *   }
 * }
 * 
 * @returns {Promise}
 */
export const getPoolStatus = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return request({
    url: Interface.POOL_STATUS,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

/**
 * 查询消费配置
 * 
 * 响应结构:
 * {
 *   "code": 0,
 *   "data": [
 *     { "actionCode": "AI_DEEP_ANALYZE", "actionName": "AI深度分析",  "costPoints": 50,  "description": "综合行情+链上+新闻分析，按次扣除" },
 *     ...
 *   ]
 * }
 */
export const getConsumeConfig = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return request({
    url: Interface.POINTS_CONSUME_CONFIG,
    method: 'GET',
    headers: {
      'Authentication': `Bearer ${token}`
    }
  });
};

/**
 * 执行积分消费
 * 
 * @param {Object} data { actionCode: "BIG_ORDER_VIEW" }
 * 
 * 响应结构:
 * { "code": 0, "data": { "success": true, "remainingPoints": 800 } }
 */
export const executeConsume = (data) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return request({
    url: Interface.POINTS_CONSUME,
    method: 'POST',
    data,
    headers: {
      'Authentication': `Bearer ${token}`
    }
  });

  // 当前返回一个模拟成功结果，不真正扣减积分。
  // return Promise.resolve({
  //   code: 0,
  //   data: {
  //     success: true,
  //     remainingPoints: Number.POSITIVE_INFINITY,
  //   },
  // });
};

/**
 * 获取用户积分数据
 * @returns {Promise}
 */
export const getTaskPoints = () => {
  return request({
    url: Interface.TASK_POINTS,
    method: 'GET'
  });
};

/**
 * 获取邀请列表数据
 * @returns {Promise}
 */
export const getInvitationList = () => {
  return request({
    url: Interface.TASK_INVITATION_LIST,
    method: 'GET'
  });
};

/**
 * 获取任务列表
 * @returns {Promise}
 */
export const getTaskList = () => {
  return request({
    url: Interface.TASK_LIST,
    method: 'GET'
  });
};

/**
 * 完成任务
 * @param {Object} data { taskCode: "EARLY_BIRD" }
 * @returns {Promise}
 */
export const completeTask = (data) => {
  return request({
    url: Interface.TASK_COMPLETE,
    method: 'POST',
    data
  });
};
