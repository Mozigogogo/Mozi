'use strict';

const { postAgentRoute } = require('./apis');
const {
  executeChatCommand,
  executeAiCommand,
  executeBigorderCommand,
} = require('./agentCommandRunner');
const { runPriceCommand } = require('../handlers/price');
const { runBalanceCommand } = require('../handlers/balance');
const { executePredictCommand } = require('./predictFlow');
const { executeAlertCommand } = require('./alertFlow');
const { escapeHtml } = require('./telegramHtml');
const { apiDebug } = require('./debugLog');
const { agentRouteLog, agentRouteDebug } = require('./agentRouteDebug');
const { recordCommandUsageFromCtx } = require('./tgCommandUsage');

/** @typedef {{ command: string; message: string; coinSymbol: string | null; rawQuery: string }} AgentRouteDispatch */

/**
 * @param {string} command
 */
function normalizeRouteCommand(command) {
  const raw = String(command || '').trim().toLowerCase();
  if (!raw) return '';
  return raw.split(/\s+/)[0].replace(/^\//, '');
}

/**
 * @param {string} query
 * @param {string | null | undefined} coinSymbol
 */
function buildRoutedAgentMessage(query, coinSymbol) {
  const q = String(query || '').trim();
  if (!coinSymbol) return q;
  const sym = String(coinSymbol).trim().toUpperCase();
  if (!sym) return q;
  if (!q) return sym;
  if (new RegExp(`\\b${sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(q)) {
    return q;
  }
  return `${sym} ${q}`;
}

/**
 * @param {import('telegraf').MiddlewareFn} gate
 * @param {import('telegraf').Context} ctx
 * @returns {Promise<boolean>}
 */
async function runGate(gate, ctx) {
  let passed = false;
  await gate(ctx, async () => {
    passed = true;
  });
  return passed;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {(code?: string) => object} getTexts
 * @param {AgentRouteDispatch} dispatch
 */
async function dispatchAgentRoute(ctx, config, getTexts, dispatch) {
  const command = normalizeRouteCommand(dispatch.command);
  const message = String(dispatch.message || '').trim();
  const texts = getTexts(ctx.from?.language_code || 'en');

  apiDebug('agent.route.dispatch', {
    command,
    coinSymbol: dispatch.coinSymbol ?? null,
    messagePreview: message.slice(0, 120),
  });

  switch (command) {
    case 'chat':
      await executeChatCommand(ctx, config, texts, message);
      return;
    case 'ai':
      await executeAiCommand(ctx, config, texts, message);
      return;
    case 'bigorder':
      await executeBigorderCommand(ctx, config, texts, message);
      return;
    case 'price': {
      const symbol = dispatch.coinSymbol || message.split(/\s+/)[0] || 'BTC';
      await runPriceCommand(ctx, config, texts, symbol);
      return;
    }
    case 'balance':
      await runBalanceCommand(ctx, config, texts);
      return;
    case 'predict':
      await executePredictCommand(ctx, config, getTexts, message, dispatch.coinSymbol);
      return;
    case 'alert':
      await executeAlertCommand(ctx, config, getTexts, message, dispatch.coinSymbol);
      return;
    default:
      await ctx
        .reply(texts.agentRouteUnknownCommand(escapeHtml(command || dispatch.command || '—')), {
          parse_mode: 'HTML',
        })
        .catch(() => {});
  }
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {object} texts
 * @param {string} rawQuery
 * @returns {Promise<AgentRouteDispatch | null>}
 */
async function resolveAgentRouteDispatch(ctx, config, texts, rawQuery) {
  const query = String(rawQuery || '').trim();
  if (!query) {
    await ctx.reply(texts.agentRouteNeedQuestion, { parse_mode: 'HTML' }).catch(() => {});
    return null;
  }

  await ctx.telegram.sendChatAction(ctx.chat.id, 'typing').catch(() => {});

  agentRouteLog('request', {
    telegramId: ctx.from?.id ?? null,
    chatId: ctx.chat?.id ?? null,
    message: query,
  });

  let routeRes;
  try {
    routeRes = await postAgentRoute({
      url: config.AI_AGENT_ROUTE_URL,
      message: query,
      appUrl: config.APP_URL,
    });
  } catch (err) {
    agentRouteLog('error', { message: err?.message || String(err), query });
    await ctx.reply(texts.agentRouteFailed, { parse_mode: 'HTML' }).catch(() => {});
    return null;
  }

  agentRouteLog('response', {
    ok: routeRes.ok,
    httpStatus: routeRes.status,
    code: routeRes.json?.code ?? null,
    success: routeRes.json?.success ?? null,
    errorMsg: routeRes.json?.errorMsg ?? routeRes.errorMessage ?? null,
    data: routeRes.json?.data ?? null,
    route: routeRes.route,
    rawJson: routeRes.json ?? null,
  });

  agentRouteDebug('response.body', {
    body: routeRes.text?.slice(0, 2000) ?? null,
  });

  if (!routeRes.ok || !routeRes.route) {
    const detail = routeRes.errorMessage ? `：${escapeHtml(routeRes.errorMessage)}` : '';
    await ctx.reply(texts.agentRouteFailed + detail, { parse_mode: 'HTML' }).catch(() => {});
    return null;
  }

  const route = routeRes.route;
  if (route.fallbackText) {
    agentRouteLog('fallback', { fallbackText: route.fallbackText, route });
    await ctx.reply(escapeHtml(route.fallbackText), { parse_mode: 'HTML' }).catch(() => {});
    return null;
  }

  const command = normalizeRouteCommand(route.command);
  if (!command) {
    agentRouteLog('skip', { reason: 'empty_command', route });
    await ctx
      .reply(texts.agentRouteUnknownCommand(escapeHtml(route.command || '—')), { parse_mode: 'HTML' })
      .catch(() => {});
    return null;
  }

  return {
    command,
    message: buildRoutedAgentMessage(query, route.coinSymbol),
    coinSymbol: route.coinSymbol,
    rawQuery: query,
  };
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {Function} getTexts
 * @param {import('telegraf').MiddlewareFn} registeredGate
 * @param {import('telegraf').MiddlewareFn} loginGate
 * @param {string} rawQuery
 */
async function handleBotMentionRouted(ctx, config, getTexts, registeredGate, loginGate, rawQuery) {
  const languageCode = ctx.from?.language_code || 'en';
  const texts = getTexts(languageCode);
  const dispatch = await resolveAgentRouteDispatch(ctx, config, texts, rawQuery);
  if (!dispatch) return;

  recordCommandUsageFromCtx(ctx, dispatch.command, config);

  agentRouteLog('dispatch', {
    command: dispatch.command,
    message: dispatch.message,
    coinSymbol: dispatch.coinSymbol,
  });

  ctx.state.agentRouteDispatch = dispatch;

  const needsRegistered = ['chat', 'ai', 'bigorder', 'balance'].includes(dispatch.command);
  const needsLogin = needsRegistered;

  if (needsRegistered) {
    const registeredOk = await runGate(registeredGate, ctx);
    if (!registeredOk) return;
  }

  if (needsLogin) {
    const loginOk = await runGate(loginGate, ctx);
    if (!loginOk) return;
  }

  await dispatchAgentRoute(ctx, config, getTexts, dispatch);
}

module.exports = {
  normalizeRouteCommand,
  buildRoutedAgentMessage,
  resolveAgentRouteDispatch,
  dispatchAgentRoute,
  handleBotMentionRouted,
};
