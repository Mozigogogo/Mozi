/**
 * /group：群配置中心
 * - 定时推送 AI 信号卡（原逻辑保留）
 * - 新成员入群验证配置
 */

const {
  handleScheduleRefresh,
  handleScheduleToggle,
  handleOpenScheduleFromHub,
} = require('../lib/predictScheduleFlow');
const {
  executeGroupSettingsCommand,
  handleGroupSettingsHome,
} = require('../lib/groupSettingsFlow');
const {
  handleJoinVerifyOpenList,
  handleJoinVerifyOpenDetail,
  handleJoinVerifyToggleEnabled,
  handleJoinVerifyToggleMode,
  handleJoinVerifySetNumberField,
  handleJoinVerifyToggleBan,
} = require('../lib/joinVerifySettingsFlow');
const { tgGroupListLog } = require('../lib/tgGroupListDebug');

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 */
function registerPredictSchedule(bot, config, { getTexts }) {
  const runGroupCommand = async (ctx) => {
    try {
      await executeGroupSettingsCommand(ctx, config, getTexts);
    } catch (err) {
      tgGroupListLog('command.error', {
        telegramId: ctx.from?.id,
        message: err?.message || String(err),
        name: err?.name,
      });
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx
        .reply(texts.predictScheduleFetchFailed || '加载失败，请稍后再试。', { parse_mode: 'HTML' })
        .catch(() => {});
    }
  };

  bot.command('group', runGroupCommand);

  // —— 配置中心 ——
  bot.action('gs:home', async (ctx) => {
    try {
      await handleGroupSettingsHome(ctx, getTexts);
    } catch {
      /* ignore */
    }
  });

  bot.action('gs:ps', async (ctx) => {
    try {
      await handleOpenScheduleFromHub(ctx, config, getTexts);
    } catch {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    }
  });

  bot.action('gs:jv', async (ctx) => {
    try {
      await handleJoinVerifyOpenList(ctx, config, getTexts);
    } catch {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    }
  });

  // —— 定时推送（原逻辑）——
  bot.action(/^ps:t:(-?\d+):(0|1)$/, async (ctx) => {
    const groupId = ctx.match[1];
    const enabled = ctx.match[2] === '1';
    try {
      await handleScheduleToggle(ctx, config, getTexts, groupId, enabled);
    } catch {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    }
  });

  bot.action('ps:r', async (ctx) => {
    try {
      await handleScheduleRefresh(ctx, config, getTexts);
    } catch {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    }
  });

  // —— 新成员验证配置 ——
  bot.action('jv:noop', async (ctx) => {
    const texts = getTexts(ctx.from?.language_code || 'en');
    await ctx.answerCbQuery(texts.joinVerifySettingsNoopToast || '请点击下方选项').catch(() => {});
  });

  bot.action('jv:list', async (ctx) => {
    try {
      await handleJoinVerifyOpenList(ctx, config, getTexts);
    } catch {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    }
  });

  bot.action('jv:r', async (ctx) => {
    try {
      await handleJoinVerifyOpenList(ctx, config, getTexts);
    } catch {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    }
  });

  bot.action(/^jv:g:(-?\d+)$/, async (ctx) => {
    try {
      await handleJoinVerifyOpenDetail(ctx, config, getTexts, ctx.match[1]);
    } catch {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    }
  });

  bot.action(/^jv:e:(-?\d+):(0|1)$/, async (ctx) => {
    try {
      await handleJoinVerifyToggleEnabled(ctx, config, getTexts, ctx.match[1], ctx.match[2] === '1');
    } catch {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    }
  });

  bot.action(/^jv:m:(-?\d+):(button|quiz|captcha)$/, async (ctx) => {
    try {
      await handleJoinVerifyToggleMode(ctx, config, getTexts, ctx.match[1], ctx.match[2]);
    } catch {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    }
  });

  bot.action(/^jv:to:(-?\d+):(\d+)$/, async (ctx) => {
    try {
      await handleJoinVerifySetNumberField(
        ctx,
        config,
        getTexts,
        ctx.match[1],
        'joinVerifyTimeoutSec',
        ctx.match[2],
        'joinVerifySettingsSavedToast',
      );
    } catch {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    }
  });

  bot.action(/^jv:mf:(-?\d+):(\d+)$/, async (ctx) => {
    try {
      await handleJoinVerifySetNumberField(
        ctx,
        config,
        getTexts,
        ctx.match[1],
        'joinVerifyMaxFail',
        ctx.match[2],
        'joinVerifySettingsSavedToast',
      );
    } catch {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    }
  });

  bot.action(/^jv:ban:(-?\d+):(0|1)$/, async (ctx) => {
    try {
      await handleJoinVerifyToggleBan(ctx, config, getTexts, ctx.match[1], ctx.match[2] === '1');
    } catch {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    }
  });

  bot.action(/^jv:bd:(-?\d+):(\d+)$/, async (ctx) => {
    try {
      await handleJoinVerifySetNumberField(
        ctx,
        config,
        getTexts,
        ctx.match[1],
        'joinVerifyBanDurationSec',
        ctx.match[2],
        'joinVerifySettingsSavedToast',
      );
    } catch {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    }
  });
}

module.exports = { registerPredictSchedule };
