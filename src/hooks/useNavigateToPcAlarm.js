/**
 * PC「配置告警」页导航：
 * - 通知渠道已有配置 → 进入第 2 步价格条件
 * - 无配置 → 进入第 1 步通知渠道
 *
 * 入口请统一走本模块，避免各处硬编码 `/pc/alarm?...`。
 */
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAlertConfig } from './useAlertConfig';

export const PC_ALARM_PATH = '/pc/alarm';

/**
 * 读取本地缓存的通知渠道配置
 * @returns {object|null}
 */
export function readLocalPcAlarmNotifyConfig() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('alertConfig');
    if (!raw || raw === 'null') return null;
    const cfg = JSON.parse(raw);
    return cfg && typeof cfg === 'object' ? cfg : null;
  } catch {
    return null;
  }
}

/**
 * 是否已有可用的通知渠道配置
 * @param {object|null|undefined} cfg
 * @returns {boolean}
 */
export function hasPcAlarmNotifyConfig(cfg) {
  return !!(cfg && typeof cfg === 'object');
}

/**
 * 解析应进入的配置步骤
 * @returns {Promise<1|2>}
 */
export async function resolvePcAlarmConfigStep() {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  if (!userId) {
    return hasPcAlarmNotifyConfig(readLocalPcAlarmNotifyConfig()) ? 2 : 1;
  }

  try {
    const cfg = await fetchAlertConfig(false);
    if (hasPcAlarmNotifyConfig(cfg)) return 2;
    return 1;
  } catch {
    return hasPcAlarmNotifyConfig(readLocalPcAlarmNotifyConfig()) ? 2 : 1;
  }
}

/**
 * 构建配置告警页 URL
 * @param {{ symbol?: string, step?: 1|2|string|number }} [options]
 * @returns {string}
 */
export function buildPcAlarmHref({ symbol = 'BTC', step } = {}) {
  const params = new URLSearchParams();
  const sym = String(symbol || 'BTC').trim().toUpperCase() || 'BTC';
  params.set('symbol', sym);
  const stepNum = Number(step);
  if (stepNum === 1 || stepNum === 2) {
    params.set('step', String(stepNum));
  }
  return `${PC_ALARM_PATH}?${params.toString()}`;
}

/**
 * 按当前通知渠道配置状态生成跳转 URL（async）
 * @param {string} [symbol]
 * @returns {Promise<string>}
 */
export async function getPcAlarmHref(symbol = 'BTC') {
  const step = await resolvePcAlarmConfigStep();
  return buildPcAlarmHref({ symbol, step });
}

/**
 * PC 配置告警页统一导航 Hook
 */
export function useNavigateToPcAlarm() {
  const router = useRouter();

  const navigateToPcAlarm = useCallback(
    async (symbol = 'BTC', options = {}) => {
      const { replace = false } = options;
      const href = await getPcAlarmHref(symbol);
      if (replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
      return href;
    },
    [router]
  );

  const replacePcAlarmStep = useCallback(
    (symbol, step) => {
      const href = buildPcAlarmHref({ symbol, step });
      router.replace(href, { scroll: false });
      return href;
    },
    [router]
  );

  return {
    navigateToPcAlarm,
    replacePcAlarmStep,
    getPcAlarmHref,
    buildPcAlarmHref,
    resolvePcAlarmConfigStep,
  };
}

export default useNavigateToPcAlarm;
