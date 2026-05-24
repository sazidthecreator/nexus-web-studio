// Generate sitemap.xml and robots.txt for a site.
import type { ProjectContent } from "@/lib/blocks";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
}

export function pagePaths(content: ProjectContent): { path: string; name: string }[] {
  const pages = content.pages || [];
  return pages
    .filter((p) => !p.seo?.noindex)
    .map((p, i) => {
      const slug = p.slug ? slugify(p.slug) : slugify(p.name || `page-${i + 1}`);
      return {
        name: p.name || `Page ${i + 1}`,
        path: i === 0 ? "/" : `/${slug}`,
      };
    });
}

export function buildSitemapXml(origin: string, content: ProjectContent, lastmod = new Date()) {
  const base = origin.replace(/\/$/, "");
  const iso = lastmod.toISOString();
  const urls = pagePaths(content)
    .map(
      (p) =>
        `  <url><loc>${base}${p.path}</loc><lastmod>${iso}</lastmod><changefreq>weekly</changefreq><priority>${
          p.path === "/" ? "1.0" : "0.7"
        }</priority></url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRobotsTxt(origin: string, sitemapPath = "/sitemap.xml") {
  const base = origin.replace(/\/$/, "");
  return `User-agent: *\nAllow: /\n\nSitemap: ${base}${sitemapPath}\n`;
}

// For static export — relative paths.
export function buildSitemapXmlForExport(content: ProjectContent, lastmod = new Date()) {
  const iso = lastmod.toISOString();
  const pages = (content.pages || []).filter((p) => !p.seo?.noindex);
  const urls = pages
    .map((p, i) => {
      const slug = p.slug ? slugify(p.slug) : slugify(p.name || `page-${i + 1}`);
      const file = i === 0 ? "index.html" : `${slug}.html`;
      return `  <url><loc>${file}</loc><lastmod>${iso}</lastmod><priority>${i === 0 ? "1.0" : "0.7"}</priority></url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
