/**
 * 分佣/提现相关 API
 */
import { request } from '../utils/request';
import { Interface } from '../utils/constants';

/**
 * 申请提现
 * @param {number} [amount] 提现金额，不传则提现全部可提现余额
 * @returns {Promise}
 */
export const applyCommissionWithdraw = (amount) => {
  const hasAmount = amount !== undefined && amount !== null && amount !== '';
  return request({
    url: Interface.COMMISSION_WITHDRAW,
    method: 'POST',
    ...(hasAmount ? { data: { amount: Number(amount) } } : {}),
  });
};

/**
 * 提现记录列表
 * @param {{ page?: number, pageSize?: number }} params
 * @returns {Promise}
 */
export const getCommissionWithdrawHistory = (params = {}) => {
  return request({
    url: Interface.COMMISSION_WITHDRAWALS,
    method: 'GET',
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    },
  });
};
