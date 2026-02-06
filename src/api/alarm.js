import { request } from "@/utils/request";
import { Interface } from "@/utils/constants";

/**
 * 获取币种价格信息
 * @param {Object} data - 请求参数
 * @param {string} data.symbol - 币种符号
 * @returns {Promise}
 */
export const getCoinInfo = (data) => {
  return request({
    url: Interface.coin_info,
    method: 'GET',
    data,
  });
};

/**
 * 完成告警任务
 * @param {Object} data - 请求参数
 * @param {string} data.taskCode - 任务编码
 * @returns {Promise}
 */
export const completeAlarmTask = (data) => {
  return request({
    url: Interface.TASK_COMPLETE,
    method: 'POST',
    data,
  });
};

/**
 * 保存告警配置
 * @param {Object} data - 请求参数
 * @returns {Promise}
 */
export const addAlarm = (data) => {
  return request({
    url: Interface.ADD_ALARM || '/alarm/add',
    method: 'POST',
    data,
  });
};
