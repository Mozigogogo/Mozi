'use strict';

/**
 * 群内「注册」inline 按钮：直接调注册/登录 API，成功后自动重放待处理 /ai、/chat
 */

const {
  CALLBACK_MOZI_REGISTER,
  performTelegramRegisterViaApi,
} = require('../lib/tgBotRegisterApi');
const { buildGroupRegisterKeyboard } = require('../lib/registerDeepLink');
const { triggerPendingAiChatReplay } = require('../lib/tgChatRegisterWatcher');
const { markUserDmReachable } = require('../lib/botDmReachable');

/**
 * @param {object} texts
 * @param {string} code performTelegramRegisterViaApi 的 message
 */
function registerFailText(texts, code) {
  switch (code) {
    case 'login_no_token':
      return texts.registerApiLoginFailedHtml;
    case 'login_no_bot_token':
      return texts.registerApiBotTokenMissingHtml;
    case 'login_no_api_base':
      return texts.registerApiApiBaseMissingHtml;
    case 'check_network':
      return texts.registerApiNetworkErrorHtml;
    case 'still_unregistered':
      return texts.registerApiStillUnregisteredHtml;
    default:
      return texts.registerApiFailedHtml;
  }
}

/**
 * 与 /register 命令、群内注册按钮共用
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {(lang?: string) => object} getTexts
 * @param {{ fromCallback?: boolean; silent?: boolean }} [opts]
 */
async function runInlineRegisterFlow(ctx, config, getTexts, opts = {}) {
  const languageCode = ctx.from?.language_code || 'en';
  const texts = getTexts(languageCode);
  const uid = ctx.from?.id;
  if (uid == null) {
    return;
  }

  if (opts.fromCallback) {
    await ctx.answerCbQuery({ text: texts.registerApiProgressToast }).catch(() => {});
  }

  markUserDmReachable(uid);

  const result = await performTelegramRegisterViaApi(config, ctx);
  if (!result.ok) {
    const html = registerFailText(texts, result.message);
    if (opts.fromCallback && ctx.callbackQuery?.message) {
      const msg = ctx.callbackQuery.message;
      if ('chat' in msg && msg.chat?.id != null && msg.message_id != null) {
        await ctx.telegram
          .sendMessage(msg.chat.id, html, {
            parse_mode: 'HTML',
            reply_to_message_id: msg.message_id,
          })
          .catch(() => {});
      }
    } else {
      await ctx.reply(html, { parse_mode: 'HTML' }).catch(() => {});
    }
    return;
  }

  const chatId = ctx.chat?.id;
  await triggerPendingAiChatReplay(config, String(uid)).catch((e) => {
    console.warn('[inlineRegister] replay:', e?.message || e);
  });

  const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
  if (isGroup && !opts.fromCallback && !opts.silent) {
    await ctx.reply(texts.registerApiSuccessInGroupHtml, { parse_mode: 'HTML' }).catch(() => {});
  }
}

function registerInlineRegister(bot, config, { getTexts }) {
  bot.action(CALLBACK_MOZI_REGISTER, async (ctx) => {
    await runInlineRegisterFlow(ctx, config, getTexts, { fromCallback: true });
  });
}

module.exports = {
  registerInlineRegister,
  runInlineRegisterFlow,
  CALLBACK_MOZI_REGISTER,
};
