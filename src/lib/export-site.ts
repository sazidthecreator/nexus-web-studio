// Static HTML/CSS export. Renders each page with React's static renderer
// and bundles them into a ZIP with index.html, page HTMLs, and a styles.css.
// Uses Tailwind Play CDN so utility classes from BlockRenderer keep working.
import JSZip from "jszip";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { BlockRenderer } from "@/components/block-renderer";
import type { Block, ProjectContent } from "@/lib/blocks";
import { buildSitemapXmlForExport } from "@/lib/seo/sitemap";
import { autoFaqsFromContent, buildJsonLd, jsonLdScript } from "@/lib/seo/jsonld";
import { manifestFromContent } from "@/lib/pwa/manifest";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
}

function pageHtml(opts: {
  title: string;
  description?: string;
  fontFamily: string;
  primaryColor: string;
  bodyHtml: string;
  nav: { name: string; file: string; active: boolean }[];
  siteName: string;
  jsonLd?: string;
}) {
  const fontName = (opts.fontFamily.match(/'([^']+)'|^([\w\s]+?),/) || [])
    .slice(1).find(Boolean) || "Inter";
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700;800&display=swap`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(opts.title)}</title>
${opts.description ? `<meta name="description" content="${escapeHtml(opts.description)}" />` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontUrl}" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="./styles.css" />
<link rel="manifest" href="./manifest.webmanifest" />
<meta name="theme-color" content="${opts.primaryColor}" />
<style>:root{--brand:${opts.primaryColor};}body{font-family:${opts.fontFamily};}</style>
${opts.jsonLd || ""}
</head>
<body class="bg-white text-slate-900">
${opts.bodyHtml}
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

const STYLES_CSS = `/* Site-wide custom styles. Tailwind utilities come from Play CDN. */
html { scroll-behavior: smooth; }
img { max-width: 100%; height: auto; }
a { transition: opacity .2s ease; }
`;

const README = (siteName: string) => `# ${siteName} — Static Export

This folder contains a static HTML build of your site.

## Files
- index.html — homepage
- *.html — additional pages
- styles.css — global custom styles
- content.json — raw block JSON (re-import into the editor)

## Hosting
Drop this folder into Netlify, Vercel, GitHub Pages, Cloudflare Pages, or any
static host. No build step required.

## Notes
- Tailwind utility classes are loaded via the Tailwind Play CDN.
  For production you may want to replace with a compiled Tailwind build.
- Fonts are loaded from Google Fonts.
`;

export async function exportSiteZip(content: ProjectContent, projectName: string) {
  const zip = new JSZip();
  const pages = content.pages || [];
  const nav = pages.map((p, i) => ({
    name: p.name || `Page ${i + 1}`,
    file: i === 0 ? "index.html" : `${slugify(p.name || `page-${i + 1}`)}.html`,
    active: false,
  }));

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const visibleBlocks = (page.blocks || []).filter((b: Block) => !b.props?.__hidden);
    const body = visibleBlocks
      .map((b) => renderToStaticMarkup(createElement(BlockRenderer, { block: b, branding: content.branding })))
      .join("\n");

    const websiteLd = jsonLdScript(buildJsonLd({
      type: "WebSite",
      name: content.branding.siteName || projectName,
    }));
    const faqs = autoFaqsFromContent({ ...content, pages: [page] } as ProjectContent);
    const faqLd = faqs.length ? jsonLdScript(buildJsonLd({ type: "FAQPage", faqs })) : "";

    const html = pageHtml({
      title: `${page.name || projectName} — ${content.branding.siteName}`,
      fontFamily: content.branding.fontFamily,
      primaryColor: content.branding.primaryColor,
      bodyHtml: body,
      nav: nav.map((n, j) => ({ ...n, active: j === i })),
      siteName: content.branding.siteName,
      jsonLd: websiteLd + faqLd,
    });

    zip.file(nav[i].file, html);
  }

  zip.file("styles.css", STYLES_CSS);
  zip.file("content.json", JSON.stringify(content, null, 2));
  zip.file("sitemap.xml", buildSitemapXmlForExport(content));
  zip.file("robots.txt", "User-agent: *\nAllow: /\n\nSitemap: sitemap.xml\n");
  zip.file("manifest.webmanifest", JSON.stringify(manifestFromContent(content), null, 2));
  zip.file("README.md", README(content.branding.siteName || projectName));

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(projectName)}-export.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
