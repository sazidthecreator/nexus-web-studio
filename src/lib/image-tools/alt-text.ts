/**
 * Heuristic alt-text suggester — combines:
 *  1. Filename keywords (most signal-rich)
 *  2. Dominant color name
 *  3. Aspect ratio shape hint
 *
 * No network, no model. Always produces a non-empty string.
 */

import { extractPalette, type Swatch } from "./palette";

const FILENAME_STOPWORDS = new Set([
  "img", "image", "photo", "picture", "pic", "screenshot", "screen", "shot",
  "untitled", "final", "draft", "copy", "new", "old", "version", "v1", "v2",
  "dsc", "iphone", "android", "export", "render",
]);

const COLOR_NAMES: Array<{ name: string; r: number; g: number; b: number }> = [
  { name: "black",   r: 20,  g: 20,  b: 20  },
  { name: "white",   r: 240, g: 240, b: 240 },
  { name: "gray",    r: 128, g: 128, b: 128 },
  { name: "red",     r: 220, g: 40,  b: 40  },
  { name: "orange",  r: 230, g: 140, b: 40  },
  { name: "yellow",  r: 240, g: 215, b: 60  },
  { name: "green",   r: 60,  b: 70,  g: 180 },
  { name: "teal",    r: 30,  g: 180, b: 170 },
  { name: "blue",    r: 50,  g: 110, b: 220 },
  { name: "navy",    r: 25,  g: 40,  b: 90  },
  { name: "purple",  r: 140, g: 70,  b: 200 },
  { name: "pink",    r: 240, g: 130, b: 180 },
  { name: "brown",   r: 130, g: 85,  b: 50  },
  { name: "beige",   r: 220, g: 200, b: 170 },
];

function nearestColorName(s: Swatch): string {
  let best = COLOR_NAMES[0].name;
  let bestD = Infinity;
  for (const c of COLOR_NAMES) {
    const dr = s.r - c.r, dg = s.g - c.g, db = s.b - c.b;
    const d = dr * dr + dg * dg + db * db;
    if (d < bestD) { bestD = d; best = c.name; }
  }
  return best;
}

function shapeHint(w: number, h: number): string {
  if (!w || !h) return "image";
  const r = w / h;
  if (r > 1.4) return "wide image";
  if (r < 0.7) return "tall image";
  return "image";
}

function cleanFilename(name: string): string[] {
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\d{6,}/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !FILENAME_STOPWORDS.has(w) && !/^\d+$/.test(w));
}

export type AltSuggestionInput = {
  file: File | Blob;
  filename?: string;
  width?: number;
  height?: number;
};

export async function suggestAltText(input: AltSuggestionInput): Promise<string> {
  const filename = input.filename ?? (input.file instanceof File ? input.file.name : "");
  const keywords = cleanFilename(filename);

  let colorWord = "";
  try {
    const palette = await extractPalette(input.file, 3, 64);
    const dominant = palette[0];
    if (dominant) colorWord = nearestColorName(dominant);
  } catch { /* fall back silently */ }

  const shape = shapeHint(input.width || 0, input.height || 0);

  const parts: string[] = [];
  if (colorWord) parts.push(colorWord);
  if (keywords.length) parts.push(keywords.slice(0, 4).join(" "));
  parts.push(shape);

  const text = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!text) return "Image";
  return text.charAt(0).toUpperCase() + text.slice(1);
}
