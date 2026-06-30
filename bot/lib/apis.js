/**
 * 项目内所有对外 HTTP 接口：TG 注册检查 POST、详情行情 GET、AI 流式 POST 等
 */

const { apiDebug, jwtPreview } = require('./debugLog');
const { guessApiLog } = require('./guessApiDebug');
const { normalizeTgChatCommand } = require('./tgChatQuestionStore');

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

// --- GET /api/search/lastpricechange?coin=（自定义币种搜索）--------------------

/**
 * @param {object | null} json
 * @returns {{ symbol: string; last: string | number } | null}
 */
function parseSearchLastPriceChangeResult(json) {
  if (!json || typeof json !== 'object') return null;
  const code = json.code;
  if (code !== undefined && code !== 0 && code !== 200) return null;
  if (json.success === false) return null;
  const list = Array.isArray(json.data) ? json.data : [];
  if (!list.length) return null;
  const row = list[0];
  if (!row || typeof row !== 'object') return null;
  const symbol = String(row.symbol ?? row.coin ?? '').trim().toUpperCase();
  const last = row.last ?? row.price ?? row.currentPrice;
  if (!symbol || last == null || String(last).trim() === '') return null;
  return { symbol, last };
}

/**
 * GET {APP_URL}/api/search/lastpricechange?coin=（与 H5 搜索一致）
 * @param {{ appUrl: string; coin: string; acceptLanguage?: string; auth?: string; timeoutMs?: number }} opts
 * @returns {Promise<{ ok: boolean; status: number; json: object | null; text: string; hit: ReturnType<typeof parseSearchLastPriceChangeResult> }>}
 */
async function fetchSearchLastPriceChange({
  appUrl,
  coin,
  acceptLanguage = 'zh',
  auth = '',
  timeoutMs = 15000,
}) {
  const app = String(appUrl || '').replace(/\/+$/, '');
  const coinNorm = String(coin || '').trim().toLowerCase();
  const q = new URLSearchParams({ coin: coinNorm });
  const url = `${app}/api/search/lastpricechange?${q.toString()}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const lang = acceptLanguage === 'en' ? 'en' : 'zh';
  const headers = {
    accept: 'application/json, text/plain, */*',
    'accept-language': lang,
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    referer: `${app}/home`,
    'user-agent': DEFAULT_UA,
  };
  const rawAuth = String(auth || '').trim().replace(/^Bearer\s+/i, '');
  if (rawAuth) {
    headers.authentication = rawAuth;
  }
  try {
    const res = await fetch(url, { method: 'GET', headers, signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const hit = parseSearchLastPriceChangeResult(json);
    const out = { ok: res.ok, status: res.status, json, text, hit };
    apiDebug('GET /api/search/lastpricechange →', {
      coin: coinNorm,
      httpStatus: res.status,
      ok: res.ok,
      hasHit: Boolean(hit),
      symbol: hit?.symbol ?? null,
      bodyPreview: text.slice(0, 500),
    });
    return out;
  } finally {
    clearTimeout(t);
  }
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

// --- POST /user/session/token-check（会话是否仍为当前 token）-----------------

/**
 * @param {{ apiBaseUrl: string; telegramId: string; token: string; appUrl?: string; timeoutMs?: number }} opts
 * @returns {Promise<{ ok: boolean; status: number; json: object | null; text: string }>}
 */
async function postUserSessionTokenCheck({
  apiBaseUrl,
  telegramId,
  token,
  appUrl = '',
  timeoutMs = 15000,
}) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const app = String(appUrl || '').replace(/\/+$/, '');
  const url = `${base}/user/session/token-check`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers = {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent': DEFAULT_UA,
  };
  if (app) {
    headers.referer = `${app}/`;
  }
  const rawTok = String(token || '').trim().replace(/^Bearer\s+/i, '');
  if (rawTok) {
    headers.authentication = rawTok;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        telegramId: String(telegramId),
        token: rawTok,
      }),
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
    apiDebug('POST /user/session/token-check →', {
      telegramId: String(telegramId),
      httpStatus: res.status,
      ok: res.ok,
      hasToken: Boolean(rawTok),
      authenticationPreview: jwtPreview(rawTok),
      dataTrue:
        json && typeof json === 'object' && json.data === true
          ? true
          : json && typeof json === 'object' && json.data === false
            ? false
            : null,
      bodyPreview: text.slice(0, 400),
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

// --- POST /user/login（Telegram：与 Mozi TG WebApp 登录 body 一致）----
//
// 期望 JSON 示例（与 Network 面板一致）：
// { "chanel":3, "channel":"tg", "env":"production", "hash":"…", "inviteCode":"",
//   "photoUrl":"", "telegramId":"7351978574", "type":"login", "username":"" }
//
// hash：Mini App 内从 `Telegram.WebApp.initData` 解析；Bot 见 `telegramWebAppLoginHash.js`。

/**
 * 与 Web 端 `loginByTelegram` 一致：POST /user/login，chanel=3。
 * hash 须非空：由 tgUserTokenCache 用 BOT_TOKEN 按 Telegram WebApp 规则生成（见 telegramWebAppLoginHash.js）。
 *
 * @param {{ apiBaseUrl: string; telegramId: string; auth?: string; appUrl?: string; path?: string; timeoutMs?: number; username?: string; photoUrl?: string; hash?: string; inviteCode?: string; env?: string }} opts
 * @returns {Promise<{ ok: boolean; status: number; json: object | null; text: string }>}
 */
async function postTgLogin({
  apiBaseUrl,
  telegramId,
  auth = '',
  appUrl = '',
  path = 'user/login',
  timeoutMs = 15000,
  username = '',
  photoUrl = '',
  hash = '',
  inviteCode = '',
  env = 'test',
}) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const app = String(appUrl || '').replace(/\/+$/, '');
  const rel = String(path || 'user/login').replace(/^\/+/, '');
  const url = `${base}/${rel}`;
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
  /* 字段顺序与浏览器 DevTools / 前端常见展示一致，便于对照 */
  const body = {
    chanel: 3,
    channel: 'tg',
    env: String(env || 'test'),
    hash: String(hash || ''),
    inviteCode: String(inviteCode || ''),
    photoUrl: String(photoUrl || ''),
    telegramId: String(telegramId),
    type: 'login',
    username: String(username || ''),
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
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
    apiDebug('POST user/login (tg) →', {
      telegramId,
      path: rel,
      httpStatus: res.status,
      ok: res.ok,
      hasBootstrapAuth: Boolean(auth),
      bodyPreview: text.slice(0, 500),
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

// --- GET /user/datainfo（/balance 私聊，与 H5 getUserDataInfo 一致）-----------

/**
 * @param {{ apiBaseUrl: string; auth?: string; appUrl?: string; path?: string; timeoutMs?: number }} opts
 * @returns {Promise<{ ok: boolean; status: number; json: object | null; text: string }>}
 */
async function fetchUserDatainfo({
  apiBaseUrl,
  auth = '',
  appUrl = '',
  path = 'user/datainfo',
  timeoutMs = 15000,
}) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const app = String(appUrl || '').replace(/\/+$/, '');
  const rel = String(path || 'user/datainfo').replace(/^\/+/, '');
  const url = `${base}/${rel}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers = {
    accept: 'application/json, text/plain, */*',
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
  apiDebug('GET /user/datainfo ←', { url, timeoutMs });
  try {
    const res = await fetch(url, { method: 'GET', headers, signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const out = { ok: res.ok, status: res.status, json, text };
    apiDebug('GET /user/datainfo →', {
      httpStatus: res.status,
      ok: res.ok,
      hasAuth: Boolean(auth),
      bodyPreview: text.slice(0, 400),
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

// --- POST /points/consume（与 Bot 其它 Mozi 接口一致：小写 authentication + 裸 JWT）---

/**
 * @param {{ apiBaseUrl: string; auth: string; appUrl?: string; actionCode: string; reason?: string; timeoutMs?: number }} opts
 * @returns {Promise<{ ok: boolean; status: number; json: object | null; text: string }>}
 */
async function postPointsConsume({
  apiBaseUrl,
  auth,
  appUrl = '',
  actionCode,
  reason = 'complete',
  timeoutMs = 15000,
}) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const app = String(appUrl || '').replace(/\/+$/, '');
  const url = `${base}/points/consume`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers = {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent': DEFAULT_UA,
  };
  const rawAuth = String(auth || '').trim().replace(/^Bearer\s+/i, '');
  if (rawAuth) {
    /* 与 postTgRegisteredCheck / fetchUserDatainfo 一致；勿用 Authorization: Bearer，后端会判未登录 */
    headers.authentication = rawAuth;
  }
  if (app) {
    headers.referer = `${app}/`;
  }
  const body = {
    actionCode: String(actionCode || ''),
    reason: String(reason || 'complete'),
  };
  apiDebug('POST /points/consume ←', {
    url,
    actionCode: body.actionCode,
    reason: body.reason,
    hasAuthenticationHeader: Boolean(rawAuth),
    authenticationLen: rawAuth.length,
    authenticationPreview: jwtPreview(rawAuth),
    requestHeaderKeys: Object.keys(headers),
  });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
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
    apiDebug('POST /points/consume →', {
      actionCode: body.actionCode,
      reason: body.reason,
      httpStatus: res.status,
      ok: res.ok,
      jsonCode: json && typeof json === 'object' ? json.code : null,
      jsonSuccess: json && typeof json === 'object' ? json.success : null,
      errorMsg: json && typeof json === 'object' ? json.errorMsg || json.message : null,
      dataKeys:
        json && typeof json === 'object' && json.data && typeof json.data === 'object'
          ? Object.keys(json.data).slice(0, 12)
          : null,
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
 * 大单侦测 SSE：content.text、signal_card.display、以及通用 chunk 字段
 * @param {unknown} obj
 * @returns {string}
 */
function extractBigorderChunk(obj) {
  if (obj == null || typeof obj !== 'object') return '';
  const type = typeof obj.type === 'string' ? obj.type : '';
  if (type === 'signal_card') {
    const display =
      (typeof obj.display === 'string' && obj.display) ||
      (obj.data && typeof obj.data.display === 'string' && obj.data.display) ||
      '';
    if (display.trim()) return `\n\n${display.trim()}`;
    return '';
  }
  if (type === 'content' && typeof obj.text === 'string') return obj.text;
  return extractChunkText(obj);
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
async function consumeSseStream(res, signal, options = {}) {
  const pickChunk =
    typeof options.extractChunk === 'function' ? options.extractChunk : extractChunkText;

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

      const textChunk = pickChunk(parsed);
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
        answer += pickChunk(parsed);
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

function createAgentRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * @param {string} block
 * @returns {{ event: string; dataPayload: string | null }}
 */
function parseSseBlock(block) {
  const lines = block.split(/\r?\n/);
  let event = '';
  const dataParts = [];
  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataParts.push(line.slice(5).trimStart());
    }
  }
  return {
    event,
    dataPayload: dataParts.length ? dataParts.join('\n') : null,
  };
}

/**
 * Agent SSE（/ai/agent/stream）单块解析，对齐 H5 useRobotTestSSE
 * @returns {{ text: string; done: boolean; error: string | null }}
 */
function extractAgentChunkFromEvent(messageType, eventData) {
  if (!eventData || typeof eventData !== 'object') {
    return { text: '', done: false, error: null };
  }

  const dataType = eventData.data_type;

  if (messageType === 'error') {
    return {
      text: '',
      done: false,
      error:
        eventData.message ||
        eventData.errorMsg ||
        eventData.error ||
        'SSE stream error',
    };
  }

  if (
    messageType === 'complete' ||
    messageType === 'end' ||
    messageType === 'finish' ||
    messageType === 'done'
  ) {
    return { text: '', done: true, error: null };
  }

  if (messageType === 'start') {
    const text = typeof eventData.data === 'string' ? eventData.data : '';
    return { text, done: false, error: null };
  }

  if (messageType === 'delta') {
    if (dataType === 'chat') {
      return {
        text: typeof eventData.delta === 'string' ? eventData.delta : '',
        done: false,
        error: null,
      };
    }
    if (dataType === 'signal_card') {
      const payload = eventData.payload ?? eventData.data;
      const display =
        (payload && typeof payload.display === 'string' && payload.display) || '';
      return {
        text: display.trim() ? `\n\n${display.trim()}` : '',
        done: false,
        error: null,
      };
    }
    return { text: '', done: false, error: null };
  }

  if (messageType === 'stream' || messageType === 'chunk') {
    let text = '';
    if (typeof eventData.delta === 'string') text = eventData.delta;
    else if (typeof eventData.data === 'string' && messageType === 'chunk') text = eventData.data;
    else if (typeof eventData.content === 'string') text = eventData.content;
    return { text, done: false, error: null };
  }

  if (messageType === 'content') {
    const text =
      typeof eventData.text === 'string'
        ? eventData.text
        : typeof eventData.data === 'string'
          ? eventData.data
          : '';
    return { text, done: false, error: null };
  }

  if (messageType === 'signal_card') {
    const display =
      (typeof eventData.display === 'string' && eventData.display) ||
      (eventData.payload && typeof eventData.payload.display === 'string' && eventData.payload.display) ||
      (eventData.data && typeof eventData.data.display === 'string' && eventData.data.display) ||
      '';
    return {
      text: display.trim() ? `\n\n${display.trim()}` : '',
      done: false,
      error: null,
    };
  }

  return { text: extractChunkText(eventData), done: false, error: null };
}

/**
 * @param {Response} res
 * @param {AbortSignal} signal
 * @returns {Promise<{ answer: string, pointsCost?: number }>}
 */
async function consumeAgentSseStream(res, signal) {
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

      const { event, dataPayload } = parseSseBlock(block);
      if (dataPayload == null) continue;
      const trimmed = dataPayload.trim();
      if (!trimmed || trimmed === '[DONE]') continue;

      let eventData;
      try {
        eventData = JSON.parse(dataPayload);
      } catch {
        answer += dataPayload;
        continue;
      }

      const messageType = event || eventData.event || eventData.type || 'message';
      const chunk = extractAgentChunkFromEvent(messageType, eventData);
      if (chunk.error) {
        const err = new Error('AI agent stream error');
        err.userMessage = chunk.error;
        throw err;
      }

      const pc = extractPointsCost(eventData);
      if (pc !== undefined) pointsCost = pc;
      if (chunk.text) answer += chunk.text;
    }
  }

  if (buffer.trim()) {
    const { event, dataPayload } = parseSseBlock(buffer);
    if (dataPayload != null && dataPayload.trim() && dataPayload.trim() !== '[DONE]') {
      try {
        const eventData = JSON.parse(dataPayload);
        const messageType = event || eventData.event || eventData.type || 'message';
        const chunk = extractAgentChunkFromEvent(messageType, eventData);
        const pc = extractPointsCost(eventData);
        if (pc !== undefined) pointsCost = pc;
        if (chunk.text) answer += chunk.text;
      } catch {
        answer += dataPayload;
      }
    }
  }

  if (!String(answer).trim()) {
    const err = new Error('Empty answer from agent stream');
    err.streamHint = buffer.trim()
      ? `tail:${buffer.slice(-Math.min(800, buffer.length))}`
      : 'no_sse_text_extracted';
    throw err;
  }

  return { answer: String(answer).trim(), pointsCost };
}

function isAgentRouteOk(json) {
  if (!json || typeof json !== 'object') return false;
  if (json.success === false) return false;
  const code = json.code;
  return code === undefined || code === 0 || code === 200;
}

/**
 * @param {object | null} json
 * @returns {{
 *   command: string;
 *   coinSymbol: string | null;
 *   confidence: number | null;
 *   reason: string;
 *   language: string;
 *   fallbackText: string | null;
 * } | null}
 */
function parseAgentRouteData(json) {
  if (!json || typeof json !== 'object') return null;
  const data = json.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const confidenceRaw = Number(data.confidence);
  const coinRaw = data.coin_symbol ?? data.coinSymbol ?? null;
  return {
    command: String(data.command || '').trim(),
    coinSymbol:
      coinRaw != null && String(coinRaw).trim() ? String(coinRaw).trim().toUpperCase() : null,
    confidence: Number.isFinite(confidenceRaw) ? confidenceRaw : null,
    reason: data.reason != null ? String(data.reason).trim() : '',
    language: data.language != null ? String(data.language).trim() : '',
    fallbackText:
      data.fallback_text != null && String(data.fallback_text).trim()
        ? String(data.fallback_text).trim()
        : data.fallbackText != null && String(data.fallbackText).trim()
          ? String(data.fallbackText).trim()
          : null,
  };
}

/**
 * POST /ai/agent/route：body `{ message }`；识别用户意图（command、币种等）
 * @param {{
 *   url?: string;
 *   apiBaseUrl?: string;
 *   message: string;
 *   auth?: string;
 *   appUrl?: string;
 *   timeoutMs?: number;
 * }} opts
 * @returns {Promise<{
 *   ok: boolean;
 *   status: number;
 *   json: object | null;
 *   text: string;
 *   route: ReturnType<typeof parseAgentRouteData>;
 *   errorMessage: string | null;
 * }>}
 */
async function postAgentRoute({
  url,
  apiBaseUrl = '',
  message,
  auth = '',
  appUrl = '',
  timeoutMs = 15000,
}) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const endpoint = String(url || '').trim() || `${base}/ai/agent/route`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const app = String(appUrl || '').replace(/\/+$/, '');
  const rawAuth = String(auth || '').trim().replace(/^Bearer\s+/i, '');
  const headers = {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent': DEFAULT_UA,
  };
  if (rawAuth) {
    headers.authentication = rawAuth;
  }
  if (app) {
    headers.origin = app;
    headers.referer = `${app}/ai`;
  }
  const body = { message: String(message ?? '').trim() };
  apiDebug('POST /ai/agent/route ←', {
    url: endpoint,
    hasAuth: Boolean(rawAuth),
    messagePreview: body.message.slice(0, 160),
  });
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const route = parseAgentRouteData(json);
    const out = {
      ok: res.status === 200 && isAgentRouteOk(json) && route != null,
      status: res.status,
      json,
      text,
      route,
      errorMessage: parseApiErrorMessage(json),
    };
    apiDebug('POST /ai/agent/route →', {
      httpStatus: res.status,
      ok: out.ok,
      command: route?.command ?? null,
      coinSymbol: route?.coinSymbol ?? null,
      confidence: route?.confidence ?? null,
      reason: route?.reason ?? null,
      language: route?.language ?? null,
      fallbackText: route?.fallbackText ?? null,
      errorMessage: out.errorMessage,
      bodyPreview: text.slice(0, 500),
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

/**
 * POST /ai/agent/stream：body `{ request_id, type, message }`；需用户 JWT
 * @param {{ url: string; message: string; type: 'analyze'|'chat'|'bigorder'|'signals'; auth: string; appUrl?: string; timeoutMs?: number }} opts
 * @returns {Promise<{ answer: string, pointsCost?: number }>}
 */
async function requestAgentStream({ url, message, type, auth, appUrl = '', timeoutMs = 300000 }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const app = String(appUrl || '').replace(/\/+$/, '');
  const rawAuth = String(auth || '').trim().replace(/^Bearer\s+/i, '');

  const headers = {
    accept: 'text/event-stream',
    'content-type': 'application/json',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent': DEFAULT_UA,
  };
  if (rawAuth) {
    headers.authentication = rawAuth;
  }
  if (app) {
    headers.origin = app;
    headers.referer = `${app}/ai`;
  }

  const payload = {
    request_id: createAgentRequestId(),
    type,
    message,
  };

  apiDebug('POST ai/agent/stream ←', {
    url,
    type,
    hasAuth: Boolean(rawAuth),
    messagePreview: typeof message === 'string' ? message.slice(0, 160) : undefined,
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });

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
      const err = new Error(`Agent stream HTTP ${res.status}`);
      err.status = res.status;
      err.userMessage = userMessage;
      err.rawBody = raw.slice(0, 500);
      throw err;
    }

    const result = await consumeAgentSseStream(res, ctrl.signal);
    apiDebug('POST ai/agent/stream → ok', {
      type,
      answerChars: result.answer.length,
      pointsCost: result.pointsCost ?? null,
    });
    return result;
  } catch (err) {
    const aborted =
      err?.name === 'AbortError' ||
      /aborted|AbortError|signal is aborted/i.test(String(err?.message || ''));
    apiDebug('POST ai/agent/stream → failed', {
      type,
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
 * POST …/bigorder/v1/chat：body `{ message, lang }`；需用户 JWT（authentication 头）
 * @param {{ url: string; message: string; lang: string; auth: string; appUrl?: string; timeoutMs?: number }} opts
 * @returns {Promise<{ answer: string, pointsCost?: number }>}
 */
async function requestBigorderStream({ url, message, lang, auth, appUrl = '', timeoutMs = 300000 }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const app = String(appUrl || '').replace(/\/+$/, '');
  const langNorm = lang === 'zh' || lang === 'en' ? lang : 'en';
  const rawAuth = String(auth || '').trim().replace(/^Bearer\s+/i, '');

  const headers = {
    accept: 'text/event-stream',
    'accept-language': langNorm,
    'content-type': 'application/json',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    language: langNorm,
    'user-agent': DEFAULT_UA,
  };
  if (rawAuth) {
    headers.authentication = rawAuth;
  }
  if (app) {
    headers.origin = app;
    headers.referer = `${app}/ai`;
  }

  const payload = { message, lang: langNorm };

  apiDebug('POST bigorder/v1/chat ←', {
    url,
    lang: langNorm,
    hasAuth: Boolean(rawAuth),
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
    const likelySse = ct.includes('text/event-stream') || /\/chat\b/i.test(url);

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
      const err = new Error(`Bigorder stream HTTP ${res.status}`);
      err.status = res.status;
      err.userMessage = userMessage;
      err.rawBody = raw.slice(0, 500);
      throw err;
    }

    if (likelySse) {
      const result = await consumeSseStream(res, ctrl.signal, { extractChunk: extractBigorderChunk });
      apiDebug('POST bigorder/v1/chat → ok', {
        mode: 'sse',
        answerChars: result.answer.length,
      });
      return result;
    }

    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      apiDebug('POST bigorder/v1/chat → invalid_json', { bodyPreview: raw.slice(0, 400) });
      throw new Error('Invalid JSON from bigorder stream');
    }

    const answer =
      (typeof data.answer === 'string' && data.answer) ||
      (typeof data.content === 'string' && data.content) ||
      (typeof data.text === 'string' && data.text) ||
      (typeof data.message === 'string' && data.message) ||
      extractBigorderChunk(data);

    if (!String(answer).trim()) {
      apiDebug('POST bigorder/v1/chat → empty_answer', {
        jsonKeys: data && typeof data === 'object' ? Object.keys(data) : [],
      });
      throw new Error('Empty answer from bigorder stream');
    }

    apiDebug('POST bigorder/v1/chat → ok', {
      mode: 'json',
      answerChars: String(answer).trim().length,
    });
    return { answer: String(answer).trim() };
  } catch (err) {
    const aborted =
      err?.name === 'AbortError' ||
      /aborted|AbortError|signal is aborted/i.test(String(err?.message || ''));
    apiDebug('POST bigorder/v1/chat → failed', {
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

// --- POST /user/tg/queryInviteCode（按 telegramId 查询邀请码）------------------

/**
 * @param {object | null} json
 * @returns {string | null}
 */
function parseQueryInviteCodeResult(json) {
  if (!json || typeof json !== 'object') return null;
  const c = json.code;
  if (c !== undefined && c !== 0 && c !== 200) return null;
  const d = json.data;
  if (typeof d === 'string' && d.trim()) return d.trim();
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    const code =
      d.inviteCode ?? d.invite_code ?? d.code ?? d.invitationCode ?? d.invitation_code;
    if (code != null && String(code).trim()) return String(code).trim();
  }
  const top = json.inviteCode ?? json.invite_code;
  if (top != null && String(top).trim()) return String(top).trim();
  return null;
}

function logQueryInviteCodeResponse() {}

/**
 * @param {{ apiBaseUrl: string; telegramId: string | number; auth?: string; appUrl?: string; timeoutMs?: number }} opts
 * @returns {Promise<{ ok: boolean; status: number; json: object | null; text: string; inviteCode: string | null }>}
 */
async function postTgQueryInviteCode({
  apiBaseUrl,
  telegramId,
  auth = '',
  appUrl = '',
  timeoutMs = 15000,
}) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const app = String(appUrl || '').replace(/\/+$/, '');
  const url = `${base}/user/tg/queryInviteCode`;
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
  const body = { telegramId: String(telegramId) };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const inviteCode = parseQueryInviteCodeResult(json);
    const out = { ok: res.ok, status: res.status, json, text, inviteCode };
    logQueryInviteCodeResponse({
      telegramId: body.telegramId,
      status: res.status,
      ok: res.ok,
      json,
      text,
      inviteCode,
    });
    apiDebug('POST /user/tg/queryInviteCode →', {
      telegramId: body.telegramId,
      httpStatus: res.status,
      ok: res.ok,
      hasAuth: Boolean(auth),
      inviteCode: inviteCode ?? null,
      bodyPreview: text.slice(0, 500),
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

// --- POST /user/tg/group-referrer/pending（bot 入群记录拉群人）-----------------

/**
 * @param {{
 *   apiBaseUrl: string;
 *   chatId: string | number;
 *   adderTelegramId: string | number;
 *   chatTitle?: string;
 *   botUsername?: string;
 *   auth?: string;
 *   appUrl?: string;
 *   timeoutMs?: number;
 * }} opts
 * @returns {Promise<{ ok: boolean; status: number; json: object | null; text: string }>}
 */
async function postGroupReferrerPending({
  apiBaseUrl,
  chatId,
  adderTelegramId,
  chatTitle = '',
  botUsername = '',
  auth = '',
  appUrl = '',
  timeoutMs = 15000,
}) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const app = String(appUrl || '').replace(/\/+$/, '');
  const url = `${base}/user/tg/group-referrer/pending`;
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
  const body = {
    chatId: String(chatId),
    adderTelegramId: String(adderTelegramId),
    chatTitle: String(chatTitle || ''),
    botUsername: String(botUsername || '').replace(/^@/, ''),
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
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
    apiDebug('POST /user/tg/group-referrer/pending →', {
      chatId: body.chatId,
      adderTelegramId: body.adderTelegramId,
      httpStatus: res.status,
      ok: res.ok,
      bodyPreview: text.slice(0, 500),
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

// --- GET /user/tg/group-referrer?chatId=（查询群推广人记录）--------------------

/**
 * @param {object | null} json
 * @returns {{ adderTelegramId: string; status?: string; inviteCode?: string; rawUrl?: string } | null}
 */
function parseGroupReferrerGetResult(json) {
  if (!json || typeof json !== 'object') return null;
  const c = json.code;
  if (c !== undefined && c !== 0 && c !== 200) return null;
  const d = json.data;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const adder = d.adderTelegramId ?? d.adder_telegram_id;
  if (adder == null || !String(adder).trim()) return null;
  return {
    adderTelegramId: String(adder).trim(),
    status: d.status != null ? String(d.status) : undefined,
    inviteCode:
      d.inviteCode != null
        ? String(d.inviteCode).trim()
        : d.invite_code != null
          ? String(d.invite_code).trim()
          : undefined,
    rawUrl: d.rawUrl != null ? String(d.rawUrl).trim() : d.raw_url != null ? String(d.raw_url).trim() : undefined,
  };
}

/**
 * @param {{ apiBaseUrl: string; chatId: string | number; auth?: string; appUrl?: string; timeoutMs?: number }} opts
 * @returns {Promise<{ ok: boolean; status: number; json: object | null; text: string; referrer: ReturnType<typeof parseGroupReferrerGetResult> }>}
 */
async function getGroupReferrer({ apiBaseUrl, chatId, auth = '', appUrl = '', timeoutMs = 15000 }) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const app = String(appUrl || '').replace(/\/+$/, '');
  const q = new URLSearchParams({ chatId: String(chatId) });
  const url = `${base}/user/tg/group-referrer?${q.toString()}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers = {
    accept: 'application/json, text/plain, */*',
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
    const res = await fetch(url, { method: 'GET', headers, signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const referrer = parseGroupReferrerGetResult(json);
    const out = { ok: res.ok, status: res.status, json, text, referrer };
    apiDebug('GET /user/tg/group-referrer →', {
      chatId: String(chatId),
      httpStatus: res.status,
      ok: res.ok,
      hasReferrer: Boolean(referrer),
      bodyPreview: text.slice(0, 500),
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

// --- POST /user/tg/group-referrer/bind（绑定群推广 inviteCode）-----------------

/**
 * @param {object | null} json
 * @returns {string | null}
 */
function parseApiErrorMessage(json) {
  if (!json || typeof json !== 'object') return null;
  const m = json.message ?? json.msg ?? json.error ?? json.errorMsg;
  if (m != null && String(m).trim()) return String(m).trim();
  return null;
}

/**
 * @param {{
 *   apiBaseUrl: string;
 *   chatId: string | number;
 *   binderTelegramId: string | number;
 *   inviteCode: string;
 *   rawUrl?: string;
 *   auth?: string;
 *   appUrl?: string;
 *   timeoutMs?: number;
 * }} opts
 * @returns {Promise<{ ok: boolean; status: number; json: object | null; text: string; errorMessage: string | null }>}
 */
async function postGroupReferrerBind({
  apiBaseUrl,
  chatId,
  binderTelegramId,
  inviteCode,
  rawUrl = '',
  auth = '',
  appUrl = '',
  timeoutMs = 15000,
}) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const app = String(appUrl || '').replace(/\/+$/, '');
  const url = `${base}/user/tg/group-referrer/bind`;
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
  const body = {
    chatId: String(chatId),
    binderTelegramId: String(binderTelegramId),
    inviteCode: String(inviteCode),
    rawUrl: String(rawUrl || ''),
    referrerTelegramId: String(binderTelegramId),
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const codeOk =
      json && typeof json === 'object' && (json.code === undefined || json.code === 0 || json.code === 200);
    const out = {
      ok: res.ok && codeOk,
      status: res.status,
      json,
      text,
      errorMessage: parseApiErrorMessage(json),
    };
    apiDebug('POST /user/tg/group-referrer/bind →', {
      chatId: body.chatId,
      binderTelegramId: body.binderTelegramId,
      inviteCode: body.inviteCode,
      httpStatus: res.status,
      ok: out.ok,
      bodyPreview: text.slice(0, 500),
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

// --- POST /tg/chat/save、GET /tg/chat/get（群内提问缓存，TTL 10min）----------------

/**
 * @param {{ apiBaseUrl: string; groupId: number | string; telegramId: string | number; question: string; command?: 'ai' | 'chat' | 'bigorder' | string; timeoutMs?: number }} opts
 * @returns {Promise<{ ok: boolean; status: number; json: object | null; text: string }>}
 */
async function postTgChatSave({
  apiBaseUrl,
  groupId,
  telegramId,
  question,
  command = 'chat',
  timeoutMs = 15000,
}) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const url = `${base}/tg/chat/save`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'user-agent': DEFAULT_UA,
      },
      body: JSON.stringify({
        groupId: Number(groupId),
        telegramId: String(telegramId),
        question: String(question || ''),
        command: normalizeTgChatCommand(command),
      }),
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
    apiDebug('POST /tg/chat/save →', {
      telegramId: String(telegramId),
      groupId,
      httpStatus: res.status,
      ok: res.ok,
      bodyPreview: text.slice(0, 300),
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {{ apiBaseUrl: string; telegramId: string | number; timeoutMs?: number }} opts
 * @returns {Promise<{ ok: boolean; status: number; json: Array<{ groupId: number; question: string }> | object | null; text: string }>}
 */
async function getTgChatGet({ apiBaseUrl, telegramId, timeoutMs = 15000 }) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const q = new URLSearchParams({ telegramId: String(telegramId) });
  const url = `${base}/tg/chat/get?${q.toString()}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json, text/plain, */*',
        'user-agent': DEFAULT_UA,
      },
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
    apiDebug('GET /tg/chat/get →', {
      telegramId: String(telegramId),
      httpStatus: res.status,
      ok: res.ok,
      count: Array.isArray(json) ? json.length : null,
      bodyPreview: text.slice(0, 500),
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {{ apiBaseUrl: string; telegramId: string | number; groupId: number | string; timeoutMs?: number }} opts
 */
async function postTgChatRemove({ apiBaseUrl, telegramId, groupId, timeoutMs = 15000 }) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const q = new URLSearchParams({
    telegramId: String(telegramId),
    groupId: String(groupId),
  });
  const url = `${base}/tg/chat/remove?${q.toString()}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        accept: 'application/json, text/plain, */*',
        'user-agent': DEFAULT_UA,
      },
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json, text };
  } finally {
    clearTimeout(t);
  }
}

// --- POST /coinDirectionGuess/publish（涨跌竞猜发布登记）-----------------------

/**
 * @param {object | null} json
 * @returns {boolean}
 */
function isCoinDirectionGuessPublishOk(json) {
  if (!json || typeof json !== 'object') return false;
  if (json.success === false) return false;
  const code = json.code;
  return code === undefined || code === 0 || code === 200;
}

/**
 * @param {object | null} json
 * @returns {string | null}
 */
function parseCoinDirectionGuessNo(json) {
  if (!json || typeof json !== 'object') return null;
  const direct = json.guessNo ?? json.guess_no;
  if (direct != null && String(direct).trim()) return String(direct).trim();
  const data = json.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data && typeof data === 'object') {
    const nested = data.guessNo ?? data.guess_no;
    if (nested != null && String(nested).trim()) return String(nested).trim();
  }
  return null;
}

/**
 * 竞猜接口时间字段：无时区的 ISO 字符串按 Asia/Shanghai（+08:00）解析
 * @param {string | number | null | undefined} value
 * @returns {number | null}
 */
function parseGuessDateTimeMs(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const n = Number(raw);
  if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw);
  const isoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw);
  if (isoDateTime && !hasTz) {
    const base = raw.replace(/\.\d+$/, '');
    const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(base)
      ? base
      : `${base}:00`;
    const parsed = Date.parse(`${withSeconds}+08:00`);
    if (Number.isFinite(parsed)) return parsed;
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * @param {object | null | undefined} data
 * @returns {string | number | null}
 */
function parseGuessBetEndAt(data) {
  if (!data || typeof data !== 'object') return null;
  const raw = data.betEndAt ?? data.bet_end_at ?? null;
  if (raw == null || String(raw).trim() === '') return null;
  return raw;
}

/**
 * @param {object | null | undefined} data
 * @returns {string | number | null}
 */
function parseGuessStartAt(data) {
  if (!data || typeof data !== 'object') return null;
  const raw = data.startAt ?? data.start_at ?? null;
  if (raw == null || String(raw).trim() === '') return null;
  return raw;
}

/**
 * 从竞猜 item 提取时间字段补丁（startAt→lockedAtMs, betEndAt）
 * @param {object | null | undefined} item
 * @returns {{ lockedAtMs?: number; betEndAt?: string | number }}
 */
function buildGuessTimeFieldsPatch(item) {
  const patch = {};
  if (!item || typeof item !== 'object') return patch;
  const startMs = parseGuessDateTimeMs(parseGuessStartAt(item));
  if (startMs != null) patch.lockedAtMs = startMs;
  const betEndAt = parseGuessBetEndAt(item);
  if (betEndAt != null) patch.betEndAt = betEndAt;
  return patch;
}

/**
 * @param {object | null} json
 * @returns {{
 *   guessNo: string | null;
 *   nickName: string | null;
 *   avatar: string | null;
 *   startAt: string | number | null;
 *   endAt: string | number | null;
 *   betEndAt: string | number | null;
 * }}
 */
function parseCoinDirectionGuessPublishData(json) {
  const guessNo = parseCoinDirectionGuessNo(json);
  if (!json || typeof json !== 'object') {
    return { guessNo, nickName: null, avatar: null, startAt: null, endAt: null, betEndAt: null };
  }
  const data =
    json.data != null && typeof json.data === 'object'
      ? json.data
      : json;
  const nickName = data.nickName ?? data.nickname ?? data.nick_name ?? null;
  const avatar = data.avatar ?? data.avatarUrl ?? data.avatar_url ?? null;
  const startAt = parseGuessStartAt(data);
  const endAt = data.endAt ?? data.end_at ?? null;
  const betEndAt = parseGuessBetEndAt(data);
  return {
    guessNo,
    nickName: nickName != null && String(nickName).trim() ? String(nickName).trim() : null,
    avatar: avatar != null && String(avatar).trim() ? String(avatar).trim() : null,
    startAt,
    endAt: endAt != null && String(endAt).trim() ? endAt : null,
    betEndAt,
  };
}

function isCoinDirectionGuessBindMessageOk(json) {
  if (!json || typeof json !== 'object') return false;
  if (json.success === false) return false;
  const code = json.code;
  return code === undefined || code === 0 || code === 200;
}

/**
 * POST /coinDirectionGuess/publish
 * @param {{
 *   apiBaseUrl: string;
 *   auth?: string;
 *   appUrl?: string;
 *   groupId: number;
 *   symbol: string;
 *   duration: number;
 *   title: string;
 *   path?: string;
 *   timeoutMs?: number;
 * }} opts
 * @returns {Promise<{ ok: boolean; status: number; json: object | null; text: string; errorMessage: string | null }>}
 */
async function postCoinDirectionGuessPublish({
  apiBaseUrl,
  auth = '',
  appUrl = '',
  groupId,
  symbol,
  duration,
  title,
  path = 'coinDirectionGuess/publish',
  timeoutMs = 15000,
}) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const app = String(appUrl || '').replace(/\/+$/, '');
  const rel = String(path || 'coinDirectionGuess/publish').trim().replace(/^\/+/, '');
  const url = `${base}/${rel}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers = {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent': DEFAULT_UA,
  };
  const rawAuth = String(auth || '').trim().replace(/^Bearer\s+/i, '');
  if (rawAuth) {
    headers.authentication = rawAuth;
  }
  if (app) {
    headers.referer = `${app}/`;
  }
  const body = {
    groupId: Number(groupId),
    symbol: String(symbol || '').trim().toUpperCase(),
    duration: Math.max(1, Math.floor(Number(duration) || 0)),
    title: String(title || '').trim(),
  };
  apiDebug('POST /coinDirectionGuess/publish ←', {
    url,
    groupId: body.groupId,
    symbol: body.symbol,
    duration: body.duration,
    titlePreview: body.title.slice(0, 80),
    hasAuthenticationHeader: Boolean(rawAuth),
  });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const bizOk = isCoinDirectionGuessPublishOk(json);
    const guessNo = parseCoinDirectionGuessNo(json);
    const publishData = parseCoinDirectionGuessPublishData(json);
    const out = {
      ok: res.status === 200 && bizOk,
      status: res.status,
      json,
      text,
      guessNo,
      publishData,
      errorMessage: parseApiErrorMessage(json),
    };
    apiDebug('POST /coinDirectionGuess/publish →', {
      groupId: body.groupId,
      symbol: body.symbol,
      duration: body.duration,
      httpStatus: res.status,
      ok: out.ok,
      guessNo,
      nickName: publishData.nickName,
      hasAvatar: Boolean(publishData.avatar),
      endAt: publishData.endAt,
      betEndAt: publishData.betEndAt,
      startAt: publishData.startAt,
      jsonCode: json && typeof json === 'object' ? json.code : null,
      errorMessage: out.errorMessage,
      bodyPreview: text.slice(0, 500),
    });
    guessApiLog('POST /coinDirectionGuess/publish →', {
      httpStatus: res.status,
      ok: out.ok,
      guessNo,
      publishData,
      json,
      rawText: text,
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

/**
 * POST /coinDirectionGuess/bindMessage
 * @param {{
 *   apiBaseUrl: string;
 *   auth?: string;
 *   appUrl?: string;
 *   guessNo: string;
 *   tgMessageId: number;
 *   path?: string;
 *   timeoutMs?: number;
 * }} opts
 * @returns {Promise<{ ok: boolean; status: number; json: object | null; text: string; errorMessage: string | null }>}
 */
async function postCoinDirectionGuessBindMessage({
  apiBaseUrl,
  auth = '',
  appUrl = '',
  guessNo,
  tgMessageId,
  path = 'coinDirectionGuess/bindMessage',
  timeoutMs = 15000,
}) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const app = String(appUrl || '').replace(/\/+$/, '');
  const rel = String(path || 'coinDirectionGuess/bindMessage').trim().replace(/^\/+/, '');
  const url = `${base}/${rel}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers = {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent': DEFAULT_UA,
  };
  const rawAuth = String(auth || '').trim().replace(/^Bearer\s+/i, '');
  if (rawAuth) {
    headers.authentication = rawAuth;
  }
  if (app) {
    headers.referer = `${app}/`;
  }
  const body = {
    guessNo: String(guessNo || '').trim(),
    tgMessageId: Math.floor(Number(tgMessageId)),
  };
  apiDebug('POST /coinDirectionGuess/bindMessage ←', {
    url,
    guessNo: body.guessNo,
    tgMessageId: body.tgMessageId,
    hasAuthenticationHeader: Boolean(rawAuth),
  });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const bizOk = isCoinDirectionGuessBindMessageOk(json);
    const out = {
      ok: res.status === 200 && bizOk,
      status: res.status,
      json,
      text,
      errorMessage: parseApiErrorMessage(json),
    };
    apiDebug('POST /coinDirectionGuess/bindMessage →', {
      guessNo: body.guessNo,
      tgMessageId: body.tgMessageId,
      httpStatus: res.status,
      ok: out.ok,
      jsonCode: json && typeof json === 'object' ? json.code : null,
      errorMessage: out.errorMessage,
      bodyPreview: text.slice(0, 500),
    });
    guessApiLog('POST /coinDirectionGuess/bindMessage →', {
      httpStatus: res.status,
      ok: out.ok,
      guessNo: body.guessNo,
      tgMessageId: body.tgMessageId,
      json,
      rawText: text,
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

function isCoinDirectionGuessBetOk(json) {
  if (!json || typeof json !== 'object') return false;
  if (json.success === false) return false;
  const code = json.code;
  return code === undefined || code === 0 || code === 200;
}

/**
 * @param {object | null} json
 * @returns {string | null}
 */
function parseDatainfoUserId(json) {
  if (!json || typeof json !== 'object') return null;
  let data = json.data;
  if (data && typeof data === 'object' && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    data = data.data;
  }
  const profile = data && typeof data === 'object' && !Array.isArray(data) ? data : json;
  const raw = profile.userId ?? profile.user_id ?? profile.uid ?? profile.id;
  if (raw == null || !String(raw).trim()) return null;
  return String(raw).trim();
}

/**
 * POST /coinDirectionGuess/bet
 * @param {{
 *   apiBaseUrl: string;
 *   auth?: string;
 *   appUrl?: string;
 *   guessNo: string;
 *   userId: string;
 *   choice: 1 | 2;
 *   betAmount: number;
 *   path?: string;
 *   timeoutMs?: number;
 * }} opts
 */
async function postCoinDirectionGuessBet({
  apiBaseUrl,
  auth = '',
  appUrl = '',
  guessNo,
  userId,
  choice,
  betAmount,
  path = 'coinDirectionGuess/bet',
  timeoutMs = 15000,
}) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const app = String(appUrl || '').replace(/\/+$/, '');
  const rel = String(path || 'coinDirectionGuess/bet').trim().replace(/^\/+/, '');
  const url = `${base}/${rel}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers = {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent': DEFAULT_UA,
  };
  const rawAuth = String(auth || '').trim().replace(/^Bearer\s+/i, '');
  if (rawAuth) {
    headers.authentication = rawAuth;
  }
  if (app) {
    headers.referer = `${app}/`;
  }
  const body = {
    guessNo: String(guessNo || '').trim(),
    userId: String(userId || '').trim(),
    choice: Number(choice) === 2 ? 2 : 1,
    betAmount: Math.max(1, Math.floor(Number(betAmount) || 0)),
  };
  apiDebug('POST /coinDirectionGuess/bet ←', {
    url,
    guessNo: body.guessNo,
    userId: body.userId,
    choice: body.choice,
    betAmount: body.betAmount,
    hasAuthenticationHeader: Boolean(rawAuth),
  });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const bizOk = isCoinDirectionGuessBetOk(json);
    const out = {
      ok: res.status === 200 && bizOk,
      status: res.status,
      json,
      text,
      errorMessage: parseApiErrorMessage(json),
    };
    apiDebug('POST /coinDirectionGuess/bet →', {
      guessNo: body.guessNo,
      userId: body.userId,
      choice: body.choice,
      betAmount: body.betAmount,
      httpStatus: res.status,
      ok: out.ok,
      jsonCode: json && typeof json === 'object' ? json.code : null,
      errorMessage: out.errorMessage,
      bodyPreview: text.slice(0, 500),
    });
    guessApiLog('POST /coinDirectionGuess/bet →', {
      httpStatus: res.status,
      ok: out.ok,
      guessNo: body.guessNo,
      userId: body.userId,
      choice: body.choice,
      betAmount: body.betAmount,
      json,
      rawText: text,
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

function isCoinDirectionGuessListOk(json) {
  if (!json || typeof json !== 'object') return false;
  if (json.success === false) return false;
  const code = json.code;
  return code === undefined || code === 0 || code === 200;
}

/**
 * @param {object | null} json
 * @returns {object[]}
 */
function parseCoinDirectionGuessList(json) {
  if (!json || typeof json !== 'object') return [];
  const data = json.data;
  if (!Array.isArray(data)) return [];
  return data.filter((item) => item && typeof item === 'object');
}

/**
 * GET /coinDirectionGuess/list?groupId=
 * @param {{
 *   apiBaseUrl: string;
 *   groupId: number | string;
 *   appUrl?: string;
 *   path?: string;
 *   timeoutMs?: number;
 * }} opts
 */
async function getCoinDirectionGuessList({
  apiBaseUrl,
  groupId,
  appUrl = '',
  path = 'coinDirectionGuess/list',
  timeoutMs = 15000,
}) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const app = String(appUrl || '').replace(/\/+$/, '');
  const rel = String(path || 'coinDirectionGuess/list').trim().replace(/^\/+/, '');
  const q = new URLSearchParams({ groupId: String(groupId) });
  const url = `${base}/${rel}?${q.toString()}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers = {
    accept: 'application/json, text/plain, */*',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent': DEFAULT_UA,
  };
  if (app) {
    headers.referer = `${app}/`;
  }
  apiDebug('GET /coinDirectionGuess/list ←', { url, groupId: String(groupId) });
  try {
    const res = await fetch(url, { method: 'GET', headers, signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const bizOk = isCoinDirectionGuessListOk(json);
    const out = {
      ok: res.status === 200 && bizOk,
      status: res.status,
      json,
      text,
      items: parseCoinDirectionGuessList(json),
      errorMessage: parseApiErrorMessage(json),
    };
    apiDebug('GET /coinDirectionGuess/list →', {
      groupId: String(groupId),
      httpStatus: res.status,
      ok: out.ok,
      count: out.items.length,
      errorMessage: out.errorMessage,
      bodyPreview: text.slice(0, 500),
    });
    guessApiLog('GET /coinDirectionGuess/list →', {
      httpStatus: res.status,
      ok: out.ok,
      groupId: String(groupId),
      count: out.items.length,
      items: out.items,
      json,
      rawText: text,
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {object | null | undefined} row
 * @returns {{
 *   userId: string;
 *   nickName: string;
 *   avatar: string;
 *   choice: 1 | 2;
 *   betAmount: number;
 *   payout: number | null;
 *   createdAt: string | number | null;
 * } | null}
 */
function parseGuessVoteItem(row) {
  if (!row || typeof row !== 'object') return null;
  const choice = Math.floor(Number(row.choice));
  if (choice !== 1 && choice !== 2) return null;
  const betAmount = Math.max(0, Math.floor(Number(row.betAmount) || 0));
  const payoutRaw = row.payout;
  let payout = null;
  if (payoutRaw != null && payoutRaw !== '') {
    const n = Math.floor(Number(payoutRaw));
    if (Number.isFinite(n)) payout = n;
  }
  return {
    userId: String(row.userId || '').trim(),
    nickName: String(row.nickName ?? row.nickname ?? '').trim(),
    avatar: String(row.avatar || '').trim(),
    choice: /** @type {1 | 2} */ (choice),
    betAmount,
    payout,
    createdAt: row.createdAt ?? row.created_at ?? null,
  };
}

/**
 * @param {object | null | undefined} data detail 响应 data
 * @returns {ReturnType<typeof parseGuessVoteItem>[]}
 */
function parseGuessVotes(data) {
  if (!data || typeof data !== 'object') return [];
  const votes = data.votes;
  if (!Array.isArray(votes)) return [];
  return votes.map(parseGuessVoteItem).filter(Boolean);
}

/**
 * @param {object | null} json
 * @returns {{ item: object; votes: ReturnType<typeof parseGuessVoteItem>[] } | null}
 */
function parseCoinDirectionGuessDetail(json) {
  if (!json || typeof json !== 'object') return null;
  const data = json.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return {
    item: data,
    votes: parseGuessVotes(data),
  };
}

/**
 * GET /coinDirectionGuess/detail?guessNo=
 * @param {{
 *   apiBaseUrl: string;
 *   guessNo: string;
 *   appUrl?: string;
 *   path?: string;
 *   timeoutMs?: number;
 * }} opts
 */
async function getCoinDirectionGuessDetail({
  apiBaseUrl,
  guessNo,
  appUrl = '',
  path = 'coinDirectionGuess/detail',
  timeoutMs = 15000,
}) {
  const base = String(apiBaseUrl || '').replace(/\/+$/, '');
  const app = String(appUrl || '').replace(/\/+$/, '');
  const rel = String(path || 'coinDirectionGuess/detail').trim().replace(/^\/+/, '');
  const guess = String(guessNo || '').trim();
  const q = new URLSearchParams({ guessNo: guess });
  const url = `${base}/${rel}?${q.toString()}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers = {
    accept: 'application/json, text/plain, */*',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent': DEFAULT_UA,
  };
  if (app) {
    headers.referer = `${app}/`;
  }
  apiDebug('GET /coinDirectionGuess/detail ←', { url, guessNo: guess });
  try {
    const res = await fetch(url, { method: 'GET', headers, signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const bizOk = isCoinDirectionGuessListOk(json);
    const parsed = parseCoinDirectionGuessDetail(json);
    const out = {
      ok: res.status === 200 && bizOk && parsed != null,
      status: res.status,
      json,
      text,
      item: parsed?.item ?? null,
      votes: parsed?.votes ?? [],
      errorMessage: parseApiErrorMessage(json),
    };
    apiDebug('GET /coinDirectionGuess/detail →', {
      guessNo: guess,
      httpStatus: res.status,
      ok: out.ok,
      statusField: out.item?.status ?? null,
      result: out.item?.result ?? null,
      voteCount: out.votes.length,
      errorMessage: out.errorMessage,
      bodyPreview: text.slice(0, 500),
    });
    guessApiLog('GET /coinDirectionGuess/detail →', {
      httpStatus: res.status,
      ok: out.ok,
      guessNo: guess,
      item: out.item,
      votes: out.votes,
      json,
      rawText: text,
    });
    return out;
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {object | null} json
 * @returns {{ up: number; down: number } | null}
 */
function parseGuessVoteCounts(json) {
  const stats = parseGuessBetStats(json);
  if (!stats) return null;
  return { up: stats.upCount, down: stats.downCount };
}

/**
 * @param {object | null | undefined} item
 * @returns {{
 *   upCount: number;
 *   downCount: number;
 *   upPoints: number;
 *   downPoints: number;
 *   upPercent: number | null;
 *   downPercent: number | null;
 * } | null}
 */
function parseGuessItemStats(item) {
  if (!item || typeof item !== 'object') return null;
  const upCount =
    Number(
      item.bullishCount ??
        item.bullCount ??
        item.upCount ??
        item.up_count ??
        item.upVotes ??
        item.upVoteCount ??
        0,
    ) || 0;
  const downCount =
    Number(
      item.bearishCount ??
        item.bearCount ??
        item.downCount ??
        item.down_count ??
        item.downVotes ??
        item.downVoteCount ??
        0,
    ) || 0;
  const upPoints =
    Number(
      item.bullishPool ??
        item.bullPoints ??
        item.upPoints ??
        item.up_points ??
        item.upBetAmount ??
        item.up_bet_amount ??
        0,
    ) || 0;
  const downPoints =
    Number(
      item.bearishPool ??
        item.bearPoints ??
        item.downPoints ??
        item.down_points ??
        item.downBetAmount ??
        item.down_bet_amount ??
        0,
    ) || 0;
  const upPercentRaw = item.upPercent ?? item.up_percent ?? item.bullPercent ?? item.bullishPercent;
  const downPercentRaw = item.downPercent ?? item.down_percent ?? item.bearPercent ?? item.bearishPercent;
  const upPercent =
    upPercentRaw != null && Number.isFinite(Number(upPercentRaw)) ? Math.round(Number(upPercentRaw)) : null;
  const downPercent =
    downPercentRaw != null && Number.isFinite(Number(downPercentRaw))
      ? Math.round(Number(downPercentRaw))
      : null;
  return { upCount, downCount, upPoints, downPoints, upPercent, downPercent };
}

/**
 * @param {object | null} json
 * @returns {{
 *   upCount: number;
 *   downCount: number;
 *   upPoints: number;
 *   downPoints: number;
 *   upPercent: number | null;
 *   downPercent: number | null;
 * } | null}
 */
function parseGuessBetStats(json) {
  if (!json || typeof json !== 'object') return null;
  const data = json.data;
  if (!data || typeof data !== 'object') return null;
  return parseGuessItemStats(data);
}

/**
 * @param {string | null | undefined} status
 * @returns {'active' | 'locked' | 'settled' | string}
 */
function normalizeGuessStatus(status) {
  const s = String(status ?? '').trim().toLowerCase();
  if (s === 'active') return 'active';
  if (s === 'locked') return 'locked';
  if (s === 'settled' || s === 'closed' || s === 'finished') return 'settled';
  return s || 'unknown';
}

/**
 * @param {object | string | null | undefined} itemOrStatus
 * @returns {boolean}
 */
function isGuessStatusActive(itemOrStatus) {
  const status =
    itemOrStatus && typeof itemOrStatus === 'object' ? itemOrStatus.status : itemOrStatus;
  return normalizeGuessStatus(status) === 'active';
}

/**
 * @param {object | string | null | undefined} itemOrStatus
 * @returns {boolean}
 */
function isGuessStatusLocked(itemOrStatus) {
  const status =
    itemOrStatus && typeof itemOrStatus === 'object' ? itemOrStatus.status : itemOrStatus;
  return normalizeGuessStatus(status) === 'locked';
}

/**
 * @param {object | null | undefined} item
 * @returns {boolean}
 */
function isGuessBettingAllowed(item) {
  return isGuessStatusActive(item);
}

/**
 * @param {object | null | undefined} item
 * @returns {'UP' | 'DOWN' | null}
 */
function parseGuessResult(item) {
  if (!item || typeof item !== 'object') return null;
  const r = String(item.result ?? item.direction ?? '').trim().toUpperCase();
  if (r === 'UP' || r === 'BULL' || r === 'BULLISH' || r === '1') return 'UP';
  if (r === 'DOWN' || r === 'BEAR' || r === 'BEARISH' || r === '2') return 'DOWN';
  return null;
}

/**
 * @param {object | null | undefined} item
 * @returns {boolean}
 */
function isGuessListItemSettled(item) {
  if (!item || typeof item !== 'object') return false;
  const status = normalizeGuessStatus(item.status);
  if (status === 'settled') return true;
  if (status === 'active' || status === 'locked') return false;
  return parseGuessResult(item) != null;
}

/**
 * 从 list/detail item 解析轮询用状态
 * @param {object | null | undefined} item
 * @returns {'active' | 'locked' | 'settled' | string}
 */
function resolveGuessPollStatus(item) {
  if (!item || typeof item !== 'object') return 'unknown';
  if (isGuessListItemSettled(item)) return 'settled';
  if (isGuessStatusLocked(item)) return 'locked';
  if (isGuessStatusActive(item)) return 'active';
  return normalizeGuessStatus(item.status) || 'unknown';
}

module.exports = {
  fetchDetailHeader,
  fetchSearchLastPriceChange,
  parseSearchLastPriceChangeResult,
  postTgRegisteredCheck,
  postTgChatSave,
  getTgChatGet,
  postTgChatRemove,
  postTgQueryInviteCode,
  parseQueryInviteCodeResult,
  postUserSessionTokenCheck,
  postTgLogin,
  fetchUserDatainfo,
  postPointsConsume,
  postGroupReferrerPending,
  getGroupReferrer,
  parseGroupReferrerGetResult,
  postGroupReferrerBind,
  postCoinDirectionGuessPublish,
  postCoinDirectionGuessBindMessage,
  postCoinDirectionGuessBet,
  getCoinDirectionGuessList,
  getCoinDirectionGuessDetail,
  parseCoinDirectionGuessNo,
  parseCoinDirectionGuessPublishData,
  parseGuessBetEndAt,
  parseGuessStartAt,
  buildGuessTimeFieldsPatch,
  parseGuessDateTimeMs,
  parseCoinDirectionGuessList,
  parseGuessVoteCounts,
  parseGuessBetStats,
  parseGuessItemStats,
  parseGuessResult,
  normalizeGuessStatus,
  isGuessStatusActive,
  isGuessStatusLocked,
  isGuessBettingAllowed,
  isGuessListItemSettled,
  resolveGuessPollStatus,
  parseGuessVotes,
  parseGuessVoteItem,
  parseCoinDirectionGuessDetail,
  parseDatainfoUserId,
  postAgentRoute,
  parseAgentRouteData,
  requestAgentStream,
  requestChatStream,
  requestBigorderStream,
  normalizeTgChatCommand,
  requestAiAnalysis,
};
