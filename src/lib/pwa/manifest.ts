// Build a Web App Manifest for a published site (manifest-only PWA — no SW).
import type { ProjectContent } from "@/lib/blocks";

export type ManifestOpts = {
  name: string;
  shortName?: string;
  themeColor?: string;
  bgColor?: string;
  startUrl?: string;
  scope?: string;
  iconUrl?: string;
};

export function buildManifest(opts: ManifestOpts) {
  const name = (opts.name || "App").slice(0, 60);
  return {
    name,
    short_name: (opts.shortName || name).slice(0, 12),
    start_url: opts.startUrl || "./",
    scope: opts.scope || "./",
    display: "standalone",
    background_color: opts.bgColor || "#ffffff",
    theme_color: opts.themeColor || "#7c5cff",
    icons: opts.iconUrl
      ? [
          { src: opts.iconUrl, sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: opts.iconUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ]
      : [],
  };
}

export function manifestFromContent(content: ProjectContent, overrides?: Partial<ManifestOpts>) {
  return buildManifest({
    name: content.branding?.siteName || "Site",
    themeColor: content.branding?.primaryColor,
    ...overrides,
  });
}

// Inline 1×1 transparent PNG as ultimate fallback icon.
export const FALLBACK_ICON_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
