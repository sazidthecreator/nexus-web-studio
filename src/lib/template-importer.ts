// Template Import Engine — fetch external HTML and convert sections of the DOM
// into the internal block JSON schema used by the editor.

import { uid, type Block, type ProjectContent } from "./blocks";
import { DEFAULT_BRANDING } from "./blocks";

export type ImportResult = {
  content: ProjectContent;
  thumbnailDataUrl: string;
  detectedTitle: string;
  detectedColor: string;
  blockCount: number;
};

function absolutize(href: string | null | undefined, base: string): string {
  if (!href) return "#";
  try { return new URL(href, base).toString(); } catch { return href; }
}

function clean(text: string | null | undefined, max = 240): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

function pickPrimaryColor(doc: Document): string {
  // Heuristic: meta theme-color → first inline button bg → fallback brand
  const meta = doc.querySelector('meta[name="theme-color"]')?.getAttribute("content");
  if (meta && /^#?[0-9a-f]{3,8}$/i.test(meta.replace("#", ""))) {
    return meta.startsWith("#") ? meta : `#${meta}`;
  }
  return DEFAULT_BRANDING.primaryColor;
}

function isLikelyNav(el: Element): boolean {
  if (el.tagName === "NAV") return true;
  const cls = (el.getAttribute("class") || "").toLowerCase();
  return /\b(nav|navbar|menu|topbar|header-menu)\b/.test(cls);
}

function isLikelyFooter(el: Element): boolean {
  if (el.tagName === "FOOTER") return true;
  const cls = (el.getAttribute("class") || "").toLowerCase();
  return /\b(footer|site-footer)\b/.test(cls);
}

function isLikelyHero(el: Element): boolean {
  const cls = (el.getAttribute("class") || "").toLowerCase();
  const id = (el.id || "").toLowerCase();
  return /\b(hero|banner|jumbotron|intro|masthead|cover)\b/.test(`${cls} ${id}`);
}

function extractLinks(scope: Element, base: string, max = 6) {
  const out: { label: string; href: string }[] = [];
  const anchors = Array.from(scope.querySelectorAll("a"));
  for (const a of anchors) {
    const label = clean(a.textContent, 32);
    if (!label || label.length < 2) continue;
    const href = absolutize(a.getAttribute("href"), base);
    if (out.find((l) => l.label.toLowerCase() === label.toLowerCase())) continue;
    out.push({ label, href });
    if (out.length >= max) break;
  }
  return out;
}

function buildNavbar(el: Element, base: string): Block | null {
  const links = extractLinks(el, base, 5);
  if (!links.length) return null;
  const cta = links[links.length - 1];
  return {
    id: uid("nav"),
    type: "navbar",
    props: {
      links: links.slice(0, -1).length ? links.slice(0, -1) : links,
      ctaLabel: cta?.label || "Get started",
      ctaHref: cta?.href || "#",
    },
  };
}

function buildHero(el: Element, base: string): Block | null {
  const h = el.querySelector("h1, h2");
  const headline = clean(h?.textContent, 120);
  if (!headline) return null;
  const para = el.querySelector("p");
  const ctas = Array.from(el.querySelectorAll("a, button")).slice(0, 2);
  return {
    id: uid("hero"),
    type: "hero",
    props: {
      eyebrow: "",
      headline,
      subheadline: clean(para?.textContent, 240),
      ctaLabel: clean(ctas[0]?.textContent, 32) || "Get started",
      ctaHref: absolutize(ctas[0]?.getAttribute("href"), base),
      secondaryLabel: clean(ctas[1]?.textContent, 32) || "",
      secondaryHref: absolutize(ctas[1]?.getAttribute("href"), base),
    },
  };
}

function buildFeatures(el: Element): Block | null {
  // Look for repeated card-like children with heading+text
  const candidates = Array.from(el.children).filter((c) => {
    return c.querySelector("h2, h3, h4") && c.querySelector("p");
  });
  let cards = candidates;
  if (cards.length < 3) {
    cards = Array.from(el.querySelectorAll(".card, .feature, .col, [class*='feature'], [class*='card']")).filter(
      (c) => c.querySelector("h2, h3, h4, h5") && c.querySelector("p"),
    );
  }
  if (cards.length < 2) return null;
  const items = cards.slice(0, 6).map((c) => ({
    icon: "✨",
    title: clean(c.querySelector("h2, h3, h4, h5")?.textContent, 60),
    body: clean(c.querySelector("p")?.textContent, 180),
  })).filter((i) => i.title);
  if (items.length < 2) return null;
  const heading = el.querySelector("h2, h3");
  return {
    id: uid("feat"),
    type: "features",
    props: {
      title: clean(heading?.textContent, 80) || "Features",
      subtitle: "",
      items,
    },
  };
}

function buildCta(el: Element, base: string): Block | null {
  const h = el.querySelector("h1, h2, h3");
  const headline = clean(h?.textContent, 120);
  const a = el.querySelector("a, button");
  if (!headline || !a) return null;
  return {
    id: uid("cta"),
    type: "cta",
    props: {
      headline,
      subheadline: clean(el.querySelector("p")?.textContent, 200),
      ctaLabel: clean(a.textContent, 32) || "Get started",
      ctaHref: absolutize(a.getAttribute("href"), base),
    },
  };
}

function buildFooter(el: Element, base: string): Block {
  const groups = Array.from(el.querySelectorAll("ul, .col, [class*='col']"))
    .map((g) => {
      const links = extractLinks(g as Element, base, 5);
      const heading = (g as Element).querySelector("h3, h4, h5, h6, strong");
      return {
        title: clean(heading?.textContent, 32) || "Links",
        links,
      };
    })
    .filter((g) => g.links.length > 0)
    .slice(0, 4);
  return {
    id: uid("ft"),
    type: "footer",
    props: {
      tagline: clean(el.querySelector("p")?.textContent, 160) || "",
      columns: groups.length ? groups : [{ title: "Links", links: extractLinks(el, base, 4) }],
    },
  };
}

function buildText(el: Element): Block | null {
  const heading = el.querySelector("h1, h2, h3");
  const paras = Array.from(el.querySelectorAll("p")).slice(0, 3).map((p) => clean(p.textContent, 320)).filter(Boolean);
  if (!heading && !paras.length) return null;
  if (heading && paras.length) {
    return {
      id: uid("h"),
      type: "heading",
      props: { title: clean(heading.textContent, 100), subtitle: paras[0], align: "center" },
    };
  }
  return {
    id: uid("txt"),
    type: "text",
    props: { body: paras.join("\n\n") || clean(heading?.textContent, 200), align: "left" },
  };
}

function classifyAndBuild(el: Element, base: string): Block | null {
  if (isLikelyNav(el)) return buildNavbar(el, base);
  if (isLikelyFooter(el)) return buildFooter(el, base);
  if (isLikelyHero(el)) return buildHero(el, base);

  // Generic section detection
  const cls = (el.getAttribute("class") || "").toLowerCase();
  const id = (el.id || "").toLowerCase();
  const tag = el.tagName.toLowerCase();
  const hint = `${tag} ${cls} ${id}`;

  if (/\b(cta|get-?started|signup|subscribe|callout)\b/.test(hint)) {
    const cta = buildCta(el, base);
    if (cta) return cta;
  }
  if (/\b(feature|service|benefit|grid|cards)\b/.test(hint)) {
    const f = buildFeatures(el);
    if (f) return f;
  }
  // Try features purely structurally
  const feat = buildFeatures(el);
  if (feat) return feat;

  // Hero fallback if first big H1
  if (el.querySelector("h1")) return buildHero(el, base);

  return buildText(el);
}

function generateThumbnail(title: string, color: string): string {
  // Lightweight SVG → data URL thumbnail (no canvas / network needed).
  const safe = title.replace(/[<>&"']/g, (c) => ({ "<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;","'":"&#39;" }[c]!));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><text x="50%" y="52%" font-family="Inter, system-ui, sans-serif" font-size="34" font-weight="700" fill="white" text-anchor="middle">${safe.slice(0,40)}</text><text x="50%" y="68%" font-family="Inter, system-ui, sans-serif" font-size="14" fill="rgba(255,255,255,0.75)" text-anchor="middle">Imported template</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function parseHtmlToProjectContent(html: string, baseUrl: string): ImportResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Strip noisy nodes
  doc.querySelectorAll("script, style, noscript, iframe, svg").forEach((n) => n.remove());

  const detectedTitle = clean(doc.querySelector("title")?.textContent, 80) ||
    clean(doc.querySelector("h1")?.textContent, 80) ||
    "Imported site";
  const detectedColor = pickPrimaryColor(doc);

  const blocks: Block[] = [];
  const seen = new Set<Element>();

  // 1) Header / navigation
  const header = doc.querySelector("header") || doc.querySelector("nav");
  if (header && !seen.has(header)) {
    const nav = buildNavbar(header, baseUrl);
    if (nav) { blocks.push(nav); seen.add(header); }
  }

  // 2) Walk top-level sections of <main> or <body>
  const root = doc.querySelector("main") || doc.body;
  if (root) {
    const candidates = Array.from(root.querySelectorAll("section, [class*='section'], [class*='hero'], [class*='feature'], [class*='cta']"));
    const ordered = candidates.length ? candidates : Array.from(root.children);
    for (const el of ordered) {
      if (seen.has(el)) continue;
      // skip if inside an already-consumed ancestor
      let skip = false;
      let p: Element | null = el.parentElement;
      while (p) { if (seen.has(p)) { skip = true; break; } p = p.parentElement; }
      if (skip) continue;
      if (isLikelyFooter(el)) continue;

      const block = classifyAndBuild(el, baseUrl);
      if (block && block.type !== "navbar") {
        blocks.push(block);
        seen.add(el);
      }
      if (blocks.length > 10) break;
    }
  }

  // 3) Footer
  const footer = doc.querySelector("footer");
  if (footer && !seen.has(footer)) {
    blocks.push(buildFooter(footer, baseUrl));
  }

  // Ensure at least something usable
  if (blocks.length === 0) {
    blocks.push({
      id: uid("h"),
      type: "heading",
      props: { title: detectedTitle, subtitle: "Imported page (no parsable sections found).", align: "center" },
    });
  }

  const branding = {
    siteName: detectedTitle.slice(0, 32),
    primaryColor: detectedColor,
    fontFamily: DEFAULT_BRANDING.fontFamily,
  };

  return {
    content: { branding, pages: [{ id: "home", name: "Home", blocks }] },
    thumbnailDataUrl: generateThumbnail(detectedTitle, detectedColor),
    detectedTitle,
    detectedColor,
    blockCount: blocks.length,
  };
}

// Curated source suggestions to populate the import dialog.
export const IMPORT_SOURCES: { name: string; url: string; note: string; license?: string }[] = [
  { name: "HTML5 UP", url: "https://html5up.net/", note: "Fully responsive, semantic HTML — easy to parse", license: "CCA 3.0" },
  { name: "Free CSS", url: "https://www.free-css.com/free-css-templates", note: "15,000+ filterable templates", license: "Mixed" },
  { name: "BootstrapMade", url: "https://bootstrapmade.com/", note: "Bootstrap 5, consistent block structure", license: "Free w/ attribution" },
  { name: "Start Bootstrap", url: "https://startbootstrap.com/", note: "Open-source, GitHub-hosted", license: "MIT" },
  { name: "Colorlib", url: "https://colorlib.com/wp/free-website-templates/", note: "300+ niche templates", license: "Free" },
  { name: "Themewagon Free", url: "https://themewagon.com/theme-price/free", note: "High-quality Bootstrap themes", license: "Mixed" },
  { name: "Tooplate", url: "https://www.tooplate.com/", note: "Clean minimal, easy DOM parsing", license: "Free w/ attribution" },
  { name: "HTMLrev", url: "https://htmlrev.com/", note: "Modern Tailwind + Bootstrap", license: "MIT / CC0" },
  { name: "Cruip", url: "https://cruip.com/free-resources/", note: "Tailwind + React, dev-quality", license: "Free" },
  { name: "GitHub html-template", url: "https://github.com/topics/html-template", note: "Queryable via GitHub REST API", license: "Various" },
  { name: "Shuffle.dev", url: "https://shuffle.dev/", note: "Tailwind + Bootstrap blocks", license: "Free tier" },
  { name: "Flowbite", url: "https://flowbite.com/", note: "Tailwind UI blocks", license: "MIT" },
  { name: "Tailwind UI Kit", url: "https://tailwinduikit.com/", note: "Free Tailwind components", license: "Free" },
];
