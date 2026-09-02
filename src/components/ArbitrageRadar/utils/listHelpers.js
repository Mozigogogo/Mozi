import { arbT } from '../arbitrageTabs';
import { LIST_PAGE_SIZE } from './constants';

export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatListError(msg) {
  const s = String(msg || '').trim();
  if (!s) return arbT('common.serverError');
  if (/status code 404/i.test(s)) return arbT('common.listUnavailable404');
  if (/status code 5\d\d/i.test(s)) return arbT('common.serverError');
  if (/Network Error|Failed to fetch|timeout|ECONNABORTED/i.test(s)) {
    return arbT('common.networkError');
  }
  if (/Request failed with status code/i.test(s)) {
    const code = (s.match(/status code\s+(\d+)/i) || [])[1];
    return code ? arbT('common.requestFailedCode', { code }) : arbT('common.requestFailed');
  }
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}

export function getTotalPages(opsLength) {
  return Math.max(1, Math.ceil((opsLength || 0) / LIST_PAGE_SIZE));
}

export function clampListPage(page, opsLength) {
  const max = getTotalPages(opsLength);
  return Math.max(1, Math.min(max, page));
}

export function getDisplayOps(ops, listPage) {
  const page = clampListPage(listPage, ops.length);
  const start = (page - 1) * LIST_PAGE_SIZE;
  return ops.slice(start, start + LIST_PAGE_SIZE);
}

/** @returns {(number|string)[]} */
export function getPagerPages(totalPages, current) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set([1, totalPages, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

const SORT_KEYS = {
  funding: ['funding', 'ann'],
  spread: ['spreadAbs', 'spreadPct', 'quoteVolume'],
  basis: ['basisAbs', 'basisPct'],
  oi: ['changePct'],
};

const DEFAULT_DESC_KEYS = {
  spread: 'spreadPct',
  basis: 'basisPct',
  oi: 'changePct',
};

/** @returns {{ key: string|null, dir: 'asc'|'desc' }|null} null if key not allowed */
export function nextSortState(activeTab, sortState, key) {
  const allowed = SORT_KEYS[activeTab]?.includes(key);
  if (!allowed) return null;

  const defaultKey = DEFAULT_DESC_KEYS[activeTab];
  const next = { ...sortState };

  if (key === defaultKey) {
    if (sortState.key == null) {
      next.key = key;
      next.dir = 'desc';
    } else if (sortState.key === key && sortState.dir === 'desc') {
      next.key = key;
      next.dir = 'asc';
    } else if (sortState.key === key && sortState.dir === 'asc') {
      next.key = null;
      next.dir = 'desc';
    } else {
      next.key = key;
      next.dir = 'desc';
    }
  } else if (sortState.key === key) {
    next.dir = sortState.dir === 'desc' ? 'asc' : 'desc';
  } else {
    next.key = key;
    next.dir = 'desc';
  }
  return next;
}
