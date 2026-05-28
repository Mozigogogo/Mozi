import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';

/**
 * 查询链支付参数（钱包收款信息）
 * GET /payment/walletPaymentInfo
 * @returns {Promise<Array<{chain:string, chainType:string, receiveAddress:string, usdtContract:string, usdtDecimals:number}>>}
 */
export const getWalletPaymentInfo = () => {
  return request({
    url: Interface.PAYMENT_WALLET_PAYMENT_INFO,
    method: 'GET',
  });
};

/**
 * 提交钱包支付（上报 txHash 并生成订单号）
 * POST /payment/walletPay
 * @param {{ pricingId: number|string, fromAddress: string, chain: string, txHash: string }} data
 * @returns {Promise<{ orderNo: string, message?: string }>}
 */
export const walletPay = (data) => {
  const txHash = data?.txHash;
  if (typeof txHash === 'string' && /^te6/i.test(txHash.trim())) {
    const errMsg = '[walletPay] txHash 不能是 BOC(te6...)，需 64 位 hex';
    // eslint-disable-next-line no-console
    console.error(errMsg, { len: txHash.length, chain: data?.chain, pricingId: data?.pricingId });
    return Promise.reject(new Error(errMsg));
  }
  if (data?.chain === 'TON' && typeof txHash === 'string' && txHash.trim()) {
    const hex = txHash.trim().replace(/^0x/i, '');
    if (!/^[0-9a-f]{64}$/i.test(hex)) {
      // eslint-disable-next-line no-console
      console.warn('[walletPay] TON txHash 非 64 位 hex', {
        len: txHash.length,
        head: txHash.slice(0, 24),
        pricingId: data?.pricingId,
      });
    }
  }
  return request({
    url: Interface.PAYMENT_WALLET_PAY,
    method: 'POST',
    data,
  });
};

/**
 * 获取 Telegram Stars 支付链接
 * POST /payment/starsInvoiceLink
 *
 * @param {number|{pricingId:number}} dataOrPricingId - pricingId 或 { pricingId }
 * @returns {Promise<{ invoiceLink: string; orderNo: string }>}
 */
export const createStarsInvoice = (dataOrPricingId) => {
  const data =
    typeof dataOrPricingId === 'number'
      ? { pricingId: dataOrPricingId }
      : dataOrPricingId;
  return request({
    url: Interface.PAYMENT_CREATE_STARS,
    method: 'POST',
    data,
  });
};

/**
 * 查询订单状态（Stars 支付）
 * GET /payment/orderStatus?orderNo=ORD_xxx （需登录）
 *
 * @param {string} orderNo - 订单号，例如 "ORD_xxx"
 * @returns {Promise<{ orderNo: string; status: string; paidAt: string | null }>}
 *
 * status 取值说明：
 * - PENDING：未支付
 * - SUCCESS：已支付，会员已开通
 * - FAILED：支付失败
 * - CANCELLED：已取消
 */
export const getOrderStatus = (orderNo) => {
  return request({
    url: Interface.PAYMENT_ORDER_STATUS,
    method: 'GET',
    params: { orderNo },
  });
};

/**
 * 创建链上钱包支付订单
 * POST /payment/createWalletOrder
 * @param {{ pricingId: string|number, fromAddress: string }} data
 */
export const createWalletOrder = (data) => {
  return request({
    url: Interface.PAYMENT_CREATE_WALLET_ORDER,
    method: 'POST',
    data,
  });
};

/**
 * 提交链上交易哈希
 * POST /payment/submitWalletTx
 * @param {{ orderNo: string, txHash: string }} data
 */
export const submitWalletTx = (data) => {
  return request({
    url: Interface.PAYMENT_SUBMIT_WALLET_TX,
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
