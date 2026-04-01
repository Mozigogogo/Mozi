import { request } from './request';
import { Interface } from './constants';
import { completeTask } from '@/api/user';

const STORAGE_KEYS = {
  // 防止 StrictMode 双挂载、以及多个入口同时触发
  POST_LOGIN_DONE: 'post_login_done_v1',
  POST_LOGIN_IN_FLIGHT: 'post_login_in_flight_v1',
  TASK_DAILY_LOGIN_DATE: 'task_daily_login_date_v1',
  TASK_FIRST_LOGIN_DONE: 'task_first_login_done_v1',
};

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
    return null;
  }
};

const DAY_MS = 24 * 60 * 60 * 1000;

let inFlightPromise = null;
/** 并发去重：多入口同时触发（如 StrictMode 双 effect）只发一次 HTTP */
let userDataInfoInFlightPromise = null;
/** 最近一次 datainfo 成功时间，用于极短时间内的顺序重复调用走本地缓存（缓解 dev StrictMode 二次 effect） */
let lastDatainfoSuccessAt = 0;
const DATINFO_SHORT_DEDUP_MS = 400;

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

  // 任意并发（含 force:true）共用同一 in-flight，避免先前 force 分支未挂 Promise 导致重复请求
  if (userDataInfoInFlightPromise) {
    return userDataInfoInFlightPromise;
  }

  // 非强制刷新：刚成功极短时间内再调，直接读本地（常见于 React StrictMode 顺序执行两次 effect）
  if (
    !force &&
    lastDatainfoSuccessAt > 0 &&
    Date.now() - lastDatainfoSuccessAt < DATINFO_SHORT_DEDUP_MS
  ) {
    try {
      const raw = localStorage.getItem('userDataInfo');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (_) {
      // fall through to network
    }
  }

  const executeFetch = async () => {
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
      lastDatainfoSuccessAt = Date.now();
      return res.data;
    }

    return null;
  };

  const p = executeFetch().finally(() => {
    userDataInfoInFlightPromise = null;
  });

  userDataInfoInFlightPromise = p;
  return p;
}

async function completeDailyLoginOnce() {
  if (typeof window === 'undefined') return;

  const lastDateStr = safeGet(STORAGE_KEYS.TASK_DAILY_LOGIN_DATE);
  const lastMs = lastDateStr ? Number(lastDateStr) : 0;
  if (lastMs && isSameDay(lastMs, now())) {
    return;
  }

  await completeTask('DAILY_LOGIN');
  safeSet(STORAGE_KEYS.TASK_DAILY_LOGIN_DATE, String(now()));
}

async function completeFirstLoginOnce() {
  if (typeof window === 'undefined') return;

  const done = safeGet(STORAGE_KEYS.TASK_FIRST_LOGIN_DONE) === 'true';
  if (done) {
    return;
  }

  await completeTask('FIRST_LOGIN');
  safeSet(STORAGE_KEYS.TASK_FIRST_LOGIN_DONE, 'true');
}

/**
 * 登录成功后的统一副作用（去重）
 * - 拉取 /user/datainfo（fetchUserDataInfoOnce 内并发去重）
 * - 上报任务 DAILY_LOGIN（按天去重）
 * - 上报任务 FIRST_LOGIN（按会话/设备去重）
 *
 * 注意：这里不抛错，避免影响登录主流程。
 */
export async function runPostLoginSideEffects(options = {}) {
  if (typeof window === 'undefined') return;

  const caller = options?.caller || 'unknown';

  const token = localStorage.getItem('token');
  if (!token) return;

  if (!options?.force) {
    // 如果同一会话已经执行过，直接返回
    if (safeGet(STORAGE_KEYS.POST_LOGIN_DONE) === 'true') {
      return;
    }
    // 如果正在执行中，复用同一个 Promise
    if (safeGet(STORAGE_KEYS.POST_LOGIN_IN_FLIGHT) === 'true' && inFlightPromise) {
      return inFlightPromise;
    }
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

