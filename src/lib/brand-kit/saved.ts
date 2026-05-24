// Saved brand kit persisted in localStorage so users can apply it to new
// projects/templates without a server round-trip. (DB column not added yet.)
import type { Branding } from "@/lib/blocks";

const KEY = "sitely:saved-brand-kit:v1";

export type SavedBrandKit = {
  brandName: string;
  primaryColor: string;
  fontFamily: string;
  logoSvg?: string;
  savedAt: number;
};

export function getSavedBrandKit(): SavedBrandKit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedBrandKit) : null;
  } catch { return null; }
}

export function saveBrandKit(kit: Omit<SavedBrandKit, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...kit, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

export function clearSavedBrandKit() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// Apply saved branding to a ProjectContent without losing structure.
export function applyBrandingToContent<T extends { branding: Branding }>(
  content: T,
  kit: SavedBrandKit | null,
): T {
  if (!kit) return content;
  return {
    ...content,
    branding: {
      ...content.branding,
      siteName: content.branding.siteName || kit.brandName,
      primaryColor: kit.primaryColor || content.branding.primaryColor,
      fontFamily: kit.fontFamily || content.branding.fontFamily,
    },
  };
}
