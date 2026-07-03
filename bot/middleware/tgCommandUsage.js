'use strict';

const { inboundCommandName } = require('../lib/moziLoginCommands');
const { recordCommandUsageFromCtx } = require('../lib/tgCommandUsage');

/**
 * 统一记录斜杠指令调用，按时间窗口聚合（/start、/register、/bind_ref 除外）
 * @param {object} config
 */
function createTgCommandUsageMiddleware(config) {
  return async (ctx, next) => {
    const command = inboundCommandName(ctx);
    if (command) {
      recordCommandUsageFromCtx(ctx, command, config);
    }
    return next();
  };
}

module.exports = { createTgCommandUsageMiddleware };
