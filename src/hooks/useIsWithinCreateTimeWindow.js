'use client';

import { useCallback, useEffect, useState } from 'react';
import { ensureFirstLoginAt, fetchUserDataInfoOnce } from '@/utils/postLogin';
import { MOZI_SESSION_CHANGED } from '@/utils/sessionEvents';
import {
  isDatainfoForCurrentUser,
  isWithinCreateTimeWindow,
  pickCreateTimeFromDatainfo,
  pickFirstLoginAtFallback,
  unwrapDatainfoPayload,
} from '@/utils/companionDays';

function readSessionFingerprint() {
  if (typeof window === 'undefined') return '|';
  try {
    const uid = String(localStorage.getItem('userId') || '').trim();
    const token = String(localStorage.getItem('token') || '');
    // token 后缀：无 userId 时也能区分换号；勿存完整 token
    const tokTail = token ? token.slice(-16) : '';
    return `${uid}|${tokTail}`;
  } catch {
    return '|';
  }
}

function readHasToken() {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(localStorage.getItem('token'));
  } catch {
    return false;
  }
}

function backfillUserIdFromPayload(payload) {
  if (typeof window === 'undefined' || !payload || typeof payload !== 'object') return;
  try {
    if (String(localStorage.getItem('userId') || '').trim()) return;
    const uid =
      payload?.userId ??
      payload?.userInfo?.userId ??
      payload?.userInfo?.id ??
      payload?.id;
    if (uid != null && String(uid).trim()) {
      localStorage.setItem('userId', String(uid));
    }
  } catch {
    // ignore
  }
}

function backfillUserIdFromUserInfo() {
  if (typeof window === 'undefined') return;
  try {
    if (String(localStorage.getItem('userId') || '').trim()) return;
    const raw = localStorage.getItem('userInfo');
    if (!raw) return;
    const info = JSON.parse(raw);
    const uid = info?.userId ?? info?.id;
    if (uid != null && String(uid).trim()) {
      localStorage.setItem('userId', String(uid));
    }
  } catch {
    // ignore
  }
}

/**
 * 基于 /user/datainfo 的 createTime：判断当前是否在「注册日起往后 N 天」窗口内
 * 登录/登出/切换账号（mozi:session-changed、storage）时会强制刷新
 * @param {object} [options]
 * @param {number} [options.days=30] - 窗口天数
 * @returns {{ inWindow: boolean | null, createTime: string | null, loading: boolean }}
 *   inWindow: null 表示加载中；true/false 为最终判断
 */
export function useIsWithinCreateTimeWindow(options = {}) {
  const days = options.days ?? 30;
  const [inWindow, setInWindow] = useState(null);
  const [createTime, setCreateTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionKey, setSessionKey] = useState(() => readSessionFingerprint());

  const refreshSessionKey = useCallback(() => {
    backfillUserIdFromUserInfo();
    const next = readSessionFingerprint();
    setSessionKey((prev) => (prev === next ? prev : next));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onSession = () => {
      // 登录写 localStorage 与派发事件之间可能有一拍延迟，下一帧再读指纹
      refreshSessionKey();
      window.setTimeout(refreshSessionKey, 0);
      window.setTimeout(refreshSessionKey, 50);
      window.setTimeout(refreshSessionKey, 200);
    };
    const onStorage = (e) => {
      if (!e.key || e.key === 'userId' || e.key === 'token' || e.key === 'userDataInfo') {
        refreshSessionKey();
      }
    };

    window.addEventListener(MOZI_SESSION_CHANGED, onSession);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(MOZI_SESSION_CHANGED, onSession);
      window.removeEventListener('storage', onStorage);
    };
  }, [refreshSessionKey]);

  useEffect(() => {
    let cancelled = false;

    const applyAnchor = (anchor) => {
      if (cancelled) return;
      if (!anchor) {
        setCreateTime(null);
        setInWindow(false);
        return;
      }
      setCreateTime(anchor);
      setInWindow(isWithinCreateTimeWindow(anchor, days));
    };

    const resolveAnchor = (data) => {
      const payload = unwrapDatainfoPayload(data) || data;
      backfillUserIdFromPayload(payload);
      const fromCreate = pickCreateTimeFromDatainfo(payload);
      if (fromCreate) return fromCreate;
      // datainfo 无 createTime 时：用客户端 firstLoginAt 兜底（并尽量写入）
      try {
        ensureFirstLoginAt({ caller: 'create-time-window' });
      } catch {
        // ignore
      }
      return pickFirstLoginAtFallback(payload);
    };

    const clear = (asFalse = false) => {
      if (cancelled) return;
      setCreateTime(null);
      setInWindow(asFalse ? false : null);
    };

    (async () => {
      setLoading(true);
      clear(false);
      backfillUserIdFromUserInfo();

      if (!readHasToken()) {
        clear(true);
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        // 仅当缓存属于当前用户时才预填，避免切号沿用旧账号 createTime
        try {
          const raw = localStorage.getItem('userDataInfo');
          if (raw) {
            const cached = JSON.parse(raw);
            if (cached && typeof cached === 'object' && isDatainfoForCurrentUser(cached)) {
              applyAnchor(resolveAnchor(cached));
            }
          }
        } catch {
          // ignore
        }

        const latest = await fetchUserDataInfoOnce({
          force: true,
          caller: 'create-time-window',
        });
        applyAnchor(resolveAnchor(latest));
      } catch {
        // 网络失败仍尝试 firstLoginAt 兜底
        applyAnchor(resolveAnchor(null));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [days, sessionKey]);

  return { inWindow, createTime, loading };
}

export default useIsWithinCreateTimeWindow;
