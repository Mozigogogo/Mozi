import { useCallback, useEffect, useRef } from 'react';
import { MoziWebSocket } from '@/utils/moziWebSocket';
import { WS_URL } from '@/utils/constants';
import { isAlertFlagOn, readStoredAlertConfig } from '@/utils/alertConfig';
import {
  createAlertChannel,
  PLATFORMS,
  WS_EVENTS,
} from '@/utils/websocketProtocol';

const ALERT_CHANNEL_ID = 'alert';

function normalizeAlertPush(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const payload = raw.data;
  if (!payload || typeof payload !== 'object') return null;
  const text = payload.text != null ? String(payload.text).trim() : '';
  if (!text) return null;
  return {
    text,
    symbol: payload.symbol ? String(payload.symbol).toUpperCase() : '',
    alarmType: payload.alarmType ? String(payload.alarmType) : '',
    channelId: raw.channelId ? String(raw.channelId) : ALERT_CHANNEL_ID,
  };
}

function resolveSubscribeCode(response) {
  if (!response || typeof response !== 'object') return null;
  if (response.code != null) return response.code;
  if (response.data?.code != null) return response.data.code;
  const channel = response.data?.channels?.[0];
  if (channel?.channelId === ALERT_CHANNEL_ID) return 200;
  return null;
}

/**
 * 监听 Web 告警推送（WebSocket /ws + alert 频道）
 * @param {{ enabled: boolean, authToken?: string, onAlert: (event) => void }} options
 */
export function useWebAlarmPush({ enabled = false, authToken = '', onAlert } = {}) {
  const onAlertRef = useRef(onAlert);
  const wsRef = useRef(null);
  const subscribedRef = useRef(false);

  onAlertRef.current = onAlert;

  const handleAlertMessage = useCallback((message) => {
    const event = normalizeAlertPush(message);
    if (!event) return;
    onAlertRef.current?.(event);
  }, []);

  const subscribeAlert = useCallback(async (ws) => {
    try {
      const response = await ws.subscribe([createAlertChannel()]);
      const code = resolveSubscribeCode(response);
      if (code === 206) {
        const reason = response?.reason || response?.data?.reason || '网页告警需要登录';
        console.warn('[WebAlarm] 订阅失败:', reason);
        subscribedRef.current = false;
        return;
      }
      subscribedRef.current = code === 200 || Boolean(response?.data?.channels?.length);
    } catch (error) {
      subscribedRef.current = false;
      console.warn('[WebAlarm] 订阅 alert 频道失败:', error);
    }
  }, []);

  const teardown = useCallback((ws) => {
    if (!ws) return;
    if (subscribedRef.current) {
      ws.unsubscribe([ALERT_CHANNEL_ID]).catch(() => {});
      subscribedRef.current = false;
    }
    ws.disconnect();
  }, []);

  useEffect(() => {
    if (!enabled || !authToken) {
      if (wsRef.current) {
        teardown(wsRef.current);
        wsRef.current = null;
      }
      return undefined;
    }

    const ws = new MoziWebSocket(WS_URL, {
      platform: PLATFORMS.WEB,
      version: '1.0.0',
      autoHandshake: true,
      debug: process.env.NODE_ENV !== 'production',
      token: authToken,
      getToken: () => authToken,
      listenTokenUpdates: false,
      heartbeatInterval: 30000,
      heartbeatTimeout: 90000,
    });

    wsRef.current = ws;

    const onAuthenticated = () => {
      subscribeAlert(ws);
    };

    ws.on('authenticated', onAuthenticated);
    ws.on(WS_EVENTS.ALERT, handleAlertMessage);
    ws.connect();

    return () => {
      ws.off('authenticated', onAuthenticated);
      ws.off(WS_EVENTS.ALERT, handleAlertMessage);
      teardown(ws);
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, [enabled, authToken, subscribeAlert, handleAlertMessage, teardown]);

  return {};
}

/** 是否应开启 Web 告警推送（已登录且 webEnabled=1） */
export function shouldEnableWebAlarmPush() {
  if (typeof window === 'undefined') return false;
  if (!localStorage.getItem('token')) return false;
  const cfg = readStoredAlertConfig();
  return isAlertFlagOn(cfg?.webEnabled);
}
