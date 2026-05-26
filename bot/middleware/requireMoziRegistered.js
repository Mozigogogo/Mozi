'use strict';

const { postTgRegisteredCheck } = require('../lib/apis');
const { saveAndWatchPendingAiChat } = require('../lib/tgChatPendingSave');
const { escapeHtml } = require('../lib/telegramHtml');
const { buildRegisterPrivateUrl } = require('../lib/registerDeepLink');
const { buildMiniAppUrlWithInvite } = require('../lib/invite');

/** 已发过绑定私信、等待用户完成注册后发送「绑定成功」的用户（telegramId 字符串） */
const pendingBindNotice = new Set();

/**
 * @param {object | null} json
 * @returns {boolean | null} true=已注册，false=未注册，null=无法从响应判断
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

function userMiniAppRegisterUrl(config) {
  const base = String(config.APP_URL || '').replace(/\/+$/, '');
  return `${base}/user`;
}

/**
 * 在 requireMoziLogin 之前：仅已注册 Mozi 的用户可继续；未注册则群内 @ 简短提示 + 私信引导与一键注册 Mini App /user
 * @param {object} config
 * @param {{ getTexts: (lang?: string) => object }} i18nApi
 * @returns {import('telegraf').MiddlewareFn}
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

    let res;
    try {
      res = await postTgRegisteredCheck({
        apiBaseUrl: config.API_BASE_URL,
        telegramId: uidStr,
        auth: config.MOZI_DETAIL_AUTH || '',
        appUrl: config.APP_URL,
      });
    } catch (e) {
      console.warn('[requireMoziRegistered] POST /user/tg/registered/check:', e?.message || e);
      return next();
    }

    const registered = parseRegisteredFlag(res.json);
    if (registered == null) {
      return next();
    }

    if (registered === true) {
      pendingBindNotice.delete(uidStr);
      return next();
    }

    const mention = buildMentionHtml(ctx.from);
    const base = String(config.APP_URL || '').replace(/\/+$/, '');
    const groupInvite = ctx.state?.groupReferrer?.inviteCode;
    const userPage = groupInvite
      ? buildMiniAppUrlWithInvite(`${base}/user`, groupInvite)
      : userMiniAppRegisterUrl(config);
    const privateUrl = buildRegisterPrivateUrl(config.BOT_USERNAME);
    const dmOpts = {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: texts.bindStartBtn, web_app: { url: userPage } }]],
      },
    };
    const groupRegisterKeyboard = {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: texts.bindStartBtn, url: privateUrl }]],
      },
    };

    await saveAndWatchPendingAiChat(ctx, config);

    if (isGroup) {
      await ctx
        .reply(texts.bindGroupRegisterGuideHtml(mention), groupRegisterKeyboard)
        .catch(() => {});
      if (!pendingBindNotice.has(uidStr)) {
        try {
          await ctx.telegram.sendMessage(uid, texts.registerIntroHtml, dmOpts);
        } catch (e) {
          console.warn('[requireMoziRegistered] bind DM:', e?.message || e);
          await ctx.reply(texts.bindDmFailedInGroup, { parse_mode: 'HTML' }).catch(() => {});
        }
        pendingBindNotice.add(uidStr);
      }
    } else {
      try {
        await ctx.reply(texts.registerIntroHtml, dmOpts);
        pendingBindNotice.add(uidStr);
      } catch (e) {
        console.warn('[requireMoziRegistered] bind reply (private):', e?.message || e);
      }
    }
    return;
  };
}

module.exports = { createRequireMoziRegistered, pendingBindNotice };
