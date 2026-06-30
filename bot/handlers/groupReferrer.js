/**
 * 群推广人：my_chat_member（bot 入群）、/bind_ref（仅拉群人，自动 queryInviteCode 后绑定群）
 */

const {
  parseBotJoinFromMyChatMember,
  rememberChatPendingAdder,
  getRememberedChatPendingAdder,
  buildBotStartUrlWithInviteCode,
} = require('../lib/groupReferrer');
const {
  postGroupReferrerPending,
  getGroupReferrer,
  postTgQueryInviteCode,
  postGroupReferrerBind,
} = require('../lib/apis');
const { setGroupReferrerCache } = require('../middleware/groupReferrer');

/**
 * @param {object} config
 * @param {string} chatId
 * @returns {Promise<{ adderTelegramId: string } | null>}
 */
async function resolveChatAdder(config, chatId) {
  const { API_BASE_URL, APP_URL, MOZI_DETAIL_AUTH } = config;
  try {
    const res = await getGroupReferrer({
      apiBaseUrl: API_BASE_URL,
      appUrl: APP_URL,
      auth: MOZI_DETAIL_AUTH,
      chatId,
    });
    if (res.referrer?.adderTelegramId) {
      return { adderTelegramId: res.referrer.adderTelegramId };
    }
  } catch {
    /* ignore */
  }
  const local = getRememberedChatPendingAdder(chatId);
  if (local?.adderTelegramId) {
    return { adderTelegramId: local.adderTelegramId };
  }
  return null;
}

function registerGroupReferrer(bot, config, { getTexts } = {}) {
  const { API_BASE_URL, APP_URL, BOT_USERNAME, MOZI_DETAIL_AUTH } = config;
  const getText = getTexts || (() => ({}));

  bot.on('my_chat_member', async (ctx) => {
    const mcm = ctx.myChatMember;
    if (!mcm) return;

    const join = parseBotJoinFromMyChatMember(mcm);
    if (!join) return;

    if (!join.likelyAnonymousAdder) {
      rememberChatPendingAdder(join.chatId, join.adderTelegramId, { chatTitle: join.chatTitle });
    }

    try {
      await postGroupReferrerPending({
        apiBaseUrl: API_BASE_URL,
        appUrl: APP_URL,
        auth: MOZI_DETAIL_AUTH,
        chatId: join.chatId,
        adderTelegramId: join.adderTelegramId,
        chatTitle: join.chatTitle,
        botUsername: BOT_USERNAME,
      });
    } catch {
      /* ignore */
    }

    if (!join.likelyAnonymousAdder) {
      const languageCode = mcm.from?.language_code || 'en';
      const texts = getText(languageCode);
      if (texts.bindRefHintAfterJoin) {
        await ctx
          .reply(texts.bindRefHintAfterJoin, { parse_mode: 'HTML' })
          .catch(() => {});
      }
    }
  });

  bot.command('bind_ref', async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getText(languageCode);
    const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

    if (!isGroup) {
      await ctx.reply(texts.bindRefOnlyInGroup || '请在群内使用 /bind_ref。', { parse_mode: 'HTML' });
      return;
    }

    const chatId = ctx.chat.id;
    const binderId = ctx.from?.id;
    if (binderId == null) return;

    const adder = await resolveChatAdder(config, chatId);
    if (!adder) {
      await ctx.reply(
        texts.bindRefNoPending ||
          '未找到本群拉 bot 记录，请由拉 bot 进群的人先将 bot 拉入本群后再试。',
        { parse_mode: 'HTML' },
      );
      return;
    }

    if (String(binderId) !== String(adder.adderTelegramId)) {
      await ctx.reply(
        texts.bindRefOnlyAdder || '仅拉 bot 进群的人可以执行 /bind_ref。',
        { parse_mode: 'HTML' },
      );
      return;
    }

    let queryRes;
    try {
      queryRes = await postTgQueryInviteCode({
        apiBaseUrl: API_BASE_URL,
        appUrl: APP_URL,
        auth: MOZI_DETAIL_AUTH,
        telegramId: binderId,
      });
    } catch (err) {
      await ctx.reply(texts.bindRefQueryFailed || '查询邀请码失败，请稍后重试。', {
        parse_mode: 'HTML',
      });
      return;
    }

    if (!queryRes.ok || !queryRes.inviteCode) {
      await ctx.reply(
        texts.bindRefNoInviteCode ||
          '未查询到您的邀请码，请先在 Mozi 完成注册并生成邀请码后再执行 /bind_ref。',
        { parse_mode: 'HTML' },
      );
      return;
    }

    const inviteCode = queryRes.inviteCode;
    const rawUrl = buildBotStartUrlWithInviteCode(BOT_USERNAME, inviteCode);

    let bindRes;
    try {
      bindRes = await postGroupReferrerBind({
        apiBaseUrl: API_BASE_URL,
        appUrl: APP_URL,
        auth: MOZI_DETAIL_AUTH,
        chatId,
        binderTelegramId: binderId,
        inviteCode,
        rawUrl,
      });
    } catch (err) {
      await ctx.reply(texts.bindRefBindFailed || '绑定群推广人失败，请稍后重试。', {
        parse_mode: 'HTML',
      });
      return;
    }

    if (!bindRes.ok) {
      const detail = bindRes.errorMessage ? `\n${bindRes.errorMessage}` : '';
      await ctx.reply((texts.bindRefBindFailed || '绑定失败。') + detail, { parse_mode: 'HTML' });
      return;
    }

    const successText =
      typeof texts.bindRefSuccess === 'function'
        ? texts.bindRefSuccess(inviteCode)
        : `本群推广人已绑定，邀请码：<code>${inviteCode}</code>`;

    setGroupReferrerCache(chatId, {
      inviteCode,
      rawUrl,
      referrerTelegramId: String(binderId),
    });

    await ctx.reply(successText, { parse_mode: 'HTML' });
  });
}

module.exports = { registerGroupReferrer, resolveChatAdder };
