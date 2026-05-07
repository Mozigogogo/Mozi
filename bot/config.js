/**
 * 环境变量与固定链接（邀请码相关 URL 拼装见 lib/invite.js）
 */

const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL || 'https://moziinnovations-production.up.railway.app';
const BOT_USERNAME = (process.env.BOT_USERNAME || 'Moziinovations_bot').replace(/^@/, '');

const TG_COMMUNITY_URL = 'https://t.me/MoziInnovations';
const TWITTER_URL = 'https://x.com/Innovation56171';

const ALERT_CARD_IMAGE =
  process.env.ALERT_CARD_IMAGE ||
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/image/twitter.jpg';

module.exports = {
  BOT_TOKEN,
  APP_URL,
  BOT_USERNAME,
  TG_COMMUNITY_URL,
  TWITTER_URL,
  ALERT_CARD_IMAGE,
};
