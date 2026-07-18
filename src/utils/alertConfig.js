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

export const MAX_WEBHOOK_URLS = 5;

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
    const list = config.webhookUrls.map((u) => String(u));
    if (list.length > MAX_WEBHOOK_URLS) return list.slice(0, MAX_WEBHOOK_URLS);
    return list;
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

/** 归一化为接口要求的 0/1 */
export function toAlertFlag(value, defaultVal = 0) {
  if (value === 1 || value === true || value === '1') return 1;
  if (value === 0 || value === false || value === '0') return 0;
  return defaultVal;
}

/** TG chatId：优先 WebApp，其次本地缓存 */
export function resolveAlertChatId(fallback = '') {
  if (typeof window === 'undefined') return String(fallback || '').trim();
  try {
    const fromTg = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
    if (fromTg) return fromTg;
  } catch {
    /* ignore */
  }
  const stored =
    localStorage.getItem('tgChatId') ||
    localStorage.getItem('alertChatId') ||
    '';
  return String(stored || fallback || '').trim();
}

/** 微信 openId：优先入参，其次本地缓存 */
export function resolveAlertOpenId(fallback = '') {
  if (typeof window === 'undefined') return String(fallback || '').trim();
  const stored =
    localStorage.getItem('wechatOpenId') ||
    localStorage.getItem('openId') ||
    '';
  return String(stored || fallback || '').trim();
}

/**
 * tgEnabled / wechatEnabled + chatId / openId 校验
 * @returns {{ ok: true, tgEnabled: number, wechatEnabled: number, chatId: string|null, openId: string|null } | { ok: false, error: string }}
 */
export function validateTgWechatAlertFields(config = {}) {
  const tgEnabled = toAlertFlag(config.tgEnabled, 0);
  const wechatEnabled = toAlertFlag(config.wechatEnabled, 0);
  const chatId = config.chatId != null ? String(config.chatId).trim() : '';
  const openId = config.openId != null ? String(config.openId).trim() : '';

  if (tgEnabled !== 0 && tgEnabled !== 1) {
    return { ok: false, error: 'tgEnabled 必须为 0 或 1' };
  }
  if (wechatEnabled !== 0 && wechatEnabled !== 1) {
    return { ok: false, error: 'wechatEnabled 必须为 0 或 1' };
  }
  if (tgEnabled === 1 && !chatId) {
    return { ok: false, error: '开启 Telegram 推送时，chatId 不能为空' };
  }
  if (wechatEnabled === 1 && !openId) {
    return { ok: false, error: '开启微信推送时，openId 不能为空' };
  }

  return {
    ok: true,
    tgEnabled,
    wechatEnabled,
    chatId: chatId || null,
    openId: openId || null,
  };
}

const SERVER_ONLY_ALERT_KEYS = ['id', 'userId', 'createdAt', 'updatedAt'];

/**
 * 合并已有配置 + 本次 patch，生成完整提交体（update 需传完整配置）
 * @param {object} patch
 * @param {object|null} existing
 */
export function buildFullAlertConfigPayload(patch = {}, existing = null) {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...existing }
      : {};
  SERVER_ONLY_ALERT_KEYS.forEach((k) => {
    delete base[k];
  });

  const merged = { ...base, ...patch };

  merged.phoneEnabled = toAlertFlag(merged.phoneEnabled, 0);
  merged.emailEnabled = toAlertFlag(merged.emailEnabled, 0);
  merged.smsEnabled = toAlertFlag(merged.smsEnabled, 0);
  merged.webhookEnabled = toAlertFlag(merged.webhookEnabled, 0);
  merged.tgEnabled = toAlertFlag(merged.tgEnabled, 0);
  merged.wechatEnabled = toAlertFlag(merged.wechatEnabled, 0);

  // 写入接口不传 defaultEnabled（含 null）
  delete merged.defaultEnabled;

  const tgCheck = validateTgWechatAlertFields(merged);
  if (!tgCheck.ok) {
    return { ok: false, error: tgCheck.error };
  }
  merged.tgEnabled = tgCheck.tgEnabled;
  merged.wechatEnabled = tgCheck.wechatEnabled;
  merged.chatId = tgCheck.chatId;
  merged.openId = tgCheck.openId;

  if (Array.isArray(merged.webhookUrls)) {
    merged.webhookUrls = merged.webhookUrls.map((u) => String(u));
  }

  return { ok: true, payload: merged };
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
    datainfo.webhookEnabled != null ||
    datainfo.webhookUrls != null ||
    datainfo.alertFrequency != null ||
    datainfo.tgEnabled != null ||
    datainfo.wechatEnabled != null ||
    datainfo.chatId != null ||
    datainfo.openId != null ||
    datainfo.defaultEnabled != null;

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
  if (datainfo.webhookEnabled != null) out.webhookEnabled = datainfo.webhookEnabled;
  if (Array.isArray(datainfo.webhookUrls)) out.webhookUrls = datainfo.webhookUrls;
  if (datainfo.alertFrequency != null) out.alertFrequency = datainfo.alertFrequency;
  if (datainfo.tgEnabled != null) out.tgEnabled = datainfo.tgEnabled;
  if (datainfo.wechatEnabled != null) out.wechatEnabled = datainfo.wechatEnabled;
  if (datainfo.chatId !== undefined) out.chatId = datainfo.chatId;
  if (datainfo.openId !== undefined) out.openId = datainfo.openId;
  if (datainfo.defaultEnabled != null) out.defaultEnabled = datainfo.defaultEnabled;
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

/** 读取本地已缓存的完整告警配置 */
export function readStoredAlertConfig() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('alertConfig');
    if (!raw || raw === 'null') return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

const ALERT_CONFIG_LOG_PREFIX = '[Mozi/AlertConfig]';

function maskAlertSensitive(value) {
  if (value == null || value === '') return value;
  const text = String(value);
  if (text.length <= 4) return '****';
  return `${'*'.repeat(Math.min(text.length - 4, 6))}${text.slice(-4)}`;
}

/** 日志中脱敏配置字段 */
export function maskAlertConfigForLog(config) {
  if (!config || typeof config !== 'object') return config;
  const next = { ...config };
  if (next.alertPhone != null) next.alertPhone = maskAlertSensitive(next.alertPhone);
  if (next.alertEmail != null) next.alertEmail = maskAlertSensitive(next.alertEmail);
  if (next.chatId != null) next.chatId = maskAlertSensitive(next.chatId);
  if (next.openId != null) next.openId = maskAlertSensitive(next.openId);
  return next;
}

/** 当前登录用户（用于排查换号更新配置） */
export function getAlertConfigActor() {
  if (typeof window === 'undefined') {
    return { userId: null, nickName: null, email: null, wallet: null };
  }

  const userId = localStorage.getItem('userId');
  let nickName = null;
  let email = null;
  let wallet = null;

  try {
    const raw = localStorage.getItem('userInfo');
    if (raw) {
      const info = JSON.parse(raw);
      nickName = info?.nickName || info?.nickname || info?.userName || info?.username || null;
      email = info?.email || null;
      wallet = info?.walletAddress || info?.address || null;
    }
  } catch {
    /* ignore */
  }

  return {
    userId: userId ? String(userId) : null,
    nickName: nickName ? String(nickName) : null,
    email: email ? maskAlertSensitive(email) : null,
    wallet: wallet ? maskAlertSensitive(wallet) : null,
  };
}

/**
 * 告警配置读写日志：对比 clientUserId 与 configUserId，便于排查换号更新
 */
export function logAlertConfigAction(action, extra = {}) {
  const actor = getAlertConfigActor();
  const entry = {
    action,
    at: new Date().toISOString(),
    path: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '',
    clientUserId: actor.userId,
    nickName: actor.nickName,
    wallet: actor.wallet,
    ...extra,
  };

  const configUserId = extra.configUserId != null ? String(extra.configUserId) : null;
  const clientUserId = actor.userId ? String(actor.userId) : null;
  const mismatch = Boolean(configUserId && clientUserId && configUserId !== clientUserId);

  if (mismatch) {
    console.warn(`${ALERT_CONFIG_LOG_PREFIX} account mismatch`, {
      ...entry,
      accountMismatch: true,
      message: '配置所属用户与当前登录用户不一致，疑似换号操作',
    });
    return;
  }

  console.info(`${ALERT_CONFIG_LOG_PREFIX}`, entry);
}
