/**
 * POST /tg/chat/save、GET /tg/chat/get、DELETE /tg/chat/remove
 * POST /tg/chat/on-registered — 绑定/注册成功后立即触发群内重放（必接：H5 或后端在注册接口成功后调用）
 */

const http = require('http');
const {
  saveTgChatQuestion,
  getTgChatQuestions,
  removeTgChatQuestion,
} = require('../lib/tgChatQuestionStore');
const { notifyTgChatRegistered } = require('../lib/tgChatRegisterWatcher');

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(payload);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON body');
  }
}

/**
 * @param {{ port: number }} opts
 * @returns {import('http').Server}
 */
function startTgChatHttpServer({ port }) {
  const server = http.createServer(async (req, res) => {
    try {
      const host = req.headers.host || 'localhost';
      const url = new URL(req.url || '/', `http://${host}`);
      const path = url.pathname.replace(/\/+$/, '') || '/';

      if (req.method === 'POST' && path === '/tg/chat/save') {
        const body = await readJsonBody(req);
        saveTgChatQuestion({
          telegramId: body.telegramId,
          groupId: body.groupId,
          question: body.question,
          command: body.command,
        });
        sendJson(res, 200, { ok: true });
        return;
      }

      if (req.method === 'DELETE' && path === '/tg/chat/remove') {
        const telegramId = url.searchParams.get('telegramId');
        const groupId = url.searchParams.get('groupId');
        if (!telegramId?.trim() || groupId == null || groupId === '') {
          sendJson(res, 400, { ok: false, error: 'telegramId and groupId are required' });
          return;
        }
        removeTgChatQuestion(telegramId, groupId);
        sendJson(res, 200, { ok: true });
        return;
      }

      if (req.method === 'GET' && path === '/tg/chat/get') {
        const telegramId = url.searchParams.get('telegramId');
        if (!telegramId || !String(telegramId).trim()) {
          sendJson(res, 400, { ok: false, error: 'telegramId is required' });
          return;
        }
        const list = getTgChatQuestions(telegramId);
        sendJson(res, 200, list);
        return;
      }

      if (req.method === 'POST' && path === '/tg/chat/on-registered') {
        const body = await readJsonBody(req);
        const telegramId = body.telegramId;
        if (!telegramId || !String(telegramId).trim()) {
          sendJson(res, 400, { ok: false, error: 'telegramId is required' });
          return;
        }
        await notifyTgChatRegistered(telegramId, body.groupId);
        sendJson(res, 200, { ok: true });
        return;
      }

      sendJson(res, 404, { ok: false, error: 'Not Found' });
    } catch (err) {
      const msg = err?.message || 'Internal Server Error';
      const status = /required|Invalid JSON/i.test(msg) ? 400 : 500;
      sendJson(res, status, { ok: false, error: msg });
    }
  });

  server.listen(port);

  return server;
}

module.exports = { startTgChatHttpServer };
