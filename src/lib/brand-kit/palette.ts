// Mood-driven palette generator. Pure client-side, no API.
import { hash32, rng, range } from "./hash";

export type MoodKey = "calm" | "energetic" | "luxury" | "natural" | "bold" | "minimal" | "playful" | "serious";

type MoodSpec = { hue: [number, number]; sat: [number, number]; light: [number, number]; accentHueShift?: number };

export const MOODS: Record<MoodKey, MoodSpec> = {
  calm:      { hue: [200, 240], sat: [30, 50], light: [50, 70] },
  energetic: { hue: [20, 50],   sat: [70, 90], light: [45, 65] },
  luxury:    { hue: [270, 290], sat: [40, 65], light: [35, 55], accentHueShift: 180 }, // gold accent
  natural:   { hue: [80, 140],  sat: [30, 60], light: [40, 60] },
  bold:      { hue: [0, 360],   sat: [80, 100], light: [45, 60] },
  minimal:   { hue: [200, 240], sat: [5, 20],  light: [50, 70] },
  playful:   { hue: [320, 360], sat: [60, 85], light: [55, 70] },
  serious:   { hue: [210, 230], sat: [25, 45], light: [25, 45] },
};

export type Palette = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  foreground: string;
  mutedForeground: string;
};

export type PaletteSet = { light: Palette; dark: Palette };

export function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function generatePalette(brand: string, moods: MoodKey[], variation = 0): PaletteSet {
  const seed = hash32(brand + "|" + moods.join(",") + "|" + variation);
  const r = rng(seed);
  // Blend mood ranges (average of selected).
  const specs = moods.length ? moods.map((m) => MOODS[m]) : [MOODS.calm];
  const blend = (key: keyof MoodSpec) => {
    const lows = specs.map((s) => (s[key] as [number, number])[0]);
    const highs = specs.map((s) => (s[key] as [number, number])[1]);
    return [Math.min(...lows), Math.max(...highs)] as [number, number];
  };
  const hRange = blend("hue"), sRange = blend("sat"), lRange = blend("light");

  const ph = range(r, hRange[0], hRange[1]);
  const ps = range(r, sRange[0], sRange[1]);
  const pl = range(r, lRange[0], lRange[1]);

  const sh = (ph + range(r, 25, 55)) % 360;
  const accentShift = specs[0].accentHueShift ?? range(r, 140, 200);
  const ah = (ph + accentShift) % 360;

  const light: Palette = {
    primary: hslToHex(ph, ps, pl),
    secondary: hslToHex(sh, Math.max(20, ps - 15), Math.min(75, pl + 5)),
    accent: hslToHex(ah, Math.min(95, ps + 10), Math.min(60, pl)),
    background: hslToHex(ph, Math.min(15, ps * 0.2), 98),
    surface: hslToHex(ph, Math.min(20, ps * 0.25), 95),
    foreground: hslToHex(ph, Math.min(30, ps * 0.4), 12),
    mutedForeground: hslToHex(ph, Math.min(20, ps * 0.3), 40),
  };

  const dark: Palette = {
    primary: hslToHex(ph, Math.min(85, ps + 10), Math.min(70, pl + 10)),
    secondary: hslToHex(sh, Math.min(75, ps), Math.min(65, pl + 5)),
    accent: hslToHex(ah, Math.min(95, ps + 15), Math.min(70, pl + 10)),
    background: hslToHex(ph, Math.min(20, ps * 0.25), 8),
    surface: hslToHex(ph, Math.min(25, ps * 0.3), 13),
    foreground: hslToHex(ph, Math.min(15, ps * 0.2), 96),
    mutedForeground: hslToHex(ph, Math.min(20, ps * 0.3), 65),
  };

  return { light, dark };
}

// WCAG contrast.
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function lum(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const la = lum(hexToRgb(a));
  const lb = lum(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
export type ContrastReport = { pair: string; ratio: number; pass: boolean }[];
export function auditPalette(p: Palette): ContrastReport {
  const checks: [string, string, string][] = [
    ["foreground / background", p.foreground, p.background],
    ["foreground / surface", p.foreground, p.surface],
    ["primary / background", p.primary, p.background],
    ["accent / background", p.accent, p.background],
    ["mutedForeground / background", p.mutedForeground, p.background],
  ];
  return checks.map(([pair, a, b]) => {
    const ratio = contrast(a, b);
    return { pair, ratio: Math.round(ratio * 100) / 100, pass: ratio >= 4.5 };
  });
}

export function paletteToCss(p: Palette, scope = ":root"): string {
  return `${scope} {
  --color-primary: ${p.primary};
  --color-secondary: ${p.secondary};
  --color-accent: ${p.accent};
  --color-background: ${p.background};
  --color-surface: ${p.surface};
  --color-foreground: ${p.foreground};
  --color-muted-foreground: ${p.mutedForeground};
}`;
}

export function paletteToTailwind(set: PaletteSet): string {
  return `// tailwind.config.js extension
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "${set.light.primary}",
          secondary: "${set.light.secondary}",
          accent: "${set.light.accent}",
          background: "${set.light.background}",
          surface: "${set.light.surface}",
          foreground: "${set.light.foreground}",
        },
        "brand-dark": {
          primary: "${set.dark.primary}",
          secondary: "${set.dark.secondary}",
          accent: "${set.dark.accent}",
          background: "${set.dark.background}",
          surface: "${set.dark.surface}",
          foreground: "${set.dark.foreground}",
        },
      },
    },
  },
};`;
}

export function paletteToScss(set: PaletteSet): string {
  const f = (p: Palette, prefix: string) =>
    Object.entries(p).map(([k, v]) => `$${prefix}-${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}: ${v};`).join("\n");
  return `// Brand palette\n${f(set.light, "brand")}\n\n// Dark mode\n${f(set.dark, "brand-dark")}\n`;
}
