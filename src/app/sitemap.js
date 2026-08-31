import { PUBLIC_SITEMAP_ROUTES, absoluteUrl } from '@/utils/seoConfig';

/** 由 Next.js 在 /sitemap.xml 输出标准 XML，避免静态文件缺失时被当成 HTML 页面 */
export const dynamic = 'force-static';
export const revalidate = 86400;

export default function sitemap() {
  const lastModified = new Date();

  return PUBLIC_SITEMAP_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}
