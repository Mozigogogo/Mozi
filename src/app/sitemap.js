import { absoluteUrl, PUBLIC_SITEMAP_ROUTES } from '@/utils/seoConfig';

/**
 * https://moziai.xyz/sitemap.xml
 */
export default function sitemap() {
  const lastModified = new Date();

  return PUBLIC_SITEMAP_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}
