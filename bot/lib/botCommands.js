'use strict';

/**
 * 注册 Bot 命令菜单：用户输入 / 时 Telegram 自动提示
 * https://core.telegram.org/bots/api#setmycommands
 */

/** @type {{ command: string; description: string }[]} */
const DEFAULT_COMMANDS = [
  { command: 'start', description: '打开 Mozi / 开始' },
  { command: 'help', description: '查看全部指令说明' },
  { command: 'price', description: '查询实时价格（如 /price BTC）' },
  { command: 'ai', description: '深度分析（消耗积分）' },
  { command: 'chat', description: '普通问答（消耗积分）' },
  { command: 'bigorder', description: '大单分析' },
  { command: 'predict', description: '发起/管理竞猜' },
  { command: 'config', description: '群配置（定时推送 / 入群验证）' },
  { command: 'alert', description: '价格告警设置' },
  { command: 'balance', description: '查看积分余额' },
  { command: 'register', description: '注册 / 绑定 Mozi 账户' },
];

/** @type {{ command: string; description: string }[]} */
const DEFAULT_COMMANDS_EN = [
  { command: 'start', description: 'Open Mozi / Start' },
  { command: 'help', description: 'Show all commands' },
  { command: 'price', description: 'Live price (e.g. /price BTC)' },
  { command: 'ai', description: 'Deep analysis (costs points)' },
  { command: 'chat', description: 'Q&A chat (costs points)' },
  { command: 'bigorder', description: 'Big-order analysis' },
  { command: 'predict', description: 'Start / manage polls' },
  { command: 'config', description: 'Group settings (push / join verify)' },
  { command: 'alert', description: 'Price alerts' },
  { command: 'balance', description: 'Points balance' },
  { command: 'register', description: 'Register / bind Mozi account' },
];

/**
 * @param {import('telegraf').Telegram} telegram
 */
async function registerBotCommands(telegram) {
  // 默认（中文为主用户）
  await telegram.setMyCommands(DEFAULT_COMMANDS);
  // 私聊范围再设一遍，避免被其他 scope 覆盖
  await telegram.setMyCommands(DEFAULT_COMMANDS, {
    scope: { type: 'all_private_chats' },
  }).catch(() => {});
  await telegram.setMyCommands(DEFAULT_COMMANDS_EN, {
    scope: { type: 'all_private_chats' },
    language_code: 'en',
  }).catch(() => {});
  // 群聊：少暴露管理类，保留常用查询
  const groupCmds = DEFAULT_COMMANDS.filter((c) =>
    ['help', 'price', 'ai', 'chat', 'bigorder', 'predict', 'alert', 'balance', 'register'].includes(
      c.command,
    ),
  );
  await telegram.setMyCommands(groupCmds, {
    scope: { type: 'all_group_chats' },
  }).catch(() => {});
}

module.exports = {
  registerBotCommands,
  DEFAULT_COMMANDS,
};
