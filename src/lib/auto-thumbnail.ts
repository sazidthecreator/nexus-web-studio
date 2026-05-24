// Auto-thumbnail generator: builds a deterministic, lightweight SVG preview
// from a project's branding + first hero/heading text. Frontend-only — returns
// a `data:image/svg+xml` URL that can be used directly as <img src="...">.
//
// Hardening rules:
// - Never throw. Any unexpected input falls back to SAFE_FALLBACK_THUMBNAIL.
// - Treat content as `unknown`: validate at every step before reading.
// - Sanitize all strings (length-clipped, XML-escaped, control chars stripped).
// - Sanitize colors (only #RRGGBB hex accepted, otherwise default).

// Branded as a constant so callers can render it directly when they have nothing.
export const SAFE_FALLBACK_THUMBNAIL: string = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1f2937"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#fg)"/>
    <g fill="#94a3b8" font-family="Inter, system-ui, sans-serif" text-anchor="middle">
      <circle cx="320" cy="160" r="36" fill="rgba(255,255,255,0.06)"/>
      <text x="320" y="167" font-size="28" font-weight="700">·</text>
      <text x="320" y="232" font-size="14">Untitled project</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
})();

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function sanitizeString(v: unknown): string {
  if (typeof v !== "string") return "";
  // Strip control chars; collapse whitespace.
  return v.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
}

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
}

function sanitizeHex(v: unknown, fallback: string): string {
  if (typeof v !== "string") return fallback;
  const s = v.trim();
  // Accept #RGB or #RRGGBB; expand short form.
  let m = /^#?([0-9a-f]{6})$/i.exec(s);
  if (m) return `#${m[1].toLowerCase()}`;
  m = /^#?([0-9a-f]{3})$/i.exec(s);
  if (m) {
    const [r, g, b] = m[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function sanitizeFont(v: unknown): string {
  const s = sanitizeString(v);
  if (!s) return "Inter, system-ui, sans-serif";
  // Only allow safe font-family characters; otherwise default.
  if (!/^[\w\s,'\-]+$/.test(s)) return "Inter, system-ui, sans-serif";
  return s.replace(/"/g, "'").slice(0, 120);
}

function shade(hex: string, percent: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const num = parseInt(m[1], 16);
  let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.round(r + (percent < 0 ? r : 255 - r) * percent)));
  g = Math.max(0, Math.min(255, Math.round(g + (percent < 0 ? g : 255 - g) * percent)));
  b = Math.max(0, Math.min(255, Math.round(b + (percent < 0 ? b : 255 - b) * percent)));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function getBlocks(content: unknown): Array<Record<string, unknown>> {
  if (!isObj(content)) return [];
  const pages = (content as any).pages;
  if (!Array.isArray(pages) || pages.length === 0) return [];
  const first = pages[0];
  if (!isObj(first)) return [];
  const blocks = (first as any).blocks;
  if (!Array.isArray(blocks)) return [];
  return blocks.filter(isObj) as Array<Record<string, unknown>>;
}

function pickHeadline(blocks: Array<Record<string, unknown>>, fallback: string): string {
  for (const b of blocks) {
    const type = typeof b.type === "string" ? b.type : "";
    const props = isObj(b.props) ? (b.props as Record<string, unknown>) : {};
    if (type === "hero") {
      const t = sanitizeString(props.title ?? props.heading);
      if (t) return t;
    }
    if (type === "heading") {
      const t = sanitizeString(props.text);
      if (t) return t;
    }
  }
  return fallback;
}

function pickSubhead(blocks: Array<Record<string, unknown>>): string {
  for (const b of blocks) {
    const type = typeof b.type === "string" ? b.type : "";
    const props = isObj(b.props) ? (b.props as Record<string, unknown>) : {};
    if (type === "hero") {
      const s = sanitizeString(props.subtitle ?? props.subhead ?? props.description);
      if (s) return s;
    }
  }
  return "";
}

function buildInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  const out = parts.map((w) => (w[0] ? w[0].toUpperCase() : "")).join("");
  return out || "S";
}

export function generateThumbnailSvg(
  content: unknown,
  fallbackName: unknown,
): string {
  try {
    const safeName = sanitizeString(fallbackName) || "Untitled";
    const branding = isObj(content) && isObj((content as any).branding)
      ? ((content as any).branding as Record<string, unknown>)
      : null;

    const primary = sanitizeHex(branding?.primaryColor, "#7c5cff");
    const siteName = sanitizeString(branding?.siteName) || safeName;
    const font = sanitizeFont(branding?.fontFamily);

    const blocks = getBlocks(content);
    const headline = clip(pickHeadline(blocks, siteName), 36) || safeName;
    const subhead = clip(pickSubhead(blocks), 64);

    const c1 = shade(primary, 0.15);
    const c2 = shade(primary, -0.35);
    const initials = buildInitials(siteName || safeName);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.2" cy="0.15" r="0.8">
          <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>
      <rect width="640" height="360" fill="url(#g)"/>
      <rect width="640" height="360" fill="url(#glow)"/>
      <g font-family="${escapeXml(font)}" fill="#ffffff">
        <circle cx="56" cy="56" r="22" fill="rgba(255,255,255,0.18)"/>
        <text x="56" y="63" text-anchor="middle" font-size="20" font-weight="700">${escapeXml(initials)}</text>
        <text x="40" y="220" font-size="34" font-weight="800" letter-spacing="-0.5">${escapeXml(headline)}</text>
        ${subhead ? `<text x="40" y="252" font-size="16" opacity="0.85">${escapeXml(subhead)}</text>` : ""}
        <rect x="40" y="280" width="140" height="36" rx="18" fill="rgba(255,255,255,0.95)"/>
        <text x="110" y="304" text-anchor="middle" font-size="14" font-weight="700" fill="${c2}">Get started</text>
        <rect x="190" y="280" width="120" height="36" rx="18" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)"/>
        <text x="250" y="304" text-anchor="middle" font-size="14" font-weight="600">Learn more</text>
      </g>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch (err) {
    if (typeof console !== "undefined") console.warn("generateThumbnailSvg failed:", err);
    return SAFE_FALLBACK_THUMBNAIL;
  }
}
