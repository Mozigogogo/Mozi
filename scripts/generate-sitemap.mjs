/**
 * 本地校验 / 预览用：将 sitemap 写入 public/sitemap.xml。
 * 生产环境请使用 src/app/sitemap.js（Next.js Metadata Route），勿与 public/sitemap.xml 同时存在。
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
