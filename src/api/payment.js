import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import {
  isTonSignedBoc,
  resolveTonTxHashFromBoc,
  resolveTonTxHashFromSendResult,
  validateTonTxHashForWalletPay,
} from '@/app/vip-recharge/utils/resolveTonTxHash';
import {
  getTonPaymentTraceId,
  logTonPaymentTrace,
} from '@/app/vip-recharge/utils/tonPaymentTrace';

function extractOrderNo(res) {
  const root = res?.data ?? res;
  if (!root || typeof root !== 'object') return null;
  return root.orderNo || root.order_no || root.data?.orderNo || null;
}

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

  return { ...data, txHash: check.txHash };
}

/**
 * 查询链支付参数（钱包收款信息）
 * GET /payment/walletPaymentInfo
 * @returns {Promise<Array<{chain:string, chainType:string, receiveAddress:string, usdtContract:string, usdtDecimals:number}>>}
 */
export const getWalletPaymentInfo = () => {
  const traceId = getTonPaymentTraceId();
  if (traceId) {
    logTonPaymentTrace('api:walletPaymentInfo:request', {
      api: 'GET /payment/walletPaymentInfo',
    });
  }
  return request({
    url: Interface.PAYMENT_WALLET_PAYMENT_INFO,
    method: 'GET',
  }).then((res) => {
    if (traceId) {
      const list = res?.data ?? res ?? [];
      const ton = Array.isArray(list)
        ? list.find((x) => String(x?.chain || x?.chainType || '').toUpperCase() === 'TON')
        : null;
      logTonPaymentTrace('api:walletPaymentInfo:response', {
        api: 'GET /payment/walletPaymentInfo',
        code: res?.code,
        tonChainFound: !!ton,
        paymentInfo: ton,
      });
    }
    return res;
  });
};

/**
 * 提交钱包支付（上报 txHash 并生成订单号）
 * POST /payment/walletPay
 * @param {{ pricingId: number|string, fromAddress: string, chain: string, txHash: string }} data
 * @returns {Promise<{ orderNo: string, message?: string }>}
 */
export async function walletPay(data) {
  const isTon = data?.chain === 'TON';
  const traceId = isTon ? getTonPaymentTraceId() : null;

  if (traceId) {
    logTonPaymentTrace('api:walletPay:request', {
      api: 'POST /payment/walletPay',
      pricingId: data?.pricingId,
      chain: data?.chain,
      token: data?.token,
      fromAddress: data?.fromAddress,
      txHash: data?.txHash,
    });
  }

  try {
    const payload = isTon ? await coerceTonWalletPayPayload({ ...data }) : data;
    if (traceId && payload?.txHash) {
      logTonPaymentTrace('api:walletPay:payloadReady', {
        txHash: payload.txHash,
        pricingId: payload.pricingId,
      });
    }
    const res = await request({
      url: Interface.PAYMENT_WALLET_PAY,
      method: 'POST',
      data: payload,
    });
    if (traceId) {
      logTonPaymentTrace('api:walletPay:response', {
        api: 'POST /payment/walletPay',
        code: res?.code,
        message: res?.message,
        orderNo: extractOrderNo(res),
        success: res?.code === 0 || res?.code === 200,
      });
    }
    return res;
  } catch (e) {
    if (traceId) {
      logTonPaymentTrace('api:walletPay:error', {
        message: e?.message || String(e),
      });
    }
    throw e;
  }
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
  const traceId = getTonPaymentTraceId();
  return request({
    url: Interface.PAYMENT_ORDER_STATUS,
    method: 'GET',
    params: { orderNo },
  }).then((res) => {
    if (traceId) {
      const statusData = res?.data?.data ?? res?.data ?? res;
      logTonPaymentTrace('api:orderStatus:response', {
        api: 'GET /payment/orderStatus',
        orderNo,
        code: res?.code,
        status:
          statusData?.status ??
          statusData?.orderStatus ??
          statusData?.order_status ??
          statusData?.payStatus,
      });
    }
    return res;
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
