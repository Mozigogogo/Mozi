/**
 * 群推广人：Bot 入群自动绑定群主邀请码；/bind_ref 仅群主可手动重绑
 */

const {
  parseBotJoinFromMyChatMember,
  rememberChatPendingAdder,
} = require('../lib/groupReferrer');
const { resolveGroupCreatorTelegramProfile } = require('../lib/groupOwnerResolve');
const {
  syncGroupOwnerReferrerBinding,
  isTelegramUserGroupCreator,
} = require('../lib/groupOwnerReferrer');
const { postGroupReferrerPending } = require('../lib/apis');
const { rememberScheduleGroup } = require('../lib/predictScheduleStore');

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

    const creator = await resolveGroupCreatorTelegramProfile(ctx.telegram, join.chatId);
    if (creator?.telegramId) {
      try {
        await postGroupReferrerPending({
          apiBaseUrl: API_BASE_URL,
          appUrl: APP_URL,
          auth: MOZI_DETAIL_AUTH,
          chatId: join.chatId,
          adderTelegramId: creator.telegramId,
          chatTitle: join.chatTitle,
          botUsername: BOT_USERNAME,
        });
      } catch {
        /* ignore */
      }

      await syncGroupOwnerReferrerBinding(ctx.telegram, config, join.chatId).catch(() => {});

      rememberScheduleGroup({
        groupId: join.chatId,
        groupTitle: join.chatTitle,
        ownerTelegramId: creator.telegramId,
        botActive: true,
      });
    }

    const languageCode = mcm.from?.language_code || 'en';
    const texts = getText(languageCode);
    if (texts.bindRefHintAfterJoin) {
      await ctx.reply(texts.bindRefHintAfterJoin, { parse_mode: 'HTML' }).catch(() => {});
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

    const isOwner = await isTelegramUserGroupCreator(ctx.telegram, chatId, binderId);
    if (!isOwner) {
      await ctx.reply(
        texts.bindRefOnlyOwner || '仅<strong>群主</strong>可以执行 <code>/bind_ref</code>。',
        { parse_mode: 'HTML' },
      );
      return;
    }

    let bindRes;
    try {
      bindRes = await syncGroupOwnerReferrerBinding(ctx.telegram, config, chatId);
    } catch (err) {
      await ctx.reply(texts.bindRefBindFailed || '绑定本群推广人失败，请稍后重试。', {
        parse_mode: 'HTML',
      });
      return;
    }

    if (!bindRes.ok) {
      if (bindRes.reason === 'owner_invite_not_found' || bindRes.reason === 'invite_query_failed') {
        await ctx.reply(
          texts.bindRefNoInviteCode ||
            '未查询到您的邀请码。请先在 Mozi 完成注册并生成邀请码后，再执行 <code>/bind_ref</code>。',
          { parse_mode: 'HTML' },
        );
        return;
      }
      const detail = bindRes.errorMessage ? `\n${bindRes.errorMessage}` : '';
      await ctx.reply((texts.bindRefBindFailed || '绑定失败。') + detail, { parse_mode: 'HTML' });
      return;
    }

    const inviteCode = bindRes.inviteCode;
    const successText =
      typeof texts.bindRefSuccess === 'function'
        ? texts.bindRefSuccess(inviteCode)
        : `本群推广人已绑定为群主，邀请码：<code>${inviteCode}</code>`;

    await ctx.reply(successText, { parse_mode: 'HTML' });
  });
}

module.exports = { registerGroupReferrer };
