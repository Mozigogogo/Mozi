/**
 * 财经日历相关 API
 */

import { request } from '../utils/request';
import { Interface } from '../utils/constants';

/**
 * 获取财经日历
 * @returns {Promise}
 */
export const getFinanceCalendar = async () => {
  // 根据前端当前语言动态设置 Accept-Language
  let lang = 'en';
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('i18nextLng') || '';
    const lower = stored.toLowerCase();
    if (lower.startsWith('zh')) {
      lang = 'zh';
    } else if (lower.startsWith('en')) {
      lang = 'en';
    }
  }

  return request({
    url: Interface.GET_FINANCE_CALENDAR,
    method: 'GET',
    headers: { 'Accept-Language': lang },
  });
};

