import { API_BASE_URL } from '../../config/index.js';

function apiBase() {
  return String(API_BASE_URL || '').replace(/\/$/, '');
}

/**
 * 服务端拉取帖子详情（公开读，无需登录）
 * @param {string|number} postId
 * @returns {Promise<object|null>}
 */
export async function fetchPostDetailServer(postId) {
  const id = String(postId ?? '').trim();
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return null;

  const base = apiBase();
  if (!base) return null;

  try {
    const res = await fetch(`${base}/posts/${encodeURIComponent(id)}`, {
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
 * 拉取最近帖子列表，供 sitemap 收录
 * @returns {Promise<Array<{ id: string|number, updatedAt?: string, createdAt?: string }>>}
 */
export async function fetchRecentPostsForSitemap({
  maxPosts = 500,
  pageSize = 100,
} = {}) {
  const base = apiBase();
  if (!base) return [];

  const size = Math.min(Math.max(Number(pageSize) || 100, 1), 100);
  const limit = Math.min(Math.max(Number(maxPosts) || 500, 1), 5000);
  const pages = Math.ceil(limit / size);
  const posts = [];
  const seen = new Set();

  for (let page = 1; page <= pages; page += 1) {
    try {
      const res = await fetch(`${base}/posts?page=${page}&size=${size}`, {
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
        posts.push({
          id,
          updatedAt: item.updatedAt,
          createdAt: item.createdAt,
        });
        if (posts.length >= limit) return posts;
      }

      const totalPages = Number(json?.data?.totalPages) || pages;
      if (page >= totalPages) break;
    } catch {
      break;
    }
  }

  return posts;
}
