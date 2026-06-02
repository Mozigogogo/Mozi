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

/** 判断后台接口是否成功（code === 0） */
export function isAdminApiSuccess(res) {
  return res?.code === 0;
}
