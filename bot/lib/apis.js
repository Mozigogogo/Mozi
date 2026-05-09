/**
 * 项目内所有对外 HTTP 接口：TG 注册检查 POST、详情行情 GET、AI 流式 POST 等
 */

const { apiDebug } = require('./debugLog');

const DEFAULT_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

// --- GET /detail/header -----------------------------------------------------

/**
 * GET /detail/header?symbol=（不传鉴权头）
 * @param {{ apiBaseUrl: string; appUrl: string; symbol: string; acceptLanguage: string }} opts
 * @returns {Promise<{ ok: boolean; status: number; json: object | null; text: string }>}
 */
async function fetchDetailHeader({ apiBaseUrl, appUrl, symbol, acceptLanguage }) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const app = String(appUrl || '').replace(/\/+$/, '');
  const url = `${base}/detail/header?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': acceptLanguage,
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      referer: `${app}/detail?symbol=${encodeURIComponent(symbol)}`,
      'user-agent': DEFAULT_UA,
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  const out = { ok: res.ok, status: res.status, json, text };
  apiDebug('GET /detail/header →', {
    symbol,
    httpStatus: res.status,
    ok: res.ok,
    parseJsonOk: json != null,
    ...(res.ok && json && typeof json === 'object' && !Array.isArray(json)
      ? { jsonKeys: Object.keys(json).slice(0, 40) }
      : { bodyPreview: text.slice(0, 500) }),
  });
  return out;
}

// --- POST /user/tg/registered/check -----------------------------------------

/**
 * @param {{ apiBaseUrl: string; telegramId: string; auth?: string; appUrl?: string; timeoutMs?: number }} opts
 * @returns {Promise<{ ok: boolean; status: number; json: object | null; text: string }>}
 */
async function postTgRegisteredCheck({
  apiBaseUrl,
  telegramId,
  auth = '',
  appUrl = '',
  timeoutMs = 15000,
}) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const app = String(appUrl || '').replace(/\/+$/, '');
  const url = `${base}/user/tg/registered/check`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers = {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent': DEFAULT_UA,
  };
  if (auth) {
    headers.authentication = auth;
  }
  if (app) {
    headers.referer = `${app}/`;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ telegramId }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const out = { ok: res.ok, status: res.status, json, text };
    apiDebug('POST /user/tg/registered/check →', {
      telegramId,
      httpStatus: res.status,
      ok: res.ok,
      hasAuth: Boolean(auth),
      bodyPreview: text.slice(0, 500),
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

// --- POST 流式分析 / 对话（/ai、/chat）---------------------------------------
//
// Headers: Content-Type: application/json
//          Accept: text/event-stream, application/json
//          若配置了 secret：Authorization: Bearer <secret>
//
// Body: question, telegramUserId, …（/chat 另见 requestChatStream：message + lang）
//
// 成功 200：text/event-stream（SSE）或 application/json（answer | content | text | message）

/**
 * @param {unknown} obj
 * @returns {string}
 */
function extractChunkText(obj) {
  if (obj == null || typeof obj !== 'object') return '';
  const delta = obj.choices?.[0]?.delta;
  if (delta && typeof delta === 'object') {
    const c = delta.content ?? delta.text;
    if (typeof c === 'string') return c;
    if (Array.isArray(c)) {
      return c
        .map((x) => {
          if (x == null) return '';
          if (typeof x === 'string') return x;
          if (typeof x.text === 'string') return x.text;
          if (typeof x.content === 'string') return x.content;
          return '';
        })
        .join('');
    }
  }
  for (const k of ['content', 'text', 'answer', 'message', 'token', 'delta', 'output', 'response', 'result']) {
    const v = obj[k];
    if (typeof v === 'string') return v;
  }
  if (obj.data !== undefined && obj.data !== null) {
    if (typeof obj.data === 'string') return obj.data;
    if (typeof obj.data === 'object') return extractChunkText(obj.data);
  }
  return '';
}

/**
 * @param {unknown} obj
 * @returns {number | undefined}
 */
function extractPointsCost(obj) {
  if (obj && typeof obj === 'object' && typeof obj.pointsCost === 'number' && Number.isFinite(obj.pointsCost)) {
    return Math.round(obj.pointsCost);
  }
  return undefined;
}

/**
 * SSE 事件块 → data: 合并后的 payload（不含 data: 前缀），无 data 则 null
 * @param {string} block
 * @returns {string | null}
 */
function parseSseDataPayload(block) {
  const lines = block.split(/\r?\n/);
  const parts = [];
  for (const line of lines) {
    if (line.startsWith('data:')) {
      parts.push(line.slice(5).trimStart());
    }
  }
  if (parts.length === 0) return null;
  return parts.join('\n');
}

/**
 * @param {Response} res
 * @param {AbortSignal} signal
 * @returns {Promise<{ answer: string, pointsCost?: number }>}
 */
async function consumeSseStream(res, signal) {
  const reader = res.body?.getReader();
  if (!reader) {
    const raw = await res.text();
    throw new Error(raw ? `No stream body: ${raw.slice(0, 200)}` : 'No stream body');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  /** @type {number | undefined} */
  let pointsCost;

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep;
    while ((sep = buffer.search(/\r\n\r\n|\n\n/)) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + (buffer[sep] === '\r' ? 4 : 2));

      const payload = parseSseDataPayload(block);
      if (payload == null) continue;
      const trimmed = payload.trim();
      if (trimmed === '[DONE]') continue;

      let parsed;
      try {
        parsed = JSON.parse(payload);
      } catch {
        answer += payload;
        continue;
      }

      const textChunk = extractChunkText(parsed);
      if (parsed && typeof parsed === 'object') {
        const errStr = typeof parsed.error === 'string' ? parsed.error : '';
        if (errStr && !textChunk) {
          const err = new Error('AI stream error');
          err.userMessage = errStr;
          throw err;
        }
      }

      const pc = extractPointsCost(parsed);
      if (pc !== undefined) pointsCost = pc;
      if (textChunk) answer += textChunk;
    }
  }

  if (buffer.trim()) {
    const payload = parseSseDataPayload(buffer);
    if (payload != null && payload.trim() !== '[DONE]') {
      try {
        const parsed = JSON.parse(payload);
        const pc = extractPointsCost(parsed);
        if (pc !== undefined) pointsCost = pc;
        answer += extractChunkText(parsed);
      } catch {
        answer += payload;
      }
    } else if (!payload && buffer.trim()) {
      answer += buffer;
    }
  }

  if (!String(answer).trim()) {
    const err = new Error('Empty answer from AI backend stream');
    err.streamHint = buffer.trim()
      ? `tail:${buffer.slice(-Math.min(800, buffer.length))}`
      : 'no_sse_text_extracted';
    throw err;
  }
  return { answer: String(answer).trim(), pointsCost };
}

/**
 * POST …/chat/stream：body `{ message, lang }`，可选 `symbol`（意图识别兜底）
 * @param {{ url: string; message: string; lang: string; symbol?: string | null; appUrl?: string; timeoutMs?: number }} opts
 * @returns {Promise<{ answer: string, pointsCost?: number }>}
 */
async function requestChatStream({ url, message, lang, symbol, appUrl = '', timeoutMs = 300000 }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const app = String(appUrl || '').replace(/\/+$/, '');
  const langNorm = lang === 'zh' || lang === 'en' ? lang : 'en';

  const headers = {
    accept: 'text/event-stream',
    'accept-language': langNorm,
    'content-type': 'application/json',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    language: langNorm,
    'user-agent': DEFAULT_UA,
  };
  if (app) {
    headers.origin = app;
    headers.referer = `${app}/ai`;
  }

  const sym =
    symbol != null && String(symbol).trim() !== '' ? String(symbol).trim().toUpperCase() : null;
  const payload = { message, lang: langNorm };
  if (sym) {
    payload.symbol = sym;
  }

  apiDebug('POST chat/stream ←', {
    url,
    lang: langNorm,
    symbol: sym,
    messagePreview: typeof message === 'string' ? message.slice(0, 160) : undefined,
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const likelySse = ct.includes('text/event-stream') || /\/stream\b/i.test(url);

    if (!res.ok) {
      const raw = await res.text();
      let userMessage;
      try {
        const errData = JSON.parse(raw);
        userMessage =
          (typeof errData.error === 'string' && errData.error) ||
          (typeof errData.message === 'string' && errData.message) ||
          (typeof errData.msg === 'string' && errData.msg) ||
          undefined;
      } catch {
        /* ignore */
      }
      if (!userMessage && raw && String(raw).trim()) {
        userMessage = String(raw).trim().slice(0, 500);
      }
      const err = new Error(`Chat stream HTTP ${res.status}`);
      err.status = res.status;
      err.userMessage = userMessage;
      err.rawBody = raw.slice(0, 500);
      throw err;
    }

    if (likelySse) {
      const result = await consumeSseStream(res, ctrl.signal);
      apiDebug('POST chat/stream → ok', {
        mode: 'sse',
        answerChars: result.answer.length,
        pointsCost: result.pointsCost ?? null,
      });
      return result;
    }

    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      apiDebug('POST chat/stream → invalid_json', { bodyPreview: raw.slice(0, 400) });
      throw new Error('Invalid JSON from chat stream');
    }

    const answer =
      (typeof data.answer === 'string' && data.answer) ||
      (typeof data.content === 'string' && data.content) ||
      (typeof data.text === 'string' && data.text) ||
      (typeof data.message === 'string' && data.message) ||
      '';

    if (!String(answer).trim()) {
      apiDebug('POST chat/stream → empty_answer', {
        jsonKeys: data && typeof data === 'object' ? Object.keys(data) : [],
      });
      throw new Error('Empty answer from chat stream');
    }

    const pointsCost = extractPointsCost(data);
    apiDebug('POST chat/stream → ok', {
      mode: 'json',
      answerChars: String(answer).trim().length,
      pointsCost: pointsCost ?? null,
    });
    return { answer: String(answer).trim(), pointsCost };
  } catch (err) {
    const aborted =
      err?.name === 'AbortError' ||
      /aborted|AbortError|signal is aborted/i.test(String(err?.message || ''));
    apiDebug('POST chat/stream → failed', {
      message: err?.message || String(err),
      likelyTimeout: aborted,
      userMessage: err?.userMessage ?? null,
      httpStatus: err?.status ?? null,
      rawBody: err?.rawBody ?? null,
      streamHint: err?.streamHint ?? null,
    });
    throw err;
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {object} opts
 * @param {string} opts.url
 * @param {string} [opts.secret]
 * @param {object} opts.body
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<{ answer: string, pointsCost?: number }>}
 */
async function requestAiAnalysis({ url, secret, body, timeoutMs = 120000 }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream, application/json',
  };
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }

  const q = body?.question;
  apiDebug('POST AI stream ←', {
    url,
    hasBearer: Boolean(secret),
    telegramUserId: body?.telegramUserId ?? null,
    questionPreview: typeof q === 'string' ? q.slice(0, 160) : undefined,
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const likelySse = ct.includes('text/event-stream') || /\/stream\b/i.test(url);

    if (!res.ok) {
      const raw = await res.text();
      let userMessage;
      try {
        const errData = JSON.parse(raw);
        userMessage =
          (typeof errData.error === 'string' && errData.error) ||
          (typeof errData.message === 'string' && errData.message) ||
          undefined;
      } catch {
        /* ignore */
      }
      const err = new Error(`AI backend HTTP ${res.status}`);
      err.status = res.status;
      err.userMessage = userMessage;
      err.rawBody = raw.slice(0, 500);
      throw err;
    }

    if (likelySse) {
      const result = await consumeSseStream(res, ctrl.signal);
      apiDebug('POST AI stream → ok', {
        mode: 'sse',
        answerChars: result.answer.length,
        pointsCost: result.pointsCost ?? null,
      });
      return result;
    }

    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      apiDebug('POST AI stream → invalid_json', { bodyPreview: raw.slice(0, 400) });
      throw new Error('Invalid JSON from AI backend');
    }

    const answer =
      (typeof data.answer === 'string' && data.answer) ||
      (typeof data.content === 'string' && data.content) ||
      (typeof data.text === 'string' && data.text) ||
      (typeof data.message === 'string' && data.message) ||
      '';

    if (!String(answer).trim()) {
      apiDebug('POST AI stream → empty_answer', { jsonKeys: data && typeof data === 'object' ? Object.keys(data) : [] });
      throw new Error('Empty answer from AI backend');
    }

    const pointsCost = extractPointsCost(data);

    apiDebug('POST AI stream → ok', {
      mode: 'json',
      answerChars: String(answer).trim().length,
      pointsCost: pointsCost ?? null,
    });
    return { answer: String(answer).trim(), pointsCost };
  } catch (err) {
    apiDebug('POST AI stream → failed', {
      message: err?.message || String(err),
      userMessage: err?.userMessage ?? null,
      httpStatus: err?.status ?? null,
      rawBody: err?.rawBody ?? null,
    });
    throw err;
  } finally {
    clearTimeout(t);
  }
}

module.exports = {
  fetchDetailHeader,
  postTgRegisteredCheck,
  requestChatStream,
  requestAiAnalysis,
};
