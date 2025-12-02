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


/**
 * 发送邮箱验证码
 * @param {string} email - 收件人邮箱地址
 * @param {string} language - 语言设置（zh-中文，en-英文）
 * @returns {Promise}
 */
export const sendVerificationCode = (email, language = 'zh') => {
  return request({
    url: '/email/sendVerificationCode',
    method: 'POST',
    data: {
      email,
      language,
    },
  });
};

/**
 * 白名单用户注册
 * @param {string} email - 邮箱地址
 * @param {string} verificationCode - 验证码
 * @param {string} password - 密码
 * @returns {Promise}
 */
export const whitelistRegister = (email, verificationCode, password) => {
  return request({
    url: '/user/login',
    method: 'POST',
    data: {
      chanel: 2,            // 2-邮箱注册
      type: 'register',
      email,
      verifyCode: verificationCode,
      password,
      source: 'whitelist',  // 标识白名单用户来源
    },
  });
};

/**
 * 钱包签名登录
 * @param {string} address - 钱包地址
 * @param {string} signature - 用户签名
 * @returns {Promise}
 */
export const loginByWallet = (address, signature) => {
  return request({
    url: '/user/login',
    method: 'POST',
    data: {
      type: 'login',
      chanel: 3,  // 3-钱包登录
      address,
      signatrue: signature,  // 注意：后端字段名为 signatrue
    },
  });
};

