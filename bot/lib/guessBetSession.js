/**
 * 群内竞猜下注积分：待选自定义输入 + 已选积分暂存（进程内 TTL）
 */

const TTL_MS = 10 * 60 * 1000;

/** @type {Map<string, object>} */
const customSessions = new Map();

/** @type {Map<string, { points: number; expireAt: number }>} */
const pendingStakes = new Map();

function stakeKey(userId, guessNo) {
  return `${String(userId)}:${String(guessNo || '').trim()}`;
}

function purgeExpired() {
  const now = Date.now();
  for (const [key, session] of customSessions) {
    if (!session || now > session.expireAt) customSessions.delete(key);
  }
  for (const [key, stake] of pendingStakes) {
    if (!stake || now > stake.expireAt) pendingStakes.delete(key);
  }
}

/**
 * @param {string | number} userId
 * @param {{ guessNo: string; chatId: number; messageId: number }} data
 */
function saveGuessBetCustomSession(userId, data) {
  const key = String(userId ?? '').trim();
  if (!key) return;
  purgeExpired();
  customSessions.set(key, {
    guessNo: String(data.guessNo || '').trim(),
    chatId: data.chatId,
    messageId: data.messageId,
    expireAt: Date.now() + TTL_MS,
  });
}

/** @param {string | number} userId */
function getGuessBetCustomSession(userId) {
  const key = String(userId ?? '').trim();
  if (!key) return null;
  purgeExpired();
  const session = customSessions.get(key);
  if (!session || Date.now() > session.expireAt) {
    customSessions.delete(key);
    return null;
  }
  return session;
}

/** @param {string | number} userId */
function clearGuessBetCustomSession(userId) {
  customSessions.delete(String(userId ?? '').trim());
}

/**
 * @param {string | number} userId
 * @param {string} guessNo
 * @param {number} points
 */
function setGuessBetPending(userId, guessNo, points) {
  const pts = Math.floor(Number(points));
  if (!Number.isFinite(pts) || pts <= 0) return;
  purgeExpired();
  pendingStakes.set(stakeKey(userId, guessNo), {
    points: pts,
    expireAt: Date.now() + TTL_MS,
  });
}

/**
 * @param {string | number} userId
 * @param {string} guessNo
 * @returns {number | null}
 */
function getGuessBetPending(userId, guessNo) {
  purgeExpired();
  const stake = pendingStakes.get(stakeKey(userId, guessNo));
  if (!stake || Date.now() > stake.expireAt) {
    pendingStakes.delete(stakeKey(userId, guessNo));
    return null;
  }
  return stake.points;
}

/**
 * @param {string | number} userId
 * @param {string} guessNo
 */
function clearGuessBetPending(userId, guessNo) {
  pendingStakes.delete(stakeKey(userId, guessNo));
}

module.exports = {
  saveGuessBetCustomSession,
  getGuessBetCustomSession,
  clearGuessBetCustomSession,
  setGuessBetPending,
  getGuessBetPending,
  clearGuessBetPending,
};
