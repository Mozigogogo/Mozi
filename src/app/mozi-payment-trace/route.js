import { API_BASE_URL } from '../../../config/index.js';

/**
 * TON 支付链路追踪（服务端落日志，便于 Railway / 容器 stdout 检索 [TonPayTrace]）
 */
export async function POST(request) {
  let body = null;
  try {
    body = await request.json();
  } catch (_) {
    body = { parseError: true };
  }

  const traceId = body?.traceId || request.headers.get('x-mozi-ton-trace-id') || '-';
  const stage = body?.stage || request.headers.get('x-mozi-ton-trace-stage') || '-';
  const line = JSON.stringify({
    source: 'mozi-frontend',
    traceId,
    stage,
    ...body,
  });

  // Railway / Docker 标准输出，按 [TonPayTrace] 过滤
  console.log(`[TonPayTrace][server] ${line}`);

  // 可选：转发到 Java 后端（若已实现 /payment/clientTrace）
  const forwardEnabled = process.env.TON_PAYMENT_TRACE_FORWARD !== '0';
  if (forwardEnabled && API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/payment/clientTrace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: line,
      });
      if (!res.ok) {
        console.warn(
          `[TonPayTrace][server] backend forward ${res.status}`,
          traceId,
          stage
        );
      }
    } catch (e) {
      console.warn('[TonPayTrace][server] backend forward failed', e?.message || e);
    }
  }

  return Response.json({ ok: true, traceId });
}
