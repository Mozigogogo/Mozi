/**
 * 新币上线 / 下架公告列表
 * GET /new_listing
 * GET /new_listing/calendar
 */
import { request } from '../utils/request';
import { Interface } from '../utils/constants';

/** UI tab → API tab */
export function toNewListingApiTab(tab) {
  if (tab === 'listed') return 'listed';
  if (tab === 'delisted' || tab === 'delist') return 'delist';
  return 'upcoming';
}

function formatYmd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日历网格可见区间（含上/下月补位天）
 * @param {Date} monthDate
 * @returns {{ start: Date, end: Date, start_date: string, end_date: string }}
 */
export function getNewListingCalendarGridRange(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - firstDay.getDay());
  start.setHours(0, 0, 0, 0);
  const daysToShow = firstDay.getDay() + lastDay.getDate();
  const totalDays = Math.ceil(daysToShow / 7) * 7;
  const end = new Date(start);
  end.setDate(start.getDate() + totalDays - 1);
  end.setHours(0, 0, 0, 0);
  return {
    start,
    end,
    start_date: formatYmd(start),
    end_date: formatYmd(end),
  };
}

/**
 * @param {Object} [params]
 * @param {'upcoming'|'listed'|'delist'|'delisted'} [params.tab]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} [params.exchange]
 * @param {string} [params.start_date] YYYY-MM-DD
 * @param {string} [params.end_date] YYYY-MM-DD
 * @param {number} [params.recent_window_days]
 * @returns {Promise}
 */
export const getNewListing = (params = {}) => {
  const {
    tab = 'upcoming',
    page = 1,
    limit = 20,
    exchange,
    start_date,
    end_date,
    recent_window_days,
  } = params;

  const query = {
    tab: toNewListingApiTab(tab),
    page: Math.max(1, Number(page) || 1),
    limit: Math.min(100, Math.max(1, Number(limit) || 20)),
  };

  if (exchange) query.exchange = String(exchange);
  if (start_date) query.start_date = start_date;
  if (end_date) query.end_date = end_date;
  if (recent_window_days != null && recent_window_days !== '') {
    query.recent_window_days = Number(recent_window_days);
  }

  return request({
    url: Interface.NEW_LISTING,
    method: 'GET',
    params: query,
  });
};

/**
 * 日历月视图聚合
 * GET /new_listing/calendar
 * @param {Object} params
 * @param {'upcoming'|'listed'|'delist'|'delisted'} params.tab
 * @param {string} params.start_date
 * @param {string} params.end_date
 * @param {string} [params.exchange]
 */
export const getNewListingCalendar = (params = {}) => {
  const { tab, start_date, end_date, exchange } = params;
  const query = {
    tab: toNewListingApiTab(tab),
    start_date,
    end_date,
  };
  if (exchange) query.exchange = String(exchange);

  return request({
    url: Interface.NEW_LISTING_CALENDAR,
    method: 'GET',
    params: query,
  });
};

/**
 * 解析 /new_listing 出参
 * @returns {{ list: Array, total: number, listTs: number|null, dataDelaySec: number|null }}
 */
export function parseNewListingResponse(res) {
  if (!res) {
    return { list: [], total: 0, listTs: null, dataDelaySec: null };
  }
  // 业务失败
  if (res.code != null && res.code !== 0 && !res.success) {
    return { list: [], total: 0, listTs: null, dataDelaySec: null };
  }

  const payload = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(payload)) {
    return { list: payload, total: payload.length, listTs: null, dataDelaySec: null };
  }
  if (!payload || typeof payload !== 'object') {
    return { list: [], total: 0, listTs: null, dataDelaySec: null };
  }

  const list = Array.isArray(payload.list)
    ? payload.list
    : Array.isArray(payload.rows)
      ? payload.rows
      : Array.isArray(payload.items)
        ? payload.items
        : [];
  const total = Number.isFinite(Number(payload.total))
    ? Number(payload.total)
    : Number.isFinite(Number(payload.count))
      ? Number(payload.count)
      : list.length;

  return {
    list,
    total,
    listTs: payload.list_ts ?? payload.listTs ?? null,
    dataDelaySec: payload.data_delay_sec ?? payload.dataDelaySec ?? null,
  };
}

/**
 * 解析 /new_listing/calendar 出参
 * @returns {{
 *   days: Array<{ date: string, count: number, exchanges: string[], has_tbd: boolean }>,
 *   dayMap: Record<string, { date: string, count: number, exchanges: string[], has_tbd: boolean }>,
 *   latestTs: number,
 *   listTs: number|null,
 *   dataDelaySec: number|null
 * }}
 */
export function parseNewListingCalendarResponse(res) {
  const empty = {
    days: [],
    dayMap: {},
    latestTs: 0,
    listTs: null,
    dataDelaySec: null,
  };
  if (!res) return empty;
  if (res.code != null && res.code !== 0 && !res.success) return empty;

  const payload = res?.data?.data ?? res?.data ?? res;
  if (!payload || typeof payload !== 'object') return empty;

  const daysRaw = Array.isArray(payload.days) ? payload.days : [];
  const days = daysRaw
    .map((item) => ({
      date: String(item?.date || '').trim(),
      count: Number(item?.count) || 0,
      exchanges: Array.isArray(item?.exchanges)
        ? item.exchanges.map((x) => String(x || '').trim()).filter(Boolean)
        : [],
      has_tbd: !!item?.has_tbd,
    }))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  const dayMap = days.reduce((acc, item) => {
    acc[item.date] = item;
    return acc;
  }, {});

  const latestTsRaw = Number(payload.latest_ts ?? payload.latestTs ?? 0);
  return {
    days,
    dayMap,
    latestTs: Number.isFinite(latestTsRaw) ? latestTsRaw : 0,
    listTs: payload.list_ts ?? payload.listTs ?? null,
    dataDelaySec: payload.data_delay_sec ?? payload.dataDelaySec ?? null,
  };
}

export default getNewListing;
