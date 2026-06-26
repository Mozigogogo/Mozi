/**
 * /alert：引导进入 Mini App 币种详情配置告警
 * 群内：引导用户点击深链私聊（/start alert_SYMBOL），私聊内与直接 /alert 一致
 */

const { executeAlertCommand } = require('../lib/alertFlow');

function registerAlert(bot, config, { getTexts }) {
  bot.command('alert', async (ctx) => {
    await executeAlertCommand(ctx, config, getTexts, ctx.args || []);
  });
}

module.exports = { registerAlert };
