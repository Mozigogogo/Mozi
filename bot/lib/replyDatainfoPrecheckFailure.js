'use strict';

const { buildBindAccountKeyboard } = require('./moziBindKeyboard');
const { escapeHtml } = require('./telegramHtml');
const { replyOrDmUserHtml } = require('./replyOrDmUserHtml');

/**
 * /ai、/chat 调用 datainfo 前置校验失败时的统一回复（私聊直接回；群聊优先私信）。
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {object} texts getTexts(languageCode)
 * @param {object} r loadMoziDatainfoPoints 的返回值（outcome !== 'ok'）
 * @param {string} dmFailedText 群聊私信失败时的群内一行提示
 */
async function replyDatainfoPrecheckFailure(ctx, config, texts, r, dmFailedText) {
  switch (r.outcome) {
    case 'timeout':
      await replyOrDmUserHtml(ctx, texts.balanceTimeoutError, dmFailedText);
      break;
    case 'network':
      await replyOrDmUserHtml(ctx, texts.balanceNetworkError, dmFailedText);
      break;
    case 'http': {
      if (r.status === 401 || r.status === 403) {
        await replyOrDmUserHtml(
          ctx,
          texts.balanceNeedBind,
          dmFailedText,
          buildBindAccountKeyboard(config, texts),
        );
        break;
      }
      if (r.status === 404) {
        await replyOrDmUserHtml(ctx, texts.balanceApiNotFound, dmFailedText);
        break;
      }
      await replyOrDmUserHtml(ctx, texts.balanceHttpError(r.status), dmFailedText);
      break;
    }
    case 'biz':
      await replyOrDmUserHtml(
        ctx,
        r.message ? escapeHtml(r.message) : texts.balanceParseError,
        dmFailedText,
      );
      break;
    case 'unbound':
      await replyOrDmUserHtml(
        ctx,
        texts.balanceNeedBind,
        dmFailedText,
        buildBindAccountKeyboard(config, texts),
      );
      break;
    case 'malformed':
      await replyOrDmUserHtml(ctx, texts.balanceParseError, dmFailedText);
      break;
    default:
      break;
  }
}

module.exports = { replyDatainfoPrecheckFailure };
