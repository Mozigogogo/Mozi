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
    data: { bindCode },
  });
};

/**
 * 获取未读通知数量
 * @returns {Promise}
 */
export const getUnreadNoticeCount = () => {
  return request({
    url: Interface.GET_UNREAD_COUNT,
  });
};

/**
 * 订阅/取消订阅公告
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.status - 1: 开启, 0: 关闭
 * @param {string} params.channel
 * @param {string} [params.chatId]
 * @returns {Promise}
 */
export const subscribeAnnouncement = (params) => {
  return request({
    url: Interface.SUBSCRIBE_ANNOUNCEMENT,
    method: 'POST',
    data: params,
  });
};

/**
 * 获取我的交互数据
 * @param {Object} params
 * @param {number} params.limit
 * @param {string} params.time - "YYYY-MM" or "YYYY-MM-DD"
 * @returns {Promise}
 */
export const getMyInterface = (params) => {
  return request({
    url: Interface.GET_MY_INTERFACE,
    method: 'POST',
    data: params,
  });
};

/**
 * 更新用户信息
 * @param {Object} params
 * @param {string} [params.nickName]
 * @param {string} [params.avatar]
 * @returns {Promise}
 */
export const updateUserInfo = (params) => {
  return request({
    url: Interface.UPDATE_USER_INFO,
    method: 'POST',
    data: params,
  });
};

/**
 * 提交反馈
 * @param {Object} params
 * @param {number} params.score
 * @param {string} params.content
 * @param {string[]} params.goodFeatures
 * @param {string[]} params.badFeatures
 * @returns {Promise}
 */
export const submitFeedback = (params) => {
  return request({
    url: Interface.MOZI_COMMENT,
    method: 'POST',
    data: params,
  });
};

/**
 * 完成任务
 * @param {string} taskCode
 * @returns {Promise}
 */
export const completeTask = (taskCode) => {
  return request({
    url: Interface.TASK_COMPLETE,
    method: 'POST',
    data: { taskCode },
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
 * 获取用户告警配置（封装方法，带错误处理）
 * @returns {Promise<Object|null>} 返回告警配置对象，未配置或失败时返回 null
 * @example
 * const config = await fetchUserAlertConfig();
 * if (config) {
 *   console.log('电话告警:', config.phoneEnabled);
 *   console.log('邮箱告警:', config.emailEnabled);
 * }
 */
export const fetchUserAlertConfig = async () => {
  try {
    const res = await getAlertConfig();
    
    if (res?.code === 0) {
      if (res.data) {
        console.log('✅ 获取告警配置成功:', res.data);
        return res.data;
      } else {
        console.log('📝 用户暂未配置告警');
        return null;
      }
    } else {
      console.warn('⚠️ 获取告警配置失败:', res?.errorMsg || '未知错误');
      return null;
    }
  } catch (error) {
    console.error('❌ 获取告警配置异常:', error);
    return null;
  }
};

/**
 * 新增告警配置
 * @param {Object} params - 告警配置参数
 * @param {string} params.alertPhone - 告警电话（1开头11位手机号，可选）
 * @param {string} params.alertPhoneCountryCode - 告警电话国家码（如 +1, +86，可选）
 * @param {string} params.alertEmail - 告警邮箱（标准邮箱格式，可选）
 * @param {number} params.phoneEnabled - 电话告警开关：0-关闭，1-开启
 * @param {number} params.emailEnabled - 邮箱告警开关：0-关闭，1-开启
 * @param {number} params.defaultEnabled - 默认告警开关：0-关闭，1-开启
 * @returns {Promise}
 * @example
 * const result = await addAlertConfig({
 *   alertPhone: "13800138000",
 *   alertPhoneCountryCode: "+86",
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
 * 新增告警配置（封装方法，带参数验证和错误处理）
 * @param {Object} config - 告警配置对象
 * @param {string} config.alertPhone - 告警电话
 * @param {string} config.alertPhoneCountryCode - 告警电话国家码（如 +1, +86）
 * @param {string} config.alertEmail - 告警邮箱
 * @param {number} config.phoneEnabled - 电话告警开关：0-关闭，1-开启
 * @param {number} config.emailEnabled - 邮箱告警开关：0-关闭，1-开启
 * @param {number} config.defaultEnabled - 默认告警开关：0-关闭，1-开启
 * @returns {Promise<Object|null>} 返回创建的配置对象，失败时返回 null
 * @example
 * const result = await createAlertConfig({
 *   alertPhone: "13800138000",
 *   alertPhoneCountryCode: "+86",
 *   alertEmail: "test@gmail.com",
 *   phoneEnabled: 1,
 *   emailEnabled: 1,
 *   defaultEnabled: 1
 * });
 */
export const createAlertConfig = async (config) => {
  try {
    // 参数验证
    const { alertPhone, alertPhoneCountryCode, alertEmail, phoneEnabled, emailEnabled, defaultEnabled } = config;
    
    // 验证必填字段
    if (phoneEnabled === undefined || emailEnabled === undefined || defaultEnabled === undefined) {
      console.error('❌ 缺少必填字段: phoneEnabled, emailEnabled, defaultEnabled');
      return { success: false, error: '缺少必填字段' };
    }
    
    // 验证开关值
    if (![0, 1].includes(phoneEnabled) || ![0, 1].includes(emailEnabled) || ![0, 1].includes(defaultEnabled)) {
      console.error('❌ 开关值必须为 0 或 1');
      return { success: false, error: '开关值必须为 0 或 1' };
    }
    
    // 验证电话告警
    if (phoneEnabled === 1) {
      if (!alertPhone || alertPhone.trim() === '') {
        console.error('❌ 开启电话告警时，alertPhone 不能为空');
        return { success: false, error: '开启电话告警时，手机号不能为空' };
      }
    }
    
    // 验证邮箱告警
    if (emailEnabled === 1) {
      if (!alertEmail || alertEmail.trim() === '') {
        console.error('❌ 开启邮箱告警时，alertEmail 不能为空');
        return { success: false, error: '开启邮箱告警时，邮箱不能为空' };
      }
      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(alertEmail)) {
        console.error('❌ 邮箱格式不正确');
        return { success: false, error: '邮箱格式不正确' };
      }
    }
    
    // 调用接口
    const res = await addAlertConfig(config);
    
    if (res?.code === 0 && res?.data) {
      console.log('✅ 新增告警配置成功:', res.data);
      return { success: true, data: res.data };
    } else {
      console.warn('⚠️ 新增告警配置失败:', res?.errorMsg || '未知错误');
      return { success: false, error: res?.errorMsg || '新增失败' };
    }
  } catch (error) {
    console.error('❌ 新增告警配置异常:', error);
    return { success: false, error: error.message || '网络异常' };
  }
};

/**
 * 修改告警配置
 * @param {Object} params - 告警配置参数
 * @param {string} params.alertPhone - 告警电话（1开头11位手机号，可选）
 * @param {string} params.alertPhoneCountryCode - 告警电话国家码（如 +1, +86，可选）
 * @param {string} params.alertEmail - 告警邮箱（标准邮箱格式，可选）
 * @param {number} params.phoneEnabled - 电话告警开关：0-关闭，1-开启
 * @param {number} params.emailEnabled - 邮箱告警开关：0-关闭，1-开启
 * @param {number} params.defaultEnabled - 默认告警开关：0-关闭，1-开启
 * @returns {Promise}
 * @example
 * const result = await updateAlertConfig({
 *   alertPhone: "13900139000",
 *   alertPhoneCountryCode: "+86",
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

/**
 * 修改告警配置（封装方法，带参数验证和错误处理）
 * @param {Object} config - 告警配置对象
 * @param {string} config.alertPhone - 告警电话
 * @param {string} config.alertPhoneCountryCode - 告警电话国家码（如 +1, +86）
 * @param {string} config.alertEmail - 告警邮箱
 * @param {number} config.phoneEnabled - 电话告警开关：0-关闭，1-开启
 * @param {number} config.emailEnabled - 邮箱告警开关：0-关闭，1-开启
 * @param {number} config.defaultEnabled - 默认告警开关：0-关闭，1-开启
 * @returns {Promise<Object|null>} 返回更新后的配置对象，失败时返回 null
 * @example
 * const result = await modifyAlertConfig({
 *   alertPhone: "13900139000",
 *   alertPhoneCountryCode: "+86",
 *   alertEmail: "new@gmail.com",
 *   phoneEnabled: 0,
 *   emailEnabled: 1,
 *   defaultEnabled: 1
 * });
 */
export const modifyAlertConfig = async (config) => {
  try {
    // 参数验证（与 createAlertConfig 相同）
    const { alertPhone, alertPhoneCountryCode, alertEmail, phoneEnabled, emailEnabled, defaultEnabled } = config;
    
    // 验证必填字段
    if (phoneEnabled === undefined || emailEnabled === undefined || defaultEnabled === undefined) {
      console.error('❌ 缺少必填字段: phoneEnabled, emailEnabled, defaultEnabled');
      return { success: false, error: '缺少必填字段' };
    }
    
    // 验证开关值
    if (![0, 1].includes(phoneEnabled) || ![0, 1].includes(emailEnabled) || ![0, 1].includes(defaultEnabled)) {
      console.error('❌ 开关值必须为 0 或 1');
      return { success: false, error: '开关值必须为 0 或 1' };
    }
    
    // 验证电话告警
    if (phoneEnabled === 1) {
      if (!alertPhone || alertPhone.trim() === '') {
        console.error('❌ 开启电话告警时，alertPhone 不能为空');
        return { success: false, error: '开启电话告警时，手机号不能为空' };
      }
    }
    
    // 验证邮箱告警
    if (emailEnabled === 1) {
      if (!alertEmail || alertEmail.trim() === '') {
        console.error('❌ 开启邮箱告警时，alertEmail 不能为空');
        return { success: false, error: '开启邮箱告警时，邮箱不能为空' };
      }
      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(alertEmail)) {
        console.error('❌ 邮箱格式不正确');
        return { success: false, error: '邮箱格式不正确' };
      }
    }
    
    // 调用接口
    const res = await updateAlertConfig(config);
    
    if (res?.code === 0 && res?.data) {
      console.log('✅ 修改告警配置成功:', res.data);
      return { success: true, data: res.data };
    } else {
      console.warn('⚠️ 修改告警配置失败:', res?.errorMsg || '未知错误');
      return { success: false, error: res?.errorMsg || '修改失败' };
    }
  } catch (error) {
    console.error('❌ 修改告警配置异常:', error);
    return { success: false, error: error.message || '网络异常' };
  }
};

/**
 * 保存告警配置（智能判断新增或修改）
 * 自动查询现有配置，如果存在则修改，不存在则新增
 * @param {Object} config - 告警配置对象
 * @param {string} config.alertPhone - 告警电话
 * @param {string} config.alertPhoneCountryCode - 告警电话国家码（如 +1, +86）
 * @param {string} config.alertEmail - 告警邮箱
 * @param {number} config.phoneEnabled - 电话告警开关：0-关闭，1-开启
 * @param {number} config.emailEnabled - 邮箱告警开关：0-关闭，1-开启
 * @param {number} config.defaultEnabled - 默认告警开关：0-关闭，1-开启
 * @returns {Promise<Object>} 返回操作结果
 * @example
 * const result = await saveAlertConfig({
 *   alertPhone: "13800138000",
 *   alertPhoneCountryCode: "+86",
 *   alertEmail: "test@gmail.com",
 *   phoneEnabled: 1,
 *   emailEnabled: 1,
 *   defaultEnabled: 1
 * });
 * 
 * if (result.success) {
 *   console.log('保存成功:', result.data);
 * } else {
 *   console.error('保存失败:', result.error);
 * }
 */
export const saveAlertConfig = async (config) => {
  try {
    // 先查询是否已有配置
    const existingConfig = await fetchUserAlertConfig();
    
    if (existingConfig) {
      // 已有配置，执行修改
      console.log('📝 检测到已有配置，执行修改操作');
      return await modifyAlertConfig(config);
    } else {
      // 无配置，执行新增
      console.log('📝 未检测到配置，执行新增操作');
      return await createAlertConfig(config);
    }
  } catch (error) {
    console.error('❌ 保存告警配置异常:', error);
    return { success: false, error: error.message || '保存失败' };
  }
};
