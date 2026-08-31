import { useCallback, useEffect, useRef } from 'react';
import { INTERFACE_URL, Interface } from '@/utils/constants';
import { isAlertFlagOn, readStoredAlertConfig } from '@/utils/alertConfig';

const SEEN_EVENT_IDS_KEY = 'mozi_web_alarm_seen_v1';
const MAX_SEEN_IDS = 200;
const POLL_INTERVAL_MS = 15000;
const RECONNECT_DELAY_MS = 5000;

function readSeenEventIds() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(SEEN_EVENT_IDS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

function writeSeenEventIds(set) {
  if (typeof window === 'undefined') return;
  try {
    const list = Array.from(set).slice(-MAX_SEEN_IDS);
    sessionStorage.setItem(SEEN_EVENT_IDS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function parseSseChunk(buffer) {
  const events = [];
  const blocks = buffer.split('\n\n');
  const rest = blocks.pop() || '';

  for (const block of blocks) {
    if (!block.trim()) continue;
    let eventName = 'message';
    let data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) eventName = line.slice(6).trim();
      if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (eventName === 'ping' || !data) continue;
    try {
      events.push({ eventName, data: JSON.parse(data) });
    } catch {
      /* ignore malformed chunk */
    }
  }

  return { events, rest };
}

function normalizeAlertEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const eventId = raw.eventId || raw.id;
  const message = raw.message || raw.content;
  if (!eventId || !message) return null;
  return {
    eventId: String(eventId),
    symbol: raw.symbol ? String(raw.symbol).toUpperCase() : '',
    warnCode: raw.warnCode ? String(raw.warnCode) : '',
    message: String(message),
    triggeredAt: raw.triggeredAt || raw.createdAt || null,
  };
}

/**
 * 监听 Web 告警推送（SSE 优先，轮询降级）
 * @param {{ enabled: boolean, onAlert: (event) => void }} options
 */
export function useWebAlarmPush({ enabled = false, onAlert } = {}) {
  const onAlertRef = useRef(onAlert);
  const seenRef = useRef(readSeenEventIds());
  const abortRef = useRef(null);
  const pollTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const sseActiveRef = useRef(false);

  onAlertRef.current = onAlert;

  const emitIfNew = useCallback((raw) => {
    const event = normalizeAlertEvent(raw);
    if (!event) return;
    if (seenRef.current.has(event.eventId)) return;
    seenRef.current.add(event.eventId);
    writeSeenEventIds(seenRef.current);
    onAlertRef.current?.(event);
  }, []);

  const pollRecent = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const url = `${INTERFACE_URL}${Interface.ALERT_TRIGGERS_RECENT}`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          authentication: token,
          'Accept-Language': localStorage.getItem('i18nextLng') || 'en',
        },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.code !== 0) return;
      const items = json?.data?.items;
      if (Array.isArray(items)) {
        items.forEach(emitIfNew);
      }
    } catch {
      /* backend not ready */
    }
  }, [emitIfNew]);

  const connectSse = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token || !enabled) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const url = `${INTERFACE_URL}${Interface.ALERT_PUSH_STREAM}`;
    let buffer = '';

    (async () => {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            authentication: token,
            'Accept-Language': localStorage.getItem('i18nextLng') || 'en',
          },
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          sseActiveRef.current = false;
          return;
        }

        sseActiveRef.current = true;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parsed = parseSseChunk(buffer);
          buffer = parsed.rest;
          parsed.events.forEach(({ eventName, data }) => {
            if (eventName === 'alert_triggered') {
              emitIfNew(data);
            }
          });
        }
      } catch (err) {
        if (err?.name !== 'AbortError') {
          sseActiveRef.current = false;
        }
      } finally {
        if (!controller.signal.aborted && enabled) {
          reconnectTimerRef.current = setTimeout(connectSse, RECONNECT_DELAY_MS);
        }
      }
    })();
  }, [enabled, emitIfNew]);

  useEffect(() => {
    if (!enabled) {
      abortRef.current?.abort();
      abortRef.current = null;
      sseActiveRef.current = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      return undefined;
    }

    connectSse();

    pollTimerRef.current = setInterval(() => {
      if (!sseActiveRef.current) {
        pollRecent();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [enabled, connectSse, pollRecent]);

  return { pollRecent };
}

/** 是否应开启 Web 告警推送（已登录且 webEnabled=1） */
export function shouldEnableWebAlarmPush() {
  if (typeof window === 'undefined') return false;
  if (!localStorage.getItem('token')) return false;
  const cfg = readStoredAlertConfig();
  return isAlertFlagOn(cfg?.webEnabled);
}
