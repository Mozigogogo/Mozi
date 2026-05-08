/**
 * 调用自建流式分析接口 POST（默认 /v1/analyze/stream）
 *
 * Headers: Content-Type: application/json
 *         Accept: text/event-stream, application/json
 *         若配置了 AI_BACKEND_SECRET：Authorization: Bearer <secret>
 *
 * Body:
 *   question          string  用户问题（必填）
 *   telegramUserId    number  Telegram 用户 id
 *   telegramUsername  string | null
 *   chatId            number  当前会话 id
 *   chatType          string  private | group | supergroup | …
 *   languageCode      string  用户 language_code
 *
 * 成功 200：
 *   - text/event-stream：SSE，若干 data: 行；JSON 片段可含 OpenAI 风格 choices[0].delta.content，
 *     或 content / text / answer / message 等字符串字段；可选 pointsCost
 *   - application/json：与旧版一致，answer | content | text | message
 *
 * 失败：HTTP 错误或流内 JSON { error | message }；Bot 会尽量原样回复用户（HTML 转义）
 */

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
  for (const k of ['content', 'text', 'answer', 'message', 'token', 'delta']) {
    const v = obj[k];
    if (typeof v === 'string') return v;
  }
  if (obj.data && typeof obj.data === 'object') {
    return extractChunkText(obj.data);
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
    throw new Error('Empty answer from AI backend stream');
  }
  return { answer: String(answer).trim(), pointsCost };
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
      return await consumeSseStream(res, ctrl.signal);
    }

    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('Invalid JSON from AI backend');
    }

    const answer =
      (typeof data.answer === 'string' && data.answer) ||
      (typeof data.content === 'string' && data.content) ||
      (typeof data.text === 'string' && data.text) ||
      (typeof data.message === 'string' && data.message) ||
      '';

    if (!String(answer).trim()) {
      throw new Error('Empty answer from AI backend');
    }

    const pointsCost = extractPointsCost(data);

    return { answer: String(answer).trim(), pointsCost };
  } finally {
    clearTimeout(t);
  }
}

module.exports = { requestAiAnalysis };
