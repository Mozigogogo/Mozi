/**
 * 后台管理 API — 当前仅对接登录接口
 */
import axios from 'axios';
import { INTERFACE_URL, Interface } from '../utils/constants';

const ADMIN_TOKEN_KEY = 'adminToken';
const ADMIN_INFO_KEY = 'adminInfo';

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
