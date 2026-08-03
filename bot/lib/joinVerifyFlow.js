'use strict';

/**
 * 入群验证流程（按群 API 配置）
 * A button 点击「我不是机器人」
 * B quiz  20 以内加减四选一（可重试 joinVerifyMaxFail）
 * C captcha 加密知识题四选一（可重试；可用 joinVerifyWelcomeText）
 */

const { escapeHtml } = require('./telegramHtml');
const { fetchJoinVerifyConfig } = require('./joinVerifyConfig');
const { buildCryptoCaptchaChallenge } = require('./joinVerifyCryptoQuiz');
const {
  getJoinVerifySession,
  saveJoinVerifySession,
  patchJoinVerifySession,
  clearJoinVerifySession,
  hasJoinVerifySession,
} = require('./joinVerifySession');

/** 防止 new_chat_members 与 chat_member 并发重复开局 */
const startingKeys = new Set();

function joinVerifyLog(config, event, payload) {
  if (!config?.JOIN_VERIFY_LOG) return;
  const ts = new Date().toISOString();
  let body = '';
  try {
    body = payload === undefined ? '' : ` ${JSON.stringify(payload)}`;
  } catch {
    body = ` ${String(payload)}`;
  }
  console.log(`[JOIN_VERIFY] ${ts} ${event}${body}`);
}

function isGroupChat(chat) {
  return chat && (chat.type === 'group' || chat.type === 'supergroup');
}

function displayName(user) {
  if (!user) return 'User';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (user.username) return `@${user.username}`;
  return `User ${user.id}`;
}

function mentionHtml(user) {
  const uid = user?.id;
  const label = escapeHtml(displayName(user));
  if (uid == null) return label;
  return `<a href="tg://user?id=${uid}">${label}</a>`;
}

function pickMode(modes) {
  const list = Array.isArray(modes) && modes.length ? modes : ['button'];
  return list[Math.floor(Math.random() * list.length)];
}

/** 模式 B：20 以内加减，4 选项 */
function buildQuizChallenge() {
  const useSub = Math.random() < 0.5;
  let a;
  let b;
  let correct;
  let op;
  if (useSub) {
    a = 2 + Math.floor(Math.random() * 19); // 2..20
    b = 1 + Math.floor(Math.random() * (a - 1)); // 1..a-1
    correct = a - b;
    op = '-';
  } else {
    a = 1 + Math.floor(Math.random() * 19); // 1..19
    b = 1 + Math.floor(Math.random() * (20 - a)); // a+b <= 20
    correct = a + b;
    op = '+';
  }

  const options = new Set([correct]);
  while (options.size < 4) {
    const delta = 1 + Math.floor(Math.random() * 5);
    let wrong = Math.random() < 0.5 ? correct + delta : correct - delta;
    if (wrong < 0) wrong = correct + delta;
    if (wrong > 20) wrong = Math.max(0, correct - delta);
    if (wrong !== correct) options.add(wrong);
  }
  const shuffled = [...options].sort(() => Math.random() - 0.5);
  return {
    kind: 'quiz',
    a,
    b,
    op,
    expression: `${a} ${op} ${b}`,
    correct,
    options: shuffled,
  };
}

/** 模式 C：加密知识题 */
function buildCaptchaChallenge(languageCode) {
  return buildCryptoCaptchaChallenge(languageCode);
}

function buildButtonChallenge() {
  return { kind: 'button' };
}

function buildChallenge(mode, languageCode) {
  if (mode === 'quiz') return buildQuizChallenge();
  if (mode === 'captcha') return buildCaptchaChallenge(languageCode);
  return buildButtonChallenge();
}

/**
 * 验证提示文案
 * - joinVerifyWelcomeText：自定义验证文案（{timeout}），主要用于 C；若配置了则三种模式都可用
 * - null：Bot 默认模板
 */
function buildPromptHtml(texts, challenge, mention, timeoutSec, customText, failLeft) {
  const showFailHint = challenge.kind === 'quiz' || challenge.kind === 'captcha';
  const failHint =
    showFailHint && failLeft != null && failLeft < Number.POSITIVE_INFINITY
      ? texts.joinVerifyFailLeftHint(failLeft)
      : '';

  if (customText) {
    const body = escapeHtml(String(customText).replace(/\{timeout\}/gi, String(timeoutSec)));
    let extra = '';
    if (challenge.kind === 'quiz') {
      extra = `\n\n<code>${challenge.expression} = ?</code>`;
    } else if (challenge.kind === 'captcha') {
      extra = `\n\n<b>${escapeHtml(challenge.question)}</b>`;
    }
    return `🛡️ <b>${texts.joinVerifyTitle}</b>\n\n${mention}\n${body}${extra}${failHint}`;
  }

  if (challenge.kind === 'quiz') {
    return texts.joinVerifyQuizPromptHtml(mention, challenge.expression, timeoutSec) + failHint;
  }
  if (challenge.kind === 'captcha') {
    return (
      texts.joinVerifyCaptchaPromptHtml(mention, escapeHtml(challenge.question), timeoutSec) +
      failHint
    );
  }
  return texts.joinVerifyButtonPromptHtml(mention, timeoutSec) + failHint;
}

function buildKeyboard(challenge, chatId, userId, texts) {
  if (challenge.kind === 'quiz') {
    return {
      inline_keyboard: [
        challenge.options.map((n, idx) => ({
          text: String(n),
          callback_data: `jv:q:${chatId}:${userId}:${idx}`,
        })),
      ],
    };
  }
  if (challenge.kind === 'captcha') {
    const rows = [];
    for (let i = 0; i < challenge.options.length; i += 2) {
      const row = [];
      for (let j = i; j < Math.min(i + 2, challenge.options.length); j += 1) {
        row.push({
          text: String(challenge.options[j]).slice(0, 40),
          callback_data: `jv:c:${chatId}:${userId}:${j}`,
        });
      }
      rows.push(row);
    }
    return { inline_keyboard: rows };
  }
  return {
    inline_keyboard: [
      [
        {
          text: texts.joinVerifyButtonLabel || '我不是机器人',
          callback_data: `jv:ok:${chatId}:${userId}`,
        },
      ],
    ],
  };
}

const MUTE_PERMISSIONS = {
  can_send_messages: false,
  can_send_audios: false,
  can_send_documents: false,
  can_send_photos: false,
  can_send_videos: false,
  can_send_video_notes: false,
  can_send_voice_notes: false,
  can_send_polls: false,
  can_send_other_messages: false,
  can_add_web_page_previews: false,
  can_change_info: false,
  can_invite_users: false,
  can_pin_messages: false,
  can_manage_topics: false,
};

const UNMUTE_PERMISSIONS = {
  can_send_messages: true,
  can_send_audios: true,
  can_send_documents: true,
  can_send_photos: true,
  can_send_videos: true,
  can_send_video_notes: true,
  can_send_voice_notes: true,
  can_send_polls: true,
  can_send_other_messages: true,
  can_add_web_page_previews: true,
  can_change_info: false,
  can_invite_users: true,
  can_pin_messages: false,
  can_manage_topics: false,
};

async function muteMember(telegram, chatId, userId) {
  await telegram.restrictChatMember(chatId, userId, { permissions: MUTE_PERMISSIONS });
}

async function unmuteMember(telegram, chatId, userId) {
  await telegram.restrictChatMember(chatId, userId, { permissions: UNMUTE_PERMISSIONS });
}

/**
 * @param {{ ban: boolean; banDurationSec: number }} opts
 */
async function removeMember(telegram, chatId, userId, opts) {
  if (opts.ban && opts.banDurationSec > 0) {
    const until = Math.floor(Date.now() / 1000) + Math.floor(opts.banDurationSec);
    await telegram.banChatMember(chatId, userId, { until_date: until });
    return;
  }
  await telegram.banChatMember(chatId, userId);
  await telegram.unbanChatMember(chatId, userId, { only_if_banned: true });
}

async function safeDeleteMessage(telegram, chatId, messageId) {
  if (messageId == null) return;
  try {
    await telegram.deleteMessage(chatId, messageId);
  } catch {
    /* ignore */
  }
}

async function startJoinVerify(telegram, config, getTexts, chat, user, languageCode) {
  if (!isGroupChat(chat) || !user?.id || user.is_bot) return;

  const chatId = chat.id;
  const userId = user.id;
  const lockKey = `${chatId}:${userId}`;

  if (hasJoinVerifySession(chatId, userId) || startingKeys.has(lockKey)) {
    joinVerifyLog(config, 'skip_duplicate', { chatId, userId });
    return;
  }
  startingKeys.add(lockKey);

  try {
    await startJoinVerifyInner(telegram, config, getTexts, chat, user, languageCode);
  } finally {
    startingKeys.delete(lockKey);
  }
}

async function startJoinVerifyInner(telegram, config, getTexts, chat, user, languageCode) {
  const chatId = chat.id;
  const userId = user.id;

  if (hasJoinVerifySession(chatId, userId)) {
    joinVerifyLog(config, 'skip_duplicate', { chatId, userId });
    return;
  }

  const groupCfg = await fetchJoinVerifyConfig(config, chatId);
  if (groupCfg.joinVerifyEnabled !== 1) {
    joinVerifyLog(config, 'skip_disabled', { chatId, userId });
    return;
  }

  const lang = languageCode || user.language_code || 'en';
  const texts = getTexts(lang);
  const timeoutSec = groupCfg.joinVerifyTimeoutSec;
  const mode = pickMode(groupCfg.joinVerifyModes);
  const challenge = buildChallenge(mode, lang);

  try {
    await muteMember(telegram, chatId, userId);
  } catch (err) {
    joinVerifyLog(config, 'mute_failed', {
      chatId,
      userId,
      message: err?.message || String(err),
    });
  }

  const failLeftHint =
    mode === 'quiz' || mode === 'captcha' ? groupCfg.joinVerifyMaxFail : null;

  const promptHtml = buildPromptHtml(
    texts,
    challenge,
    mentionHtml(user),
    timeoutSec,
    groupCfg.joinVerifyWelcomeText,
    failLeftHint,
  );
  const keyboard = buildKeyboard(challenge, chatId, userId, texts);

  let promptMsg;
  try {
    promptMsg = await telegram.sendMessage(chatId, promptHtml, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (err) {
    joinVerifyLog(config, 'prompt_failed', {
      chatId,
      userId,
      message: err?.message || String(err),
    });
    try {
      await unmuteMember(telegram, chatId, userId);
    } catch {
      /* ignore */
    }
    return;
  }

  const expireAt = Date.now() + timeoutSec * 1000;
  const session = saveJoinVerifySession(chatId, userId, {
    mode,
    challenge,
    failCount: 0,
    maxFail: groupCfg.joinVerifyMaxFail,
    banEnabled: groupCfg.joinVerifyBanEnabled,
    banDurationSec: groupCfg.joinVerifyBanDurationSec,
    customPrompt: groupCfg.joinVerifyWelcomeText,
    promptMessageId: promptMsg.message_id,
    languageCode: lang,
    userSnapshot: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
    },
    groupTitle: chat.title || String(chatId),
    expireAt,
    timeoutTimer: null,
  });

  session.timeoutTimer = setTimeout(() => {
    handleJoinVerifyTimeout(telegram, config, getTexts, chatId, userId).catch((err) => {
      joinVerifyLog(config, 'timeout_error', {
        chatId,
        userId,
        message: err?.message || String(err),
      });
    });
  }, timeoutSec * 1000);

  joinVerifyLog(config, 'started', {
    chatId,
    userId,
    mode,
    timeoutSec,
    maxFail: groupCfg.joinVerifyMaxFail,
    banEnabled: groupCfg.joinVerifyBanEnabled,
  });
}

async function passJoinVerify(telegram, config, getTexts, chatId, userId) {
  const session = getJoinVerifySession(chatId, userId);
  if (!session) return { ok: false, reason: 'expired' };

  clearJoinVerifySession(chatId, userId);
  await safeDeleteMessage(telegram, chatId, session.promptMessageId);

  try {
    await unmuteMember(telegram, chatId, userId);
  } catch (err) {
    joinVerifyLog(config, 'unmute_failed', {
      chatId,
      userId,
      message: err?.message || String(err),
    });
  }

  const texts = getTexts(session.languageCode || 'en');
  const user = session.userSnapshot || { id: userId };
  const groupTitle = escapeHtml(session.groupTitle || String(chatId));

  try {
    await telegram.sendMessage(
      chatId,
      texts.joinVerifyPassedWelcomeHtml(mentionHtml(user), groupTitle),
      { parse_mode: 'HTML' },
    );
  } catch (err) {
    joinVerifyLog(config, 'welcome_failed', {
      chatId,
      userId,
      message: err?.message || String(err),
    });
  }

  joinVerifyLog(config, 'passed', { chatId, userId });
  return { ok: true };
}

/**
 * @param {'fail' | 'timeout'} reason
 * - timeout：仅踢出
 * - fail：达上限后按 banEnabled 踢出或踢+临时封禁
 */
async function failJoinVerify(telegram, config, getTexts, chatId, userId, reason) {
  const session = getJoinVerifySession(chatId, userId);
  if (!session) return { ok: false, reason: 'expired' };

  clearJoinVerifySession(chatId, userId);
  await safeDeleteMessage(telegram, chatId, session.promptMessageId);

  const texts = getTexts(session.languageCode || 'en');
  const user = session.userSnapshot || { id: userId };
  const useBan = reason === 'fail' && session.banEnabled === 1;
  const notice =
    reason === 'timeout'
      ? texts.joinVerifyTimeoutHtml(mentionHtml(user))
      : useBan
        ? texts.joinVerifyBannedHtml(mentionHtml(user), session.banDurationSec)
        : texts.joinVerifyFailedHtml(mentionHtml(user));

  try {
    await removeMember(telegram, chatId, userId, {
      ban: useBan,
      banDurationSec: session.banDurationSec || 3600,
    });
  } catch (err) {
    joinVerifyLog(config, 'remove_failed', {
      chatId,
      userId,
      reason,
      ban: useBan,
      message: err?.message || String(err),
    });
  }

  try {
    await telegram.sendMessage(chatId, notice, { parse_mode: 'HTML' });
  } catch {
    /* ignore */
  }

  joinVerifyLog(config, reason === 'timeout' ? 'timeout' : 'failed', {
    chatId,
    userId,
    ban: useBan,
    banDurationSec: useBan ? session.banDurationSec : null,
  });
  return { ok: true };
}

async function handleJoinVerifyTimeout(telegram, config, getTexts, chatId, userId) {
  if (!getJoinVerifySession(chatId, userId)) return;
  await failJoinVerify(telegram, config, getTexts, chatId, userId, 'timeout');
}

/** 答错但未达上限：仅 B/C 换题重试 */
async function refreshChallengeOnFail(ctx, config, getTexts, session, chatId, userId) {
  const failCount = (session.failCount || 0) + 1;
  const maxFail = session.maxFail || 3;
  const failLeft = Math.max(0, maxFail - failCount);
  const texts = getTexts(session.languageCode || 'en');

  if (failCount >= maxFail) {
    await ctx.answerCbQuery(texts.joinVerifyFailToast, { show_alert: true }).catch(() => {});
    await failJoinVerify(ctx.telegram, config, getTexts, chatId, userId, 'fail');
    return;
  }

  await ctx.answerCbQuery(texts.joinVerifyRetryToast(failLeft), { show_alert: true }).catch(() => {});

  const mode = session.mode === 'button' ? 'quiz' : session.mode || 'quiz';
  const challenge = buildChallenge(mode, session.languageCode);
  const remainMs = Math.max(5_000, session.expireAt - Date.now());
  const timeoutSec = Math.ceil(remainMs / 1000);

  const promptHtml = buildPromptHtml(
    texts,
    challenge,
    mentionHtml(session.userSnapshot || { id: userId }),
    timeoutSec,
    session.customPrompt,
    failLeft,
  );
  const keyboard = buildKeyboard(challenge, chatId, userId, texts);

  try {
    await ctx.telegram.editMessageText(chatId, session.promptMessageId, undefined, promptHtml, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (err) {
    joinVerifyLog(config, 'refresh_failed', {
      chatId,
      userId,
      message: err?.message || String(err),
    });
  }

  patchJoinVerifySession(chatId, userId, {
    failCount,
    mode,
    challenge,
  });

  joinVerifyLog(config, 'retry', { chatId, userId, failCount, failLeft, mode });
}

function isAnswerCorrect(session, kind, choiceIdx) {
  const ch = session.challenge;
  if (!ch) return false;
  if (kind === 'ok' || ch.kind === 'button') return true;
  if (kind === 'q' || ch.kind === 'quiz') {
    return ch.options?.[choiceIdx] === ch.correct;
  }
  if (kind === 'c' || ch.kind === 'captcha') {
    return Number(choiceIdx) === Number(ch.correctIdx);
  }
  return false;
}

async function handleJoinVerifyCallback(ctx, config, getTexts) {
  const data = String(ctx.callbackQuery?.data || '');
  const m = data.match(/^jv:(ok|q|c):(-?\d+):(\d+)(?::(\d+))?$/);
  if (!m) return { handled: false };

  const kind = m[1];
  const chatId = Number(m[2]);
  const userId = Number(m[3]);
  const choiceIdx = m[4] != null ? Number(m[4]) : 0;
  const fromId = ctx.from?.id;
  const texts = getTexts(ctx.from?.language_code || 'en');

  if (fromId !== userId) {
    await ctx.answerCbQuery(texts.joinVerifyWrongUser, { show_alert: true }).catch(() => {});
    return { handled: true };
  }

  const session = getJoinVerifySession(chatId, userId);
  if (!session) {
    await ctx.answerCbQuery(texts.joinVerifyExpired, { show_alert: true }).catch(() => {});
    return { handled: true };
  }

  if (isAnswerCorrect(session, kind, choiceIdx)) {
    await ctx.answerCbQuery(texts.joinVerifyPassToast).catch(() => {});
    await passJoinVerify(ctx.telegram, config, getTexts, chatId, userId);
  } else {
    await refreshChallengeOnFail(ctx, config, getTexts, session, chatId, userId);
  }

  return { handled: true };
}

async function handleNewChatMembersMessage(ctx, config, getTexts) {
  const chat = ctx.chat;
  if (!isGroupChat(chat)) return;
  const members = ctx.message?.new_chat_members;
  if (!Array.isArray(members) || members.length === 0) return;

  for (const member of members) {
    if (!member || member.is_bot) continue;
    await startJoinVerify(
      ctx.telegram,
      config,
      getTexts,
      chat,
      member,
      member.language_code || ctx.from?.language_code,
    );
  }
}

async function handleChatMemberUpdate(ctx, config, getTexts) {
  const upd = ctx.chatMember || ctx.update?.chat_member;
  if (!upd) return;

  const chat = upd.chat;
  if (!isGroupChat(chat)) return;

  const oldStatus = upd.old_chat_member?.status;
  const newMember = upd.new_chat_member;
  const newStatus = newMember?.status;
  const user = newMember?.user;

  if (!user || user.is_bot) return;
  if (newStatus === 'administrator' || newStatus === 'creator') return;

  const wasOut = oldStatus === 'left' || oldStatus === 'kicked';
  const isIn = newStatus === 'member' || newStatus === 'restricted';
  if (!wasOut || !isIn) return;

  await startJoinVerify(
    ctx.telegram,
    config,
    getTexts,
    chat,
    user,
    user.language_code || upd.from?.language_code,
  );
}

module.exports = {
  startJoinVerify,
  passJoinVerify,
  failJoinVerify,
  handleJoinVerifyCallback,
  handleNewChatMembersMessage,
  handleChatMemberUpdate,
  buildChallenge,
  buildQuizChallenge,
};
