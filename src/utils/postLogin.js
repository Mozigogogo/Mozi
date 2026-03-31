import { request } from './request';
import { Interface } from './constants';
import { completeTask } from '@/api/user';

const STORAGE_KEYS = {
  // 防止 StrictMode 双挂载、以及多个入口同时触发
  POST_LOGIN_DONE: 'post_login_done_v1',
  POST_LOGIN_IN_FLIGHT: 'post_login_in_flight_v1',
  USER_DATAINFO_TS: 'user_datainfo_ts_v1',
  TASK_DAILY_LOGIN_DATE: 'task_daily_login_date_v1',
  TASK_FIRST_LOGIN_DONE: 'task_first_login_done_v1',
};

// 调试开关：用于控制 post-login 链路的控制台输出
// 设为 true 后可以恢复日志，定位链路执行顺序/跳过原因。
const ENABLE_POST_LOGIN_DEBUG = false;

// 自定义字段：首次登录时间（按用户维度持久化）
// 用于替代“注册时间/创建时间”这种可能不等于“首次登录时间”的字段。
const USER_FIRST_LOGIN_AT_KEY_PREFIX = 'mozi_first_login_at_user_v1:';
const getUserFirstLoginAtKey = (userId) => {
  if (!userId) return null;
  return `${USER_FIRST_LOGIN_AT_KEY_PREFIX}${userId}`;
};

export const ensureFirstLoginAt = ({ caller = 'unknown' } = {}) => {
  if (typeof window === 'undefined') return null;

  const userId = localStorage.getItem('userId');
  const key = getUserFirstLoginAtKey(userId);
  if (!key) return null;

  try {
    const existing = localStorage.getItem(key);
    const existingMs = existing ? Number(existing) : NaN;
    if (Number.isFinite(existingMs) && existingMs > 0) return existingMs;

    const tsMs = Date.now();
    localStorage.setItem(key, String(tsMs));

    // 尽量把字段同步到 userDataInfo，方便其它页面直接读取。
    try {
      const raw = localStorage.getItem('userDataInfo');
      if (!raw) return tsMs;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.firstLoginAt === undefined) {
        parsed.firstLoginAt = new Date(tsMs).toISOString();
        parsed.firstLoginAtMs = tsMs;
        localStorage.setItem('userDataInfo', JSON.stringify(parsed));
      }
    } catch (_) {
      // 同步 userDataInfo 失败不影响首次登录时间关键字段的写入
    }

    return tsMs;
  } catch (e) {
    console.warn('[postLogin] ensureFirstLoginAt failed:', e, { caller });
    return null;
  }
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DATAINFO_TTL_MS = 30 * 1000; // 30s 内只拉一次 datainfo

let inFlightPromise = null;

const now = () => Date.now();

const safeGet = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

const safeRemove = (key) => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
};

const isSameDay = (aMs, bMs) => {
  const a = new Date(aMs);
  const b = new Date(bMs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

export async function fetchUserDataInfoOnce({ force = false, caller = 'unknown' } = {}) {
  if (typeof window === 'undefined') return null;

  const lastTsStr = safeGet(STORAGE_KEYS.USER_DATAINFO_TS);
  const lastTs = lastTsStr ? Number(lastTsStr) : 0;
  const shouldSkipByTtl = !force && lastTs && now() - lastTs < DATAINFO_TTL_MS;

  if (shouldSkipByTtl) {
    if (ENABLE_POST_LOGIN_DEBUG) {
      console.log(
        '[postLogin] skip /user/datainfo by TTL, caller =',
        caller,
        'lastTs =',
        new Date(lastTs).toISOString()
      );
    }
    try {
      const stored = localStorage.getItem('userDataInfo');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  if (ENABLE_POST_LOGIN_DEBUG) {
    console.log('[postLogin] request /user/datainfo, caller =', caller);
  }
  const res = await request({
    url: Interface.USER_DATA_INFO,
    method: 'GET',
  });

  if (res?.data) {
    try {
      localStorage.setItem('userDataInfo', JSON.stringify(res.data));
    } catch {
      // ignore
    }
    safeSet(STORAGE_KEYS.USER_DATAINFO_TS, String(now()));
    return res.data;
  }

  return null;
}

async function completeDailyLoginOnce() {
  if (typeof window === 'undefined') return;

  const lastDateStr = safeGet(STORAGE_KEYS.TASK_DAILY_LOGIN_DATE);
  const lastMs = lastDateStr ? Number(lastDateStr) : 0;
  if (lastMs && isSameDay(lastMs, now())) {
    if (ENABLE_POST_LOGIN_DEBUG) {
      console.log('[postLogin] skip DAILY_LOGIN (already done today)');
    }
    return;
  }

  if (ENABLE_POST_LOGIN_DEBUG) {
    console.log('[postLogin] completeTask DAILY_LOGIN');
  }
  await completeTask('DAILY_LOGIN');
  safeSet(STORAGE_KEYS.TASK_DAILY_LOGIN_DATE, String(now()));
}

async function completeFirstLoginOnce() {
  if (typeof window === 'undefined') return;

  const done = safeGet(STORAGE_KEYS.TASK_FIRST_LOGIN_DONE) === 'true';
  if (done) {
    if (ENABLE_POST_LOGIN_DEBUG) {
      console.log('[postLogin] skip FIRST_LOGIN (already done)');
    }
    return;
  }

  if (ENABLE_POST_LOGIN_DEBUG) {
    console.log('[postLogin] completeTask FIRST_LOGIN');
  }
  await completeTask('FIRST_LOGIN');
  safeSet(STORAGE_KEYS.TASK_FIRST_LOGIN_DONE, 'true');
}

/**
 * 登录成功后的统一副作用（去重）
 * - 拉取 /user/datainfo（带 TTL）
 * - 上报任务 DAILY_LOGIN（按天去重）
 * - 上报任务 FIRST_LOGIN（按会话/设备去重）
 *
 * 注意：这里不抛错，避免影响登录主流程。
 */
export async function runPostLoginSideEffects(options = {}) {
  if (typeof window === 'undefined') return;

  const caller = options?.caller || 'unknown';
  if (ENABLE_POST_LOGIN_DEBUG) {
    console.log('[postLogin] runPostLoginSideEffects called, caller =', caller, 'options =', options);
  }

  const token = localStorage.getItem('token');
  if (!token) return;

  if (!options?.force) {
    // 如果同一会话已经执行过，直接返回
    if (safeGet(STORAGE_KEYS.POST_LOGIN_DONE) === 'true') {
      if (ENABLE_POST_LOGIN_DEBUG) {
        console.log('[postLogin] skip because POST_LOGIN_DONE already true, caller =', caller);
      }
      return;
    }
    // 如果正在执行中，复用同一个 Promise
    if (safeGet(STORAGE_KEYS.POST_LOGIN_IN_FLIGHT) === 'true' && inFlightPromise) {
      if (ENABLE_POST_LOGIN_DEBUG) {
        console.log('[postLogin] join in-flight promise, caller =', caller);
      }
      return inFlightPromise;
    }
  }

  if (ENABLE_POST_LOGIN_DEBUG) {
    console.log('[postLogin] start new post-login flow, caller =', caller);
  }
  safeSet(STORAGE_KEYS.POST_LOGIN_IN_FLIGHT, 'true');

  inFlightPromise = (async () => {
    try {
      await Promise.allSettled([
        fetchUserDataInfoOnce({ force: options?.forceDataInfo, caller }),
        completeDailyLoginOnce(),
        completeFirstLoginOnce(),
      ]);

      // 首次登录时间字段（自定义 firstLoginAt）
      ensureFirstLoginAt({ caller });
      safeSet(STORAGE_KEYS.POST_LOGIN_DONE, 'true');
    } finally {
      safeRemove(STORAGE_KEYS.POST_LOGIN_IN_FLIGHT);
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

