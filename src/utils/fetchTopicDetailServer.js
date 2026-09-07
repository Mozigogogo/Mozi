import { API_BASE_URL } from '../../config/index.js';

function apiBase() {
  return String(API_BASE_URL || '').replace(/\/$/, '');
}

/**
 * 服务端拉取话题详情 GET /topic/{id}
 * @returns {Promise<object|null>}
 */
export async function fetchTopicDetailServer(topicId) {
  const id = String(topicId ?? '').trim();
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return null;

  const base = apiBase();
  if (!base) return null;

  try {
    const res = await fetch(`${base}/topic/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.code !== 0 || !json?.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

/**
 * 热门话题列表，供 sitemap 收录
 */
export async function fetchHotTopicsForSitemap({
  maxTopics = 200,
  pageSize = 100,
} = {}) {
  const base = apiBase();
  if (!base) return [];

  const size = Math.min(Math.max(Number(pageSize) || 100, 1), 100);
  const limit = Math.min(Math.max(Number(maxTopics) || 200, 1), 2000);
  const pages = Math.ceil(limit / size);
  const topics = [];
  const seen = new Set();

  for (let page = 1; page <= pages; page += 1) {
    try {
      const res = await fetch(`${base}/topic/hot?page=${page}&size=${size}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;
      const json = await res.json();
      const batch = Array.isArray(json?.data?.data) ? json.data.data : [];
      if (batch.length === 0) break;

      for (const item of batch) {
        const id = item?.id;
        if (id == null || seen.has(String(id))) continue;
        seen.add(String(id));
        topics.push({
          id,
          name: item.name || item.title,
          createdAt: item.createdAt,
        });
        if (topics.length >= limit) return topics;
      }

      const totalPages = Number(json?.data?.totalPages) || pages;
      if (page >= totalPages) break;
    } catch {
      break;
    }
  }

  return topics;
}
