/** 后端 alertFrequency 枚举 */
export const ALERT_FREQUENCY_API = {
  CONTINUOUS: 'continuous',
  DAILY_ONCE: 'daily_once',
  ONCE_ONLY: 'once_only',
};

/** 弹窗 UI 用的频次 id */
export const ALERT_FREQUENCY_UI = {
  CONTINUOUS: 'continuous',
  DAILY: 'daily',
  ONCE: 'once',
};

export const MAX_WEBHOOK_URLS = 20;

const API_TO_UI = {
  [ALERT_FREQUENCY_API.CONTINUOUS]: ALERT_FREQUENCY_UI.CONTINUOUS,
  [ALERT_FREQUENCY_API.DAILY_ONCE]: ALERT_FREQUENCY_UI.DAILY,
  [ALERT_FREQUENCY_API.ONCE_ONLY]: ALERT_FREQUENCY_UI.ONCE,
  // 兼容旧版本地缓存
  daily: ALERT_FREQUENCY_UI.DAILY,
  once: ALERT_FREQUENCY_UI.ONCE,
};

const UI_TO_API = {
  [ALERT_FREQUENCY_UI.CONTINUOUS]: ALERT_FREQUENCY_API.CONTINUOUS,
  [ALERT_FREQUENCY_UI.DAILY]: ALERT_FREQUENCY_API.DAILY_ONCE,
  [ALERT_FREQUENCY_UI.ONCE]: ALERT_FREQUENCY_API.ONCE_ONLY,
};

/** 后端 → UI；空值按后端默认 daily_once */
export function alertFrequencyFromApi(apiValue) {
  if (apiValue == null || apiValue === '') {
    return ALERT_FREQUENCY_UI.DAILY;
  }
  return API_TO_UI[String(apiValue)] || ALERT_FREQUENCY_UI.DAILY;
}

/** UI → 后端 */
export function alertFrequencyToApi(uiValue) {
  return UI_TO_API[String(uiValue)] || ALERT_FREQUENCY_API.DAILY_ONCE;
}

/** 从配置对象解析 Webhook URL 列表（至少返回一个空输入行） */
export function parseWebhookUrlsFromConfig(config) {
  if (!config || typeof config !== 'object') return [''];
  if (Array.isArray(config.webhookUrls)) {
    if (config.webhookUrls.length === 0) return [''];
    return config.webhookUrls.map((u) => String(u));
  }
  if (typeof config.webhookUrl === 'string' && config.webhookUrl.trim()) {
    return [config.webhookUrl.trim()];
  }
  return [''];
}

/**
 * @param {string[]} urls
 * @param {number|boolean} webhookEnabled
 * @returns {{ ok: true, urls: string[] } | { ok: false, error: 'empty'|'max'|'invalid' }}
 */
export function validateWebhookUrls(urls, webhookEnabled) {
  const hookOn = webhookEnabled === 1 || webhookEnabled === true;
  if (!hookOn) {
    return { ok: true, urls: [] };
  }

  const trimmed = (Array.isArray(urls) ? urls : [])
    .map((u) => String(u || '').trim())
    .filter(Boolean);

  if (trimmed.length === 0) {
    return { ok: false, error: 'empty' };
  }
  if (trimmed.length > MAX_WEBHOOK_URLS) {
    return { ok: false, error: 'max' };
  }

  for (const w of trimmed) {
    try {
      const u = new URL(w);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return { ok: false, error: 'invalid' };
      }
    } catch {
      return { ok: false, error: 'invalid' };
    }
  }

  return { ok: true, urls: trimmed };
}

/** 从 GET /user/alert/config 或 datainfo 片段归一化开关 */
export function isAlertFlagOn(value) {
  return value === 1 || value === true || value === '1';
}

/**
 * 从 datainfo 提取告警字段（与 GET /user/alert/config 对齐）
 * @param {object | null | undefined} datainfo
 */
export function pickAlertConfigFromDatainfo(datainfo) {
  if (!datainfo || typeof datainfo !== 'object') return null;

  const hasAny =
    datainfo.alertPhone != null ||
    datainfo.alertPhoneCountryCode != null ||
    datainfo.alertEmail != null ||
    datainfo.phoneEnabled != null ||
    datainfo.emailEnabled != null ||
    datainfo.smsEnabled != null ||
    datainfo.defaultEnabled != null ||
    datainfo.webhookEnabled != null ||
    datainfo.webhookUrls != null ||
    datainfo.alertFrequency != null;

  if (!hasAny) return null;

  const out = {};
  if (datainfo.alertPhone != null) out.alertPhone = datainfo.alertPhone;
  if (datainfo.alertPhoneCountryCode != null) {
    out.alertPhoneCountryCode = datainfo.alertPhoneCountryCode;
  }
  if (datainfo.alertEmail != null) out.alertEmail = datainfo.alertEmail;
  if (datainfo.phoneEnabled != null) out.phoneEnabled = datainfo.phoneEnabled;
  if (datainfo.emailEnabled != null) out.emailEnabled = datainfo.emailEnabled;
  if (datainfo.smsEnabled != null) out.smsEnabled = datainfo.smsEnabled;
  if (datainfo.defaultEnabled != null) out.defaultEnabled = datainfo.defaultEnabled;
  if (datainfo.webhookEnabled != null) out.webhookEnabled = datainfo.webhookEnabled;
  if (Array.isArray(datainfo.webhookUrls)) out.webhookUrls = datainfo.webhookUrls;
  if (datainfo.alertFrequency != null) out.alertFrequency = datainfo.alertFrequency;
  return out;
}

/**
 * datainfo 中的告警字段写入 localStorage.alertConfig（不覆盖未返回的键）
 */
export function syncAlertConfigFromDatainfo(datainfo) {
  if (typeof window === 'undefined') return;
  const slice = pickAlertConfigFromDatainfo(datainfo);
  if (!slice) return;

  try {
    const raw = localStorage.getItem('alertConfig');
    const prev = raw && raw !== 'null' ? JSON.parse(raw) : {};
    localStorage.setItem('alertConfig', JSON.stringify({ ...prev, ...slice }));
  } catch {
    /* ignore */
  }
}
