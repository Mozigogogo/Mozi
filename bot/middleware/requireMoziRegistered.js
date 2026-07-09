'use strict';

const { postTgRegisteredCheck } = require('../lib/apis');
const { saveAndWatchPendingAiChat } = require('../lib/tgChatPendingSave');
const { escapeHtml } = require('../lib/telegramHtml');
const { buildGroupStartKeyboard } = require('../lib/registerDeepLink');
const { canBotReachUserInDm } = require('../lib/botDmReachable');
const { runInlineRegisterFlow } = require('../handlers/inlineRegister');
const { tgRegisterLog } = require('../lib/tgRegisterDebug');

/**
 * @param {object | null} json
 * @returns {boolean | null}
 */
function parseRegisteredFlag(json) {
  if (!json || typeof json !== 'object') return null;
  if (typeof json.registered === 'boolean') return json.registered;
  const d = json.data;
  if (d && typeof d === 'object' && !Array.isArray(d) && typeof d.registered === 'boolean') {
    return d.registered;
  }
  return null;
}

/**
 * @param {import('telegraf').Context['from']} from
 */
function buildMentionHtml(from) {
  if (!from || from.id == null) return '';
  const uid = from.id;
  const labelRaw = from.username ? `@${from.username}` : from.first_name || 'User';
  return `<a href="tg://user?id=${uid}">${escapeHtml(labelRaw)}</a>`;
}

/**
 * 未注册 /ai、/chat：
 * - 已与 Bot 私聊：自动调注册 API + 群内重放（无拦截提示）
 * - 未私聊过：群内「首次提问需启动 Bot…」+「启动」按钮
 */
function createRequireMoziRegistered(config, { getTexts }) {
  return async (ctx, next) => {
    const uid = ctx.from?.id;
    if (uid == null) {
      return next();
    }
    const uidStr = String(uid);
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

    tgRegisterLog('registered/check 开始', {
      telegramId: uidStr,
      chatType: ctx.chat?.type || 'unknown',
      chatId: ctx.chat?.id ?? null,
      agentRoute: ctx.state?.agentRouteDispatch?.command || null,
    });

    let res;
    try {
      res = await postTgRegisteredCheck({
        apiBaseUrl: config.API_BASE_URL,
        telegramId: uidStr,
        auth: config.MOZI_DETAIL_AUTH || '',
        appUrl: config.APP_URL,
      });
    } catch (e) {
      tgRegisterLog('registered/check 网络异常', {
        telegramId: uidStr,
        error: e?.message || String(e),
      });
      return next();
    }

    const registered = parseRegisteredFlag(res.json);
    tgRegisterLog('registered/check 响应', {
      telegramId: uidStr,
      httpStatus: res.status,
      httpOk: res.ok,
      registered,
      bodyPreview: (res.text || '').slice(0, 300),
    });

    if (registered == null) {
      return next();
    }

    if (registered === true) {
      return next();
    }

    tgRegisterLog('未注册用户拦截', { telegramId: uidStr, isGroup });

    const mention = buildMentionHtml(ctx.from);
    await saveAndWatchPendingAiChat(ctx, config);

    if (isGroup) {
      const canReachDm = await canBotReachUserInDm(ctx.telegram, uid);
      tgRegisterLog('私聊可达性探测', {
        telegramId: uidStr,
        canReachDm,
        nextAction: canReachDm ? 'auto_register' : 'show_start_button',
      });
      if (canReachDm) {
        await runInlineRegisterFlow(ctx, config, getTexts, {
          silent: !(isGroup && ctx.state?.agentRouteDispatch),
        });
        return;
      }
      await ctx
        .reply(texts.bindGroupNeedStartHtml(mention), {
          parse_mode: 'HTML',
          reply_markup: buildGroupStartKeyboard(config.BOT_USERNAME, texts),
        })
        .catch(() => {});
    } else {
      tgRegisterLog('私聊未注册，触发自动注册', { telegramId: uidStr });
      await runInlineRegisterFlow(ctx, config, getTexts);
    }
    return;
  };
}

module.exports = { createRequireMoziRegistered };
