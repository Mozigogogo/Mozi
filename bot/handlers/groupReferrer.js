/**
 * 群推广人：my_chat_member（bot 入群）记录拉群人
 */

const { parseBotJoinFromMyChatMember } = require('../lib/groupReferrer');
const { postGroupReferrerPending } = require('../lib/apis');

function registerGroupReferrer(bot, config) {
  const { API_BASE_URL, APP_URL, BOT_USERNAME, MOZI_DETAIL_AUTH } = config;

  bot.on('my_chat_member', async (ctx) => {
    const mcm = ctx.myChatMember;
    if (!mcm) return;

    const join = parseBotJoinFromMyChatMember(mcm);
    if (!join) return;

    const ts = new Date().toLocaleString();
    console.log(`\n[${ts}] Bot 被拉进群`);
    console.log(`  群 ID (chatId): ${join.chatId}`);
    console.log(`  群名: ${join.chatTitle || '(无标题)'}`);
    console.log(`  拉群人 TG ID (adderTelegramId): ${join.adderTelegramId}`);
    if (join.adderUsername) {
      console.log(`  拉群人用户名: @${join.adderUsername}`);
    }
    if (join.likelyAnonymousAdder) {
      console.log(
        '  ⚠️ 拉群人可能为匿名管理员，adderTelegramId 可能无法用于 /bind_ref，请用非匿名账号拉 bot 进群',
      );
    }

    try {
      const res = await postGroupReferrerPending({
        apiBaseUrl: API_BASE_URL,
        appUrl: APP_URL,
        auth: MOZI_DETAIL_AUTH,
        chatId: join.chatId,
        adderTelegramId: join.adderTelegramId,
        chatTitle: join.chatTitle,
        botUsername: BOT_USERNAME,
      });
      if (!res.ok) {
        console.warn(
          `[groupReferrer] POST pending 失败 HTTP ${res.status}: ${(res.text || '').slice(0, 200)}`,
        );
      }
    } catch (err) {
      console.warn('[groupReferrer] POST pending 异常:', err?.message || err);
    }
  });
}

module.exports = { registerGroupReferrer };
