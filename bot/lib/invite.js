/**
 * 邀请码：来自深度链接 /start <payload>（Telegraf: ctx.startPayload）
 * 拼到 Mini App 根地址上供前端 InviteCodeHandler 使用
 */

/**
 * @param {string} appUrl
 * @param {string} [inviteCode] deep link payload，无则返回裸 APP_URL
 */
function buildMiniAppUrlWithInvite(appUrl, inviteCode) {
  const base = String(appUrl || '').replace(/\/$/, '');
  if (!inviteCode) return base;
  return `${base}?inviteCode=${encodeURIComponent(inviteCode)}`;
}

module.exports = { buildMiniAppUrlWithInvite };
