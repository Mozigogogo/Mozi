import {
  PUBLIC_SITEMAP_ROUTES,
  absoluteUrl,
} from '@/utils/seoConfig';
import { withSeoLng } from '@/utils/seoI18n';
import { listPcFindTabSitemapPaths } from '@/utils/pcFindNavigation';
import { listPcCommunityTabSitemapPaths } from '@/utils/communityNavigation';
import { fetchRecentPostsForSitemap } from '@/utils/fetchPostDetailServer';
import { fetchHotTopicsForSitemap } from '@/utils/fetchTopicDetailServer';

/** 静态路由 + 帖子/话题列表：小时级刷新 */
export const revalidate = 3600;

/**
 * Sitemap XML 里 `&` 必须写成 `&amp;`，否则 Google 报「分析错误」
 * （如 /pc/find?rankType=up&tab=rank）
 */
function toSitemapUrl(pathOrUrl) {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : absoluteUrl(pathOrUrl);
  return String(url).replace(/&/g, '&amp;');
}

function toStaticEntry(path, { lastModified, changeFrequency, priority }) {
  return {
    url: toSitemapUrl(path),
    lastModified,
    changeFrequency,
    priority,
  };
}

/** 每个公开 path 提交中 + 英两套，便于双语各自收录 */
function expandBilingualPaths(path) {
  return [withSeoLng(path, 'zh'), withSeoLng(path, 'en')];
}

export default async function sitemap() {
  const lastModified = new Date();

  const staticEntries = PUBLIC_SITEMAP_ROUTES.flatMap(
    ({ path, changeFrequency, priority }) =>
      expandBilingualPaths(path).map((p) =>
        toStaticEntry(p, { lastModified, changeFrequency, priority }),
      ),
  );

  // 仅 PC Tab 变体；移动端不做 SEO 收录
  const pcFindTabEntries = listPcFindTabSitemapPaths().flatMap((path) =>
    expandBilingualPaths(path).map((p) =>
      toStaticEntry(p, {
        lastModified,
        changeFrequency: 'hourly',
        priority: 0.82,
      }),
    ),
  );

  const pcCommunityTabEntries = listPcCommunityTabSitemapPaths().flatMap(
    (path) =>
      expandBilingualPaths(path).map((p) =>
        toStaticEntry(p, {
          lastModified,
          changeFrequency: 'hourly',
          priority: 0.8,
        }),
      ),
  );

  let postEntries = [];
  try {
    const posts = await fetchRecentPostsForSitemap({ maxPosts: 500, pageSize: 100 });
    postEntries = posts.flatMap((post) => {
      const stamp = post.updatedAt || post.createdAt;
      const modified = stamp ? new Date(String(stamp).replace(' ', 'T')) : lastModified;
      const base = `/commentinfo?id=${encodeURIComponent(String(post.id))}`;
      return expandBilingualPaths(base).map((p) => ({
        url: toSitemapUrl(p),
        lastModified: Number.isNaN(modified.getTime()) ? lastModified : modified,
        changeFrequency: 'daily',
        priority: 0.6,
      }));
    });
  } catch {
    postEntries = [];
  }

  let topicEntries = [];
  try {
    const topics = await fetchHotTopicsForSitemap({ maxTopics: 200, pageSize: 100 });
    topicEntries = topics.flatMap((topic) => {
      const stamp = topic.createdAt;
      const modified = stamp ? new Date(String(stamp).replace(' ', 'T')) : lastModified;
      const base = `/topicinfo?id=${encodeURIComponent(String(topic.id))}`;
      return expandBilingualPaths(base).map((p) => ({
        url: toSitemapUrl(p),
        lastModified: Number.isNaN(modified.getTime()) ? lastModified : modified,
        changeFrequency: 'daily',
        priority: 0.55,
      }));
    });
  } catch {
    topicEntries = [];
  }

  return [
    ...staticEntries,
    ...pcFindTabEntries,
    ...pcCommunityTabEntries,
    ...postEntries,
    ...topicEntries,
  ];
}
