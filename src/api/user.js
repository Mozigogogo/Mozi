/**
 * 用户相关 API
 */
import { request } from '../utils/request';


/**
 * 邮箱登录
 * @param {string} email - 邮箱地址
 * @param {string} password - 密码
 * @param {string} loginCode - 登录码
 * @param {string} invitedCode - 邀请码（可选）
 * @returns {Promise}
 */
export const loginByEmail = (email, password, invitedCode = '') => {
  return userLogin({
    chanel: 2,
    type: 'login',
    email,
    password,
    invited_code: invitedCode,
  });
};



/**
 * 邮箱注册
 * @param {string} email - 邮箱地址
 * @param {string} password - 密码
 * @param {string} loginCode - 登录码
 * @param {string} invitedCode - 邀请码（可选）
 * @returns {Promise}
 */
export const registerByEmail = (email, password, invitedCode = '') => {
  // 邮箱注册接口不需要 loginCode 字段（后端不要求）
  return userRegister({
    chanel: 2,
    type: 'register',
    email,
    password,
    invited_code: invitedCode,
  });
};

