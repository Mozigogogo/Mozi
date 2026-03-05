import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';

/**
 * 创建 Telegram Stars 支付订单
 * @param {Object} data
 * @param {number} data.amount - 金额
 * @param {string} data.productId - 商品ID
 */
export const createStarsInvoice = (data) => {
  return request({
    url: Interface.PAYMENT_CREATE_STARS,
    method: 'POST',
    data,
  });
};

/**
 * 验证加密货币支付
 * @param {Object} data
 * @param {string} data.txHash - 交易哈希
 * @param {number} data.chainId - 链ID
 * @param {string} data.productId - 商品ID
 * @param {string} data.walletAddress - 钱包地址
 */
export const verifyCryptoPayment = (data) => {
  return request({
    url: Interface.PAYMENT_VERIFY_CRYPTO,
    method: 'POST',
    data,
  });
};
