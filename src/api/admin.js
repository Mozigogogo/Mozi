/**
 * 后台管理 API
 */
import axios from 'axios';
import { INTERFACE_URL, Interface } from '../utils/constants';

const ADMIN_TOKEN_KEY = 'adminToken';
const ADMIN_INFO_KEY = 'adminInfo';
const ADMIN_TOKEN_HEADER = 'X-Admin-Token';

const adminInstance = axios.create({
  baseURL: INTERFACE_URL,
  timeout: 60000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export function getAdminToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

adminInstance.interceptors.request.use((config) => {
  const token = getAdminToken();
  const hasAdminToken =
    config.headers[ADMIN_TOKEN_HEADER] ||
    config.headers['x-admin-token'] ||
    (config.headers.has && config.headers.has(ADMIN_TOKEN_HEADER));

  if (token && !hasAdminToken) {
    config.headers[ADMIN_TOKEN_HEADER] = token;
  }

  return config;
});

export function getAdminInfo() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ADMIN_INFO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAdminSession(token, info) {
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }
  localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(info || {}));
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_INFO_KEY);
}

export function isAdminLoggedIn() {
  return Boolean(getAdminToken());
}

/**
 * 解析登录响应中的 token 与管理员信息
 * @param {object} data - 接口返回的 data 字段
 */
export function parseAdminLoginData(data) {
  if (!data || typeof data !== 'object') {
    return { token: '', adminInfo: null };
  }
  const token =
    data.token ||
    data.accessToken ||
    data.adminToken ||
    data.xAdminToken ||
    data['X-Admin-Token'] ||
    data.authentication ||
    '';
  const adminInfo =
    data.adminInfo ||
    data.admin ||
    data.userInfo ||
    (data.username
      ? {
          username: data.username,
          nickName: data.nickName || data.nickname || data.username,
          nickname: data.nickname || data.nickName,
        }
      : null);
  return { token, adminInfo };
}

/** 管理员登录 POST /admin/auth/login */
export async function adminLogin(username, password) {
  const res = await adminInstance.post(Interface.ADMIN_LOGIN, { username, password });
  return res.data;
}

/**
 * @typedef {Object} AdminOverviewData
 * @property {number} [userTotalCount] - 总用户数
 * @property {number} [totalCommissionAmount] - 累计分佣金额
 * @property {number} [pendingCommissionAmount] - 待审核分佣金额
 */

/** 查询概览 GET /admin/overview */
export async function getAdminOverview() {
  const res = await adminInstance.get(Interface.ADMIN_OVERVIEW);
  return res.data;
}

/** 解析概览统计 */
export function normalizeAdminOverview(data) {
  if (!data || typeof data !== 'object') {
    return {
      userTotalCount: 0,
      totalCommissionAmount: 0,
      pendingCommissionAmount: 0,
    };
  }
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    userTotalCount: toNum(data.userTotalCount),
    totalCommissionAmount: toNum(data.totalCommissionAmount),
    pendingCommissionAmount: toNum(data.pendingCommissionAmount),
  };
}

/**
 * @typedef {Object} CommissionLevelPayload
 * @property {string} levelCode - 等级编码，如 L1
 * @property {string} levelName - 等级名称，如 普通代理
 * @property {string} commissionRate - 分佣比例，如 0.1
 * @property {string} [description] - 等级说明
 */

/**
 * @typedef {Object} AdminApiResponse
 * @property {number} code
 * @property {string} [errorMsg]
 * @property {*} [data]
 */

function commissionLevelPath(id) {
  return `${Interface.ADMIN_COMMISSION_LEVELS}/${encodeURIComponent(String(id))}`;
}

/** 查询分佣等级列表 GET /admin/commission/levels */
export async function listCommissionLevels() {
  const res = await adminInstance.get(Interface.ADMIN_COMMISSION_LEVELS);
  return res.data;
}

/** 创建分佣等级 POST /admin/commission/levels */
export async function createCommissionLevel(payload) {
  const res = await adminInstance.post(Interface.ADMIN_COMMISSION_LEVELS, payload);
  return res.data;
}

/** 查询分佣等级详情 GET /admin/commission/levels/{id} */
export async function getCommissionLevel(id) {
  const res = await adminInstance.get(commissionLevelPath(id));
  return res.data;
}

/** 更新分佣等级 PUT /admin/commission/levels/{id} */
export async function updateCommissionLevel(id, payload) {
  const res = await adminInstance.put(commissionLevelPath(id), payload);
  return res.data;
}

/** 删除分佣等级 DELETE /admin/commission/levels/{id} */
export async function deleteCommissionLevel(id) {
  const res = await adminInstance.delete(commissionLevelPath(id));
  return res.data;
}

/**
 * @typedef {Object} AdminUserListParams
 * @property {string} [nickName] - 昵称模糊匹配
 * @property {number} [page] - 页码，从 1 开始
 * @property {number} [size] - 每页条数，最大 100
 */

/**
 * @typedef {Object} UpdateUserCommissionLevelPayload
 * @property {string} userId - 用户 ID
 * @property {number|null} commissionLevelId - 分佣等级 ID，传 null 表示取消分配
 */

/** 分页查询用户 GET /admin/users */
export async function listAdminUsers(params = {}) {
  const res = await adminInstance.get(Interface.ADMIN_USERS, { params });
  return res.data;
}

/** 修改用户分佣等级 PUT /admin/users/commission-level */
export async function updateUserCommissionLevel(payload) {
  const res = await adminInstance.put(Interface.ADMIN_USER_COMMISSION_LEVEL, payload);
  return res.data;
}

/**
 * @typedef {Object} AdminCommissionWithdrawListParams
 * @property {'PENDING'|'PAID'|'REJECTED'} [status]
 * @property {number} [page]
 * @property {number} [size]
 */

/**
 * @typedef {Object} UpdateCommissionWithdrawStatusPayload
 * @property {'PAID'|'REJECTED'} status
 * @property {string} [txHash] - 改为 PAID 时必填
 * @property {string} [remark] - 改为 REJECTED 时可填驳回原因
 */

function adminCommissionWithdrawPath(id) {
  return `${Interface.ADMIN_COMMISSION_WITHDRAWALS}/${encodeURIComponent(String(id))}/status`;
}

/** 分页查询分佣提现申请 GET /admin/commission/withdrawals */
export async function listAdminCommissionWithdrawals(params = {}) {
  const res = await adminInstance.get(Interface.ADMIN_COMMISSION_WITHDRAWALS, { params });
  return res.data;
}

/** 修改分佣提现申请状态 PUT /admin/commission/withdrawals/{id}/status */
export async function updateAdminCommissionWithdrawalStatus(id, payload) {
  const res = await adminInstance.put(adminCommissionWithdrawPath(id), payload);
  return res.data;
}

/**
 * @typedef {Object} AdminTgGroupListParams
 * @property {number} [page] - 页码，从 1 开始
 * @property {number} [size] - 每页条数
 * @property {0|1} [status] - 状态：0 停用，1 正常
 */

/** 分页查询 TG 群组 GET /admin/tg/groups */
export async function listAdminTgGroups(params = {}) {
  const res = await adminInstance.get(Interface.ADMIN_TG_GROUPS, { params });
  return res.data;
}

/** 解析 TG 群组分页列表 */
export function normalizeAdminTgGroupPage(data) {
  if (!data || typeof data !== 'object') {
    return { list: [], total: 0, page: 1, size: 20 };
  }
  const list = Array.isArray(data.list) ? data.list : [];
  return {
    list,
    total: Number(data.total) || list.length,
    page: Number(data.page) || 1,
    size: Number(data.size) || 20,
  };
}

/**
 * @typedef {Object} AdminTgGroupCommandUsageParams
 * @property {string} startDate - 起始日期 yyyy-MM-dd
 * @property {string} endDate - 结束日期 yyyy-MM-dd
 * @property {number|string} [groupId] - Telegram 群 ID
 * @property {string} [groupTitle] - 群名称模糊匹配
 * @property {string} [command] - 指令筛选，如 /price
 */

/** 查询 TG 群指令日用量 GET /admin/tg/groups/command/usages */
export async function getAdminTgGroupCommandUsages(params = {}) {
  const res = await adminInstance.get(Interface.ADMIN_TG_GROUP_COMMAND_USAGES, { params });
  return res.data;
}

/** 将接口返回的列表字段统一为数组 */
function toRecordArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

/** 解析 TG 群指令日用量 */
export function normalizeAdminTgGroupCommandUsages(data) {
  if (!data || typeof data !== 'object') {
    return { startDate: '', endDate: '', dailyStats: [] };
  }
  const dailyStats = toRecordArray(data.dailyStats).map((day) => ({
    statDate: day?.statDate || day?.stat_date || '',
    useCount: Number(day?.useCount ?? day?.use_count) || 0,
    groups: toRecordArray(day?.groups).map((group) => ({
      groupId: group?.groupId ?? group?.group_id,
      groupTitle: group?.groupTitle || group?.group_title || group?.title || '',
      useCount: Number(group?.useCount ?? group?.use_count) || 0,
      commands: toRecordArray(group?.commands).map((cmd) => ({
        command: cmd?.command || '',
        useCount: Number(cmd?.useCount ?? cmd?.use_count) || 0,
      })),
    })),
  }));
  return {
    startDate: data.startDate || data.start_date || '',
    endDate: data.endDate || data.end_date || '',
    dailyStats,
  };
}

/** 解析提现申请分页列表 */
export function normalizeAdminWithdrawPage(data) {
  if (!data || typeof data !== 'object') {
    return { list: [], total: 0, page: 1, size: 20 };
  }
  const list = Array.isArray(data.list) ? data.list : [];
  return {
    list,
    total: Number(data.total) || list.length,
    page: Number(data.page) || 1,
    size: Number(data.size) || 20,
  };
}

/** 解析用户分页列表 */
export function normalizeAdminUserPage(data) {
  if (!data || typeof data !== 'object') {
    return { list: [], total: 0, page: 1, size: 20 };
  }
  const list = Array.isArray(data.list)
    ? data.list
    : Array.isArray(data.records)
      ? data.records
      : [];
  return {
    list,
    total: Number(data.total) || list.length,
    page: Number(data.page) || 1,
    size: Number(data.size) || 20,
  };
}

/** 判断后台接口是否成功（code === 0） */
export function isAdminApiSuccess(res) {
  return res?.code === 0;
}
