/**
 * 用户相关 API
 */
import { request } from '../utils/request';
import { Interface } from '../utils/constants';


/**
 * 邮箱登录
 * @param {string} email - 邮箱地址
 * @param {string} password - 密码
 * @param {string} invitedCode - 邀请码（可选）
 * @param {string} channel - 渠道（pc/tg，可选）
 * @returns {Promise}
 */
export const loginByEmail = (email, password, invitedCode = '', channel = 'pc') => {
  return request({
    url: Interface.MOZI_LOGIN,
    method: 'POST',
    data: {
      chanel: 2,  // 2-邮箱
      type: 'login',
      email,
      password,
      ...(invitedCode && { invitedCode }),
      channel,
    },
  });
};

/**
 * 邮箱注册
 * @param {string} email - 邮箱地址
 * @param {string} password - 密码
 * @param {string} verifyCode - 验证码
 * @param {string} invitedCode - 邀请码（可选）
 * @param {string} channel - 渠道（pc/tg，可选）
 * @returns {Promise}
 */
export const registerByEmail = (email, password, verifyCode, invitedCode = '', channel = 'pc') => {
  return request({
    url: Interface.MOZI_LOGIN,
    method: 'POST',
    data: {
      chanel: 2,  // 2-邮箱
      type: 'register',
      email,
      password,
      verifyCode,
      ...(invitedCode && { invitedCode }),
      channel,
    },
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
 * 钱包签名登录
 * @param {string} address - 钱包地址
 * @param {string} signature - 用户签名
 * @param {string} channel - 渠道（pc/tg，可选）
 * @param {string} invitedCode - 邀请码（可选）
 * @returns {Promise}
 */
export const loginByWallet = (address, signature, channel = 'pc', invitedCode = '') => {
  return request({
    url: Interface.MOZI_LOGIN,
    method: 'POST',
    data: {
      chanel: 4,  // 4-钱包
      type: 'login',
      address,
      signatrue: signature,  // 注意：后端字段名为 signatrue
      channel,
      ...(invitedCode && { invitedCode }),
    },
  });
};

/**
 * Telegram 环境直接登录
 * @param {Object} params - 登录参数
 * @param {string} params.telegramId - Telegram 用户 ID
 * @param {string} params.username - Telegram 用户名
 * @param {string} params.photoUrl - Telegram 头像 URL
 * @param {string} params.hash - Telegram 提供的签名 hash
 * @param {string} params.inviteCode - 邀请码（可选）
 * @param {string} params.env - 环境，'test' 或 'production'
 * @returns {Promise}
 */
export const loginByTelegram = (params) => {
  return request({
    url: Interface.MOZI_LOGIN,
    method: 'POST',
    data: {
      chanel: 3,  // 3-Telegram
      type: 'login',
      telegramId: params.telegramId,
      username: params.username,
      photoUrl: params.photoUrl,
      hash: params.hash,
      inviteCode: params.inviteCode || '',
      channel: 'tg',
      env: params.env || 'test',
    },
  });
};

/**
 * 获取用户详细数据（含邀请码等）
 * @returns {Promise}
 */
export const getUserDataInfo = () => {
  return request({
    url: '/user/datainfo',
    method: 'GET',
  });
};

/**
 * 保存告警设置（绑定邮箱和手机号）
 * @param {Object} params - 告警设置参数
 * @param {boolean} params.phoneEnabled - 是否启用电话告警
 * @param {string} params.countryCode - 国家代码（如 +86）
 * @param {string} params.phone - 手机号
 * @param {boolean} params.emailEnabled - 是否启用邮件告警
 * @param {string} params.email - 邮箱地址
 * @param {boolean} params.pushEnabled - 是否启用推送
 * @param {string} params.channel - 渠道信息
 * @returns {Promise}
 */
export const saveAlarmSettings = (params) => {
  return request({
    url: '/alarm/settings/save',
    method: 'POST',
    data: params,
  });
};

/**
 * 生成账号绑定验证码
 * 用户A为自己生成验证码，供其他账号绑定使用
 * @returns {Promise<{userId: string, bindCode: string, expiresIn: number}>}
 * @example
 * const result = await generateBindCode();
 * // 返回示例：
 * // {
 * //   code: 0,
 * //   errorMsg: null,
 * //   data: {
 * //     userId: "664c19e7-3482-47a4-b48a-2913abb1e5af",
 * //     bindCode: "QD2BMG",
 * //     expiresIn: 1800
 * //   },
 * //   success: true
 * // }
 */
export const generateBindCode = () => {
  return request({
    url: Interface.GENERATE_BIND_CODE,
    method: 'POST',
  });
};

/**
 * 确认账号绑定
 * 用户B使用验证码，将自己绑定到用户A
 * @param {string} bindCode - 验证码
 * @returns {Promise<{userId: string, token: string}>}
 * @example
 * const result = await confirmBind("QD2BMG");
 * // 返回示例：
 * // {
 * //   code: 0,
 * //   errorMsg: null,
 * //   data: {
 * //     userId: "uuid-abc-123",
 * //     token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * //   }
 * // }
 */
export const confirmBind = (bindCode) => {
  return request({
    url: Interface.CONFIRM_BIND,
    method: 'POST',
    data: {
      bindCode,
    },
  });
};

/**
 * 查询告警配置
 * @returns {Promise}
 * @example
 * const result = await getAlertConfig();
 * // 返回示例：
 * // {
 * //   code: 0,
 * //   data: {
 * //     id: 1,
 * //     userId: "user-123",
 * //     alertPhone: "13800138000",
 * //     alertEmail: "test@gmail.com",
 * //     phoneEnabled: 1,
 * //     emailEnabled: 1,
 * //     defaultEnabled: 1,
 * //     createdAt: "2026-01-29T10:00:00",
 * //     updatedAt: "2026-01-29T10:00:00"
 * //   }
 * // }
 * // 未配置时 data 为 null
 */
export const getAlertConfig = () => {
  return request({
    url: Interface.GET_ALERT_CONFIG,
    method: 'GET',
  });
};

/**
 * 新增告警配置
 * @param {Object} params - 告警配置参数
 * @param {string} params.alertPhone - 告警电话（1开头11位手机号，可选）
 * @param {string} params.alertEmail - 告警邮箱（标准邮箱格式，可选）
 * @param {number} params.phoneEnabled - 电话告警开关：0-关闭，1-开启
 * @param {number} params.emailEnabled - 邮箱告警开关：0-关闭，1-开启
 * @param {number} params.defaultEnabled - 默认告警开关：0-关闭，1-开启
 * @returns {Promise}
 * @example
 * const result = await addAlertConfig({
 *   alertPhone: "13800138000",
 *   alertEmail: "test@gmail.com",
 *   phoneEnabled: 1,
 *   emailEnabled: 1,
 *   defaultEnabled: 1
 * });
 */
export const addAlertConfig = (params) => {
  return request({
    url: Interface.ADD_ALERT_CONFIG,
    method: 'POST',
    data: params,
  });
};

/**
 * 修改告警配置
 * @param {Object} params - 告警配置参数
 * @param {string} params.alertPhone - 告警电话（1开头11位手机号，可选）
 * @param {string} params.alertEmail - 告警邮箱（标准邮箱格式，可选）
 * @param {number} params.phoneEnabled - 电话告警开关：0-关闭，1-开启
 * @param {number} params.emailEnabled - 邮箱告警开关：0-关闭，1-开启
 * @param {number} params.defaultEnabled - 默认告警开关：0-关闭，1-开启
 * @returns {Promise}
 * @example
 * const result = await updateAlertConfig({
 *   alertPhone: "13900139000",
 *   alertEmail: "new@gmail.com",
 *   phoneEnabled: 0,
 *   emailEnabled: 1,
 *   defaultEnabled: 1
 * });
 */
export const updateAlertConfig = (params) => {
  return request({
    url: Interface.UPDATE_ALERT_CONFIG,
    method: 'POST',
    data: params,
  });
};
