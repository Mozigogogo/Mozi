'use client';

const TRACE_PREFIX = '[TonPayTrace]';

function isTonPaymentTraceEnabled() {
  const flag = process.env.NEXT_PUBLIC_TON_PAYMENT_TRACE;
  if (flag === '0' || flag === 'false') return false;
  if (flag === '1' || flag === 'true') return true;
  // 默认开启，便于 Railway / 服务端排查；上线稳定后可设 NEXT_PUBLIC_TON_PAYMENT_TRACE=0
  return true;
}

function createTraceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `ton_${crypto.randomUUID()}`;
  }
  return `ton_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

let activeTraceId = null;

export function getTonPaymentTraceId() {
  return activeTraceId;
}

/**
 * 开始一笔 TON VIP 支付追踪（从拉支付参数到订单 SUCCESS）
 * @param {Record<string, unknown>} meta
 * @returns {string}
 */
export function startTonPaymentTrace(meta = {}) {
  activeTraceId = createTraceId();
  logTonPaymentTrace('flow:start', meta);
  return activeTraceId;
}

export function endTonPaymentTrace(stage = 'flow:end', detail = {}) {
  logTonPaymentTrace(stage, detail);
  activeTraceId = null;
}

function maskAddress(addr) {
  const s = String(addr || '').trim();
  if (!s) return null;
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function maskTxHash(hash) {
  const s = String(hash || '').trim();
  if (!s) return null;
  if (s.length <= 16) return s;
  return `${s.slice(0, 8)}…${s.slice(-8)}`;
}

function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const out = { ...payload };
  if (out.txHash) out.txHash = maskTxHash(out.txHash);
  if (out.fromAddress) out.fromAddress = maskAddress(out.fromAddress);
  if (out.toAddress) out.toAddress = maskAddress(out.toAddress);
  if (out.connectedTonAddress) out.connectedTonAddress = maskAddress(out.connectedTonAddress);
  if (out.userJettonWalletAddress) out.userJettonWalletAddress = maskAddress(out.userJettonWalletAddress);
  if (out.merchantAddress) out.merchantAddress = maskAddress(out.merchantAddress);
  if (out.merchantJettonWallet) out.merchantJettonWallet = maskAddress(out.merchantJettonWallet);
  if (typeof out.rawBocLen === 'number' && out.rawBocLen > 0) {
    out.rawBocLen = out.rawBocLen;
  }
  if (out.res && typeof out.res === 'object') {
    out.res = { keys: Object.keys(out.res) };
  }
  if (out.paymentInfo && typeof out.paymentInfo === 'object') {
    out.paymentInfo = {
      chain: out.paymentInfo.chain || out.paymentInfo.chainType,
      amountUsdt: out.paymentInfo.usdtAmount ?? out.paymentInfo.amountUsdt ?? out.paymentInfo.payAmount,
      memo: out.paymentInfo.memo,
      gasAmountNano: out.paymentInfo.gasAmountNano,
      hasPayloadFromBackend: !!(
        out.paymentInfo.payloadBase64 ||
        out.paymentInfo.jettonPayloadBase64 ||
        out.paymentInfo.payload
      ),
    };
  }
  return out;
}

/**
 * @param {string} stage
 * @param {Record<string, unknown>} [payload]
 */
export function logTonPaymentTrace(stage, payload = {}) {
  if (!isTonPaymentTraceEnabled()) return;

  const entry = {
    ts: new Date().toISOString(),
    traceId: activeTraceId,
    stage,
    channel: typeof window !== 'undefined' ? window.localStorage?.getItem('appChannel') : null,
    ...sanitizePayload(payload),
  };

  // eslint-disable-next-line no-console
  console.log(TRACE_PREFIX, stage, entry);

  if (typeof window === 'undefined') return;

  try {
    fetch('/mozi-payment-trace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(activeTraceId ? { 'X-Mozi-Ton-Trace-Id': activeTraceId } : {}),
        'X-Mozi-Ton-Trace-Stage': stage,
      },
      body: JSON.stringify(entry),
      keepalive: true,
    }).catch(() => {});
  } catch (_) {}
}
