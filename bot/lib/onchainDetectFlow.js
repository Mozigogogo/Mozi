'use strict';

/**
 * 群消息链上合约地址识别 → GoPlus 安全检测 → 回复结果卡片
 */

const { extractOnchainAddresses, truncateAddress } = require('./onchainAddressMatch');
const { fetchTokenSecurity } = require('./goplusApi');
const { getEvmFallbackChains } = require('./goplusChains');
const {
  fetchGroupSecurityConfig,
  isOnchainDetectEnabled,
  groupSecurityLog,
} = require('./groupSecurityConfig');
const { escapeHtml } = require('./telegramHtml');

/** @type {Map<string, number>} */
const recentReplyCache = new Map();

/** @type {Map<string, { expireAt: number, analysis: object }>} */
const resultCache = new Map();

function onchainDetectLog(config, event, payload) {
  groupSecurityLog(config, `onchain_${event}`, payload);
}

function isGroupChat(chat) {
  return chat && (chat.type === 'group' || chat.type === 'supergroup');
}

function messageText(ctx) {
  return ctx.message?.text || ctx.message?.caption || '';
}

function cacheKey(chatId, chain, address) {
  return `${chatId}:${chain}:${String(address).toLowerCase()}`;
}

function shouldSkipRecentReply(chatId, chain, address, cooldownMs) {
  const key = cacheKey(chatId, chain, address);
  const hit = recentReplyCache.get(key);
  if (hit && Date.now() < hit) return true;
  recentReplyCache.set(key, Date.now() + cooldownMs);
  if (recentReplyCache.size > 5000) {
    const now = Date.now();
    for (const [k, exp] of recentReplyCache) {
      if (exp <= now) recentReplyCache.delete(k);
    }
  }
  return false;
}

function getCachedAnalysis(chatId, chain, address, ttlMs) {
  const key = `result:${cacheKey(chatId, chain, address)}`;
  const hit = resultCache.get(key);
  if (hit && Date.now() < hit.expireAt) return hit.analysis;
  return null;
}

function setCachedAnalysis(chatId, chain, address, analysis, ttlMs) {
  const key = `result:${cacheKey(chatId, chain, address)}`;
  resultCache.set(key, { expireAt: Date.now() + ttlMs, analysis });
}

function itemLine(texts, item) {
  const icon =
    item.level === 'ok' ? '✅' : item.level === 'warn' ? '⚠️' : '❌';
  const entry = texts.onchainDetectItem?.[item.key];
  let text = item.key;
  if (typeof entry === 'function') {
    const opts =
      item.days != null || item.tvl != null || item.count != null
        ? { days: item.days, tvl: item.tvl, count: item.count }
        : undefined;
    text = entry(opts);
  } else if (typeof entry === 'string') {
    text = entry;
  }
  return `${icon} ${text}`;
}

function riskLabel(texts, risk) {
  if (risk === 'extreme') return texts.onchainDetectRiskExtreme;
  if (risk === 'high') return texts.onchainDetectRiskHigh;
  if (risk === 'medium') return texts.onchainDetectRiskMedium;
  return texts.onchainDetectRiskLow;
}

function buildResultHtml(texts, address, analysis) {
  const shortAddr = escapeHtml(truncateAddress(address));
  const chainLabel = escapeHtml(analysis.chainLabel || '');
  const isExtreme = analysis.risk === 'extreme' || analysis.risk === 'high';
  const header = isExtreme
    ? texts.onchainDetectHeaderDanger(chainLabel)
    : texts.onchainDetectHeaderNormal(chainLabel);

  const lines = (analysis.items || []).map((item) => escapeHtml(itemLine(texts, item)));
  const risk = escapeHtml(riskLabel(texts, analysis.risk));

  return (
    `${header}\n` +
    `${texts.onchainDetectAddressLabel}: <code>${shortAddr}</code>\n` +
    `────────────────\n` +
    `${lines.join('\n')}\n\n` +
    `${texts.onchainDetectRiskLabel}：<b>${risk}</b>\n` +
    `${texts.onchainDetectDataSource}\n` +
    `${texts.onchainDetectDisclaimer || ''}`
  );
}

/**
 * @param {object} config
 * @param {{
 *   chain: string,
 *   chainId?: string,
 *   address: string,
 *   addressType?: string,
 *   evmFallback?: boolean,
 * }} target
 */
async function fetchSecurityWithFallback(config, target) {
  const tried = new Set();
  const markTried = (chain, chainId) => tried.add(`${chain}:${chainId}`);

  markTried(target.chain, target.chainId);

  let res = await fetchTokenSecurity(config, target);
  if (res.ok) return res;
  if (!target.evmFallback || target.addressType !== 'evm') return res;

  const allFallback = getEvmFallbackChains();
  const maxFallback = Number(config.ONCHAIN_DETECT_FALLBACK_MAX);
  const fallbackChains =
    Number.isFinite(maxFallback) && maxFallback > 0
      ? allFallback.slice(0, maxFallback)
      : allFallback;

  for (const chainDef of fallbackChains) {
    const id = `${chainDef.key}:${chainDef.goplusId}`;
    if (tried.has(id)) continue;
    markTried(chainDef.key, chainDef.goplusId);

    const attempt = await fetchTokenSecurity(config, {
      ...target,
      chain: chainDef.key,
      chainId: chainDef.goplusId,
      evmFallback: false,
    });
    if (attempt.ok) {
      return {
        ...attempt,
        resolvedChain: chainDef.key,
        resolvedChainId: chainDef.goplusId,
      };
    }
    if (attempt.error !== 'not_found') return attempt;
    res = attempt;
  }
  return res;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {Function} getTexts
 */
async function handleGroupOnchainDetect(ctx, config, getTexts) {
  if (config?.ONCHAIN_DETECT_ENABLED === false) return { handled: false };

  const chat = ctx.chat;
  if (!isGroupChat(chat)) return { handled: false };

  const user = ctx.from;
  if (!user?.id || user.is_bot) return { handled: false };

  const msg = ctx.message;
  if (!msg || msg.message_id == null) return { handled: false };
  if (
    msg.new_chat_members ||
    msg.left_chat_member ||
    msg.new_chat_title ||
    msg.new_chat_photo ||
    msg.delete_chat_photo ||
    msg.group_chat_created ||
    msg.supergroup_chat_created ||
    msg.migrate_to_chat_id ||
    msg.migrate_from_chat_id ||
    msg.pinned_message
  ) {
    return { handled: false };
  }

  const text = messageText(ctx);
  if (!text.trim()) return { handled: false };

  const groupCfg = await fetchGroupSecurityConfig(config, chat.id);
  if (!isOnchainDetectEnabled(groupCfg)) {
    onchainDetectLog(config, 'skip_disabled', {
      chatId: chat.id,
      onchainDetectEnabled: groupCfg.onchainDetectEnabled,
    });
    return { handled: false };
  }

  const targets = extractOnchainAddresses(text);
  if (!targets.length) return { handled: false };

  const texts = getTexts(user.language_code || 'en');
  const cooldownMs = Math.max(0, Number(config.ONCHAIN_DETECT_REPLY_COOLDOWN_MS) || 60_000);
  const resultTtlMs = Math.max(0, Number(config.ONCHAIN_DETECT_RESULT_CACHE_MS) || 300_000);

  // 每条消息只回复第一个未在冷却期内的地址，避免刷屏
  let target = null;
  for (const t of targets) {
    if (!shouldSkipRecentReply(chat.id, t.chain, t.address, cooldownMs)) {
      target = t;
      break;
    }
  }
  if (!target) return { handled: false };

  onchainDetectLog(config, 'match', {
    chatId: chat.id,
    userId: user.id,
    chain: target.chain,
    address: target.address,
  });

  let analysis = getCachedAnalysis(chat.id, target.chain, target.address, resultTtlMs);
  if (!analysis) {
    const res = await fetchSecurityWithFallback(config, target);
    if (!res.ok || !res.analysis) {
      onchainDetectLog(config, 'api_fail', {
        chain: target.chain,
        address: target.address,
        error: res.error || 'unknown',
      });
      await ctx
        .reply(texts.onchainDetectFetchFailed, {
          parse_mode: 'HTML',
          reply_to_message_id: msg.message_id,
        })
        .catch(() => {});
      return { handled: true };
    }
    analysis = res.analysis;
    if (res.resolvedChain) {
      target = {
        ...target,
        chain: res.resolvedChain,
        chainId: res.resolvedChainId || target.chainId,
      };
    }
    setCachedAnalysis(chat.id, target.chain, target.address, analysis, resultTtlMs);
  }

  const html = buildResultHtml(texts, target.address, analysis);
  await ctx
    .reply(html, {
      parse_mode: 'HTML',
      reply_to_message_id: msg.message_id,
      disable_web_page_preview: true,
    })
    .catch((err) => {
      onchainDetectLog(config, 'reply_fail', {
        message: err?.response?.description || err?.message || String(err),
      });
    });

  onchainDetectLog(config, 'replied', {
    chatId: chat.id,
    chain: target.chain,
    address: target.address,
    risk: analysis.risk,
  });

  return { handled: true };
}

module.exports = {
  handleGroupOnchainDetect,
  buildResultHtml,
  fetchSecurityWithFallback,
};
