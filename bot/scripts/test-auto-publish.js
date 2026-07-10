#!/usr/bin/env node
'use strict';

/**
 * 联调 POST /coinDirectionGuess/autoPublish
 *
 * 用法：
 *   node bot/scripts/test-auto-publish.js -1001234567890 [-1009876543210]
 *   node bot/scripts/test-auto-publish.js --enabled              # 拉取已开启定时推送的群
 *   node bot/scripts/test-auto-publish.js -100123 --send         # 创建成功后发到 TG 群
 *   node bot/scripts/test-auto-publish.js -100123 --send-pending # 补发 tgMessageId 为空的 active 竞猜
 *
 * 环境变量：与 bot 相同（API_BASE_URL、MOZI_DETAIL_AUTH、BOT_TOKEN 等）
 */

const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch {
  /* dotenv 可选 */
}

const config = require('../config');
const {
  postCoinDirectionGuessAutoPublish,
  getCoinDirectionGuessList,
  parseCoinDirectionGuessAutoPublishItems,
} = require('../lib/apis');
const { sendAutoPublishedGuessCardsBatch } = require('../lib/predictFlow');
const { fetchAutoPublishGroups } = require('../lib/predictAutoPublishScheduler');

/**
 * @param {number[]} groupIds
 */
async function fetchPendingAutoPublishItems(groupIds) {
  const items = [];
  for (const groupId of groupIds) {
    const listRes = await getCoinDirectionGuessList({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      groupId,
      path: config.COIN_DIRECTION_GUESS_LIST_PATH,
    });
    if (!listRes.ok) {
      console.warn('[test-auto-publish] list failed for', groupId, listRes.errorMessage);
      continue;
    }
    for (const row of listRes.items || []) {
      const status = String(row.status || '').toLowerCase();
      const tgMessageId = row.tgMessageId ?? row.tg_message_id ?? null;
      if (status !== 'active') continue;
      if (tgMessageId != null && String(tgMessageId).trim() !== '') continue;
      items.push({
        guessNo: row.guessNo,
        creatorUserId: row.creatorUserId ?? null,
        title: row.title ?? null,
        groupId: Number(row.groupId ?? groupId),
        symbol: row.symbol,
        duration: row.duration,
        startPrice: row.startPrice,
        startAt: row.startAt,
        endAt: row.endAt,
        betEndAt: row.betEndAt,
        status: row.status,
        aiDirection: row.aiDirection,
        aiConfidence: row.aiConfidence,
        aiWinRate: row.aiWinRate,
        aiWinCount: row.aiWinCount,
        aiLossCount: row.aiLossCount,
      });
    }
  }
  return parseCoinDirectionGuessAutoPublishItems({ code: 0, data: items });
}

async function sendItemsToTelegram(items) {
  if (!config.BOT_TOKEN) {
    console.error('[test-auto-publish] BOT_TOKEN missing, cannot send');
    process.exit(1);
  }
  const { Telegraf } = require('telegraf');
  const bot = new Telegraf(config.BOT_TOKEN);
  const sendResults = await sendAutoPublishedGuessCardsBatch(bot.telegram, config, items);
  console.log('[test-auto-publish] telegram results:', JSON.stringify(sendResults, null, 2));
  const failed = sendResults.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

async function main() {
  const flags = new Set(['--send', '--enabled', '--send-pending']);
  const args = process.argv.slice(2).filter((a) => a && !flags.has(a));
  const shouldSend = process.argv.includes('--send');
  const sendPending = process.argv.includes('--send-pending');
  const useEnabledGroups = process.argv.includes('--enabled');

  /** @type {number[]} */
  let groupIds = args.map((a) => Number(a)).filter((id) => Number.isFinite(id));

  if (useEnabledGroups) {
    const remote = await fetchAutoPublishGroups(config);
    if (!remote.ok) {
      console.error('[test-auto-publish] fetch enabled groups failed:', remote.errorMessage);
      process.exit(1);
    }
    groupIds = remote.groups.map((g) => Number(g.groupId)).filter((id) => Number.isFinite(id));
    console.log('[test-auto-publish] enabled groups:', groupIds.length);
  }

  if (!groupIds.length) {
    console.error(
      'Usage: node bot/scripts/test-auto-publish.js <groupId> [--send|--send-pending|--enabled]',
    );
    process.exit(1);
  }

  if (sendPending) {
    const pending = await fetchPendingAutoPublishItems(groupIds);
    console.log('[test-auto-publish] pending active guesses without tgMessageId:', pending.length);
    if (!pending.length) {
      process.exit(0);
    }
    for (const item of pending) {
      console.log('[test-auto-publish] pending item:', {
        groupId: item.groupId,
        guessNo: item.guessNo,
        symbol: item.symbol,
      });
    }
    await sendItemsToTelegram(pending);
    return;
  }

  if (groupIds.length > 100) {
    console.error('[test-auto-publish] groupIds max 100');
    process.exit(1);
  }

  console.log('[test-auto-publish] API:', config.API_BASE_URL);
  console.log('[test-auto-publish] path:', config.COIN_DIRECTION_GUESS_AUTO_PUBLISH_PATH);
  console.log('[test-auto-publish] groupIds:', groupIds);
  console.log('[test-auto-publish] MOZI_DETAIL_AUTH:', config.MOZI_DETAIL_AUTH ? 'set' : 'missing (bind skipped)');

  const apiResult = await postCoinDirectionGuessAutoPublish({
    apiBaseUrl: config.API_BASE_URL,
    appUrl: config.APP_URL,
    path: config.COIN_DIRECTION_GUESS_AUTO_PUBLISH_PATH,
    groupIds,
    timeoutMs: Number(process.env.COIN_DIRECTION_GUESS_AUTO_PUBLISH_TIMEOUT_MS) || 120_000,
  });

  console.log('[test-auto-publish] httpStatus:', apiResult.status);
  console.log('[test-auto-publish] code:', apiResult.code);
  console.log('[test-auto-publish] agentFailed:', apiResult.agentFailed);
  console.log('[test-auto-publish] created:', apiResult.items.length);
  console.log('[test-auto-publish] raw:', apiResult.text);

  if (apiResult.agentFailed) {
    console.error('[test-auto-publish] Agent/取价失败 (code=1)');
    process.exit(1);
  }

  if (!apiResult.ok) {
    console.error('[test-auto-publish] request failed:', apiResult.errorMessage || '(unknown)');
    process.exit(1);
  }

  if (!apiResult.items.length) {
    console.log('[test-auto-publish] 全部群创建失败或无返回，data=[]');
    console.log('[test-auto-publish] 可用 --send-pending 补发未绑定 TG 消息的 active 竞猜');
    process.exit(0);
  }

  for (const item of apiResult.items) {
    console.log('[test-auto-publish] ok item:', {
      groupId: item.groupId,
      guessNo: item.guessNo,
      symbol: item.symbol,
      aiDirection: item.aiDirection,
      startPrice: item.startPrice,
    });
  }

  if (!shouldSend) {
    console.log('[test-auto-publish] 未加 --send，跳过 TG 发卡');
    process.exit(0);
  }

  await sendItemsToTelegram(apiResult.items);
}

main().catch((err) => {
  console.error('[test-auto-publish] fatal:', err?.message || err);
  process.exit(1);
});
