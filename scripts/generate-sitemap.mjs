/**
 * 构建时生成静态 sitemap.xml 到 public/，由 nginx/Next 直接托管。
 * 业内常见做法：避免 App Router metadata route 在 GSC 出现 Couldn't fetch。
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const { PUBLIC_SITEMAP_ROUTES, absoluteUrl } = await import(
  join(root, 'src/utils/seoConfig.js')
);

const lastmod = new Date().toISOString();

const urls = PUBLIC_SITEMAP_ROUTES.map(({ path, changeFrequency, priority }) => {
  const loc = absoluteUrl(path);
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

writeFileSync(join(root, 'public/sitemap.xml'), xml, 'utf8');
console.log(`[sitemap] wrote ${PUBLIC_SITEMAP_ROUTES.length} URLs to public/sitemap.xml`);
