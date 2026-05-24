// Generate a full harmonious palette from one brand color.
// OKLCH-based so lightness/chroma stays perceptually balanced.
import { parseHex, oklch, formatHex } from "culori";

export type SitelyTheme = {
  primary: string[]; // 10 stops: 50..900
  accent: string;
  neutral: string[]; // 10 stops
  textOnPrimary: string;
  success: string;
  warning: string;
  danger: string;
};

const LIGHTNESS_STOPS = [0.97, 0.93, 0.86, 0.76, 0.64, 0.55, 0.46, 0.38, 0.29, 0.2];

export function generateThemeFromBrandColor(hexColor: string): SitelyTheme {
  const base = parseHex(hexColor);
  if (!base) throw new Error(`Invalid hex color: ${hexColor}`);
  const baseOklch = oklch(base);
  const h = baseOklch.h ?? 0;
  const c = baseOklch.c ?? 0;

  const primary = LIGHTNESS_STOPS.map((l) =>
    `oklch(${l.toFixed(3)} ${(c * (l < 0.5 ? 1 : 0.8)).toFixed(3)} ${h.toFixed(0)})`,
  );

  const neutral = LIGHTNESS_STOPS.map((l) =>
    `oklch(${l.toFixed(3)} 0.006 ${h.toFixed(0)})`,
  );

  const accentHue = (h + 180) % 360;
  const textLight = baseOklch.l > 0.55;

  return {
    primary,
    accent: `oklch(0.60 ${(c * 0.9).toFixed(3)} ${accentHue.toFixed(0)})`,
    neutral,
    textOnPrimary: textLight
      ? `oklch(0.29 0.006 ${h.toFixed(0)})`
      : `oklch(0.97 0.006 ${h.toFixed(0)})`,
    success: `oklch(0.62 0.17 ${((h + 120) % 360).toFixed(0)})`,
    warning: `oklch(0.72 0.18 ${((h + 60) % 360).toFixed(0)})`,
    danger: "oklch(0.58 0.22 25)",
  };
}

/** Convert OKLCH theme color back to hex for legacy pickers. */
export function themeColorToHex(oklchString: string): string | undefined {
  try {
    return formatHex(oklchString);
  } catch {
    return undefined;
  }
}
