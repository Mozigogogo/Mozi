import {
  PUBLIC_SITEMAP_ROUTES,
  absoluteUrl,
} from '@/utils/seoConfig';
import { fetchRecentPostsForSitemap } from '@/utils/fetchPostDetailServer';
import { fetchHotTopicsForSitemap } from '@/utils/fetchTopicDetailServer';

/** 静态路由 + 帖子/话题列表：小时级刷新 */
export const revalidate = 3600;

export default async function sitemap() {
  const lastModified = new Date();

  const staticEntries = PUBLIC_SITEMAP_ROUTES.map(
    ({ path, changeFrequency, priority }) => ({
      url: absoluteUrl(path),
      lastModified,
      changeFrequency,
      priority,
    })
  );

  let postEntries = [];
  try {
    const posts = await fetchRecentPostsForSitemap({ maxPosts: 500, pageSize: 100 });
    postEntries = posts.map((post) => {
      const stamp = post.updatedAt || post.createdAt;
      const modified = stamp ? new Date(String(stamp).replace(' ', 'T')) : lastModified;
      return {
        url: absoluteUrl(`/commentinfo?id=${encodeURIComponent(String(post.id))}`),
        lastModified: Number.isNaN(modified.getTime()) ? lastModified : modified,
        changeFrequency: 'daily',
        priority: 0.6,
      };
    });
  } catch {
    postEntries = [];
  }

  let topicEntries = [];
  try {
    const topics = await fetchHotTopicsForSitemap({ maxTopics: 200, pageSize: 100 });
    topicEntries = topics.map((topic) => {
      const stamp = topic.createdAt;
      const modified = stamp ? new Date(String(stamp).replace(' ', 'T')) : lastModified;
      return {
        url: absoluteUrl(`/topicinfo?id=${encodeURIComponent(String(topic.id))}`),
        lastModified: Number.isNaN(modified.getTime()) ? lastModified : modified,
        changeFrequency: 'daily',
        priority: 0.55,
      };
    });
  } catch {
    topicEntries = [];
  }

  return [...staticEntries, ...postEntries, ...topicEntries];
}
