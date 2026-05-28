import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import {
  isTonSignedBoc,
  resolveTonTxHashFromBoc,
  resolveTonTxHashFromSendResult,
  validateTonTxHashForWalletPay,
} from '@/app/vip-recharge/utils/resolveTonTxHash';

/**
 * TON walletPay 提交前：BOC(te6) → 64 位 hex，避免误传整段 BOC
 * @param {Record<string, unknown>} data
 * @returns {Promise<Record<string, unknown>>}
 */
async function coerceTonWalletPayPayload(data) {
  if (!data || data.chain !== 'TON') return data;

  const rawTxHash = data.txHash;
  let resolved = null;

  if (typeof rawTxHash === 'string' && isTonSignedBoc(rawTxHash)) {
    resolved = resolveTonTxHashFromBoc(rawTxHash);
    // eslint-disable-next-line no-console
    console.log('[walletPay][TON] BOC→hash', {
      bocLen: rawTxHash.length,
      hashPreview: resolved ? `${resolved.slice(0, 8)}…${resolved.slice(-8)}` : null,
    });
  } else if (rawTxHash != null) {
    resolved = await resolveTonTxHashFromSendResult(rawTxHash);
  }

  const candidate = resolved ?? rawTxHash;
  const check = validateTonTxHashForWalletPay(candidate);
  if (!check.ok) {
    const errMsg = `[walletPay] TON txHash 无效（${check.reason}），需 64 位 hex，不能传 BOC`;
    // eslint-disable-next-line no-console
    console.error(errMsg, { reason: check.reason, detail: check.detail, pricingId: data.pricingId });
    throw new Error(errMsg);
  }

  if (String(rawTxHash).trim() !== check.txHash) {
    // eslint-disable-next-line no-console
    console.log('[walletPay][TON] 使用反查后的 txHash', {
      beforeLen: String(rawTxHash).length,
      afterLen: check.txHash.length,
      txHash: check.txHash,
    });
  }

  return { ...data, txHash: check.txHash };
}

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
export async function walletPay(data) {
  const payload = data?.chain === 'TON' ? await coerceTonWalletPayPayload({ ...data }) : data;
  return request({
    url: Interface.PAYMENT_WALLET_PAY,
    method: 'POST',
    data: payload,
  });
}

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
