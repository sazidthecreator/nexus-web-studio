// Premium typography presets — fluid, responsive, consistent.
// Each preset emits a set of CSS variables consumed by `.wb-canvas` rules
// in src/styles.css. Sizes use clamp() so they scale smoothly across
// mobile → tablet → desktop without breakpoint jumps.

export type TypoPreset = {
  id: string;
  label: string;
  description: string;
  // Google Fonts spec for dynamic loading (e.g. "Inter:wght@400;600;700")
  googleFonts: string[];
  vars: Record<string, string>;
};

// CSS variable contract (consumed in src/styles.css under .wb-canvas):
//   --wb-font-display, --wb-font-heading, --wb-font-body, --wb-font-mono
//   --wb-fs-display, --wb-fs-h1, --wb-fs-h2, --wb-fs-h3
//   --wb-fs-body, --wb-fs-lead, --wb-fs-small, --wb-fs-caption
//   --wb-lh-display, --wb-lh-heading, --wb-lh-body
//   --wb-tracking-display, --wb-tracking-heading, --wb-tracking-body
//   --wb-weight-display, --wb-weight-heading, --wb-weight-body
//   --wb-section-y, --wb-stack-gap

const STACK = {
  inter: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
  playfair: '"Playfair Display", "Iowan Old Style", Georgia, serif',
  fraunces: '"Fraunces", "Iowan Old Style", Georgia, serif',
  spaceGrotesk: '"Space Grotesk", system-ui, sans-serif',
  dmSans: '"DM Sans", system-ui, sans-serif',
  manrope: '"Manrope", system-ui, sans-serif',
  ibmMono: '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace',
  serifSystem: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  sansSystem: 'system-ui, -apple-system, "Segoe UI", sans-serif',
};

export const TYPO_PRESETS: TypoPreset[] = [
  {
    id: "modern-clean",
    label: "Modern · Clean",
    description: "Inter throughout. Crisp, tight tracking, generous spacing. The safe default.",
    googleFonts: ["Inter:wght@400;500;600;700;800"],
    vars: {
      "--wb-font-display": STACK.inter,
      "--wb-font-heading": STACK.inter,
      "--wb-font-body": STACK.inter,
      "--wb-font-mono": STACK.ibmMono,
      "--wb-fs-display": "clamp(2.5rem, 5.5vw + 1rem, 4.75rem)",
      "--wb-fs-h1": "clamp(2.25rem, 4vw + 0.75rem, 3.75rem)",
      "--wb-fs-h2": "clamp(1.75rem, 2.5vw + 0.75rem, 2.5rem)",
      "--wb-fs-h3": "clamp(1.25rem, 1vw + 0.9rem, 1.5rem)",
      "--wb-fs-lead": "clamp(1.05rem, 0.5vw + 0.95rem, 1.25rem)",
      "--wb-fs-body": "clamp(0.95rem, 0.25vw + 0.9rem, 1.0625rem)",
      "--wb-fs-small": "0.875rem",
      "--wb-fs-caption": "0.8125rem",
      "--wb-lh-display": "1.05",
      "--wb-lh-heading": "1.15",
      "--wb-lh-body": "1.65",
      "--wb-tracking-display": "-0.025em",
      "--wb-tracking-heading": "-0.015em",
      "--wb-tracking-body": "0",
      "--wb-weight-display": "700",
      "--wb-weight-heading": "600",
      "--wb-weight-body": "400",
      "--wb-section-y": "clamp(3rem, 6vw, 6rem)",
      "--wb-stack-gap": "clamp(0.75rem, 1vw, 1.25rem)",
    },
  },
  {
    id: "editorial-serif",
    label: "Editorial · Serif",
    description: "Playfair display headlines over Inter body. High-contrast, magazine feel.",
    googleFonts: ["Playfair+Display:wght@500;600;700;800", "Inter:wght@400;500;600"],
    vars: {
      "--wb-font-display": STACK.playfair,
      "--wb-font-heading": STACK.playfair,
      "--wb-font-body": STACK.inter,
      "--wb-font-mono": STACK.ibmMono,
      "--wb-fs-display": "clamp(2.75rem, 6vw + 1rem, 5.5rem)",
      "--wb-fs-h1": "clamp(2.5rem, 4.5vw + 0.5rem, 4rem)",
      "--wb-fs-h2": "clamp(1.875rem, 3vw + 0.5rem, 2.75rem)",
      "--wb-fs-h3": "clamp(1.375rem, 1vw + 1rem, 1.625rem)",
      "--wb-fs-lead": "clamp(1.125rem, 0.5vw + 1rem, 1.375rem)",
      "--wb-fs-body": "clamp(1rem, 0.25vw + 0.95rem, 1.125rem)",
      "--wb-fs-small": "0.9375rem",
      "--wb-fs-caption": "0.8125rem",
      "--wb-lh-display": "1.02",
      "--wb-lh-heading": "1.12",
      "--wb-lh-body": "1.7",
      "--wb-tracking-display": "-0.02em",
      "--wb-tracking-heading": "-0.005em",
      "--wb-tracking-body": "0.005em",
      "--wb-weight-display": "700",
      "--wb-weight-heading": "600",
      "--wb-weight-body": "400",
      "--wb-section-y": "clamp(3.5rem, 7vw, 7rem)",
      "--wb-stack-gap": "clamp(0.875rem, 1.2vw, 1.5rem)",
    },
  },
  {
    id: "tech-precise",
    label: "Tech · Precise",
    description: "Space Grotesk display + Inter body. Geometric, engineered, confident.",
    googleFonts: ["Space+Grotesk:wght@500;600;700", "Inter:wght@400;500;600"],
    vars: {
      "--wb-font-display": STACK.spaceGrotesk,
      "--wb-font-heading": STACK.spaceGrotesk,
      "--wb-font-body": STACK.inter,
      "--wb-font-mono": STACK.ibmMono,
      "--wb-fs-display": "clamp(2.5rem, 5.5vw + 1rem, 5rem)",
      "--wb-fs-h1": "clamp(2.25rem, 4vw + 0.5rem, 3.75rem)",
      "--wb-fs-h2": "clamp(1.75rem, 2.5vw + 0.75rem, 2.5rem)",
      "--wb-fs-h3": "clamp(1.25rem, 1vw + 0.9rem, 1.5rem)",
      "--wb-fs-lead": "clamp(1.0625rem, 0.5vw + 0.95rem, 1.25rem)",
      "--wb-fs-body": "clamp(0.9375rem, 0.25vw + 0.9rem, 1.0625rem)",
      "--wb-fs-small": "0.875rem",
      "--wb-fs-caption": "0.8125rem",
      "--wb-lh-display": "1.05",
      "--wb-lh-heading": "1.15",
      "--wb-lh-body": "1.6",
      "--wb-tracking-display": "-0.035em",
      "--wb-tracking-heading": "-0.02em",
      "--wb-tracking-body": "-0.005em",
      "--wb-weight-display": "700",
      "--wb-weight-heading": "600",
      "--wb-weight-body": "400",
      "--wb-section-y": "clamp(3rem, 6vw, 6rem)",
      "--wb-stack-gap": "clamp(0.75rem, 1vw, 1.25rem)",
    },
  },
  {
    id: "warm-friendly",
    label: "Warm · Friendly",
    description: "DM Sans across the board. Round, approachable, brand-forward.",
    googleFonts: ["DM+Sans:wght@400;500;600;700"],
    vars: {
      "--wb-font-display": STACK.dmSans,
      "--wb-font-heading": STACK.dmSans,
      "--wb-font-body": STACK.dmSans,
      "--wb-font-mono": STACK.ibmMono,
      "--wb-fs-display": "clamp(2.5rem, 5vw + 1rem, 4.5rem)",
      "--wb-fs-h1": "clamp(2.125rem, 3.5vw + 0.75rem, 3.5rem)",
      "--wb-fs-h2": "clamp(1.75rem, 2.5vw + 0.75rem, 2.375rem)",
      "--wb-fs-h3": "clamp(1.25rem, 1vw + 0.9rem, 1.5rem)",
      "--wb-fs-lead": "clamp(1.0625rem, 0.4vw + 1rem, 1.25rem)",
      "--wb-fs-body": "clamp(0.9375rem, 0.25vw + 0.9rem, 1.0625rem)",
      "--wb-fs-small": "0.875rem",
      "--wb-fs-caption": "0.8125rem",
      "--wb-lh-display": "1.1",
      "--wb-lh-heading": "1.2",
      "--wb-lh-body": "1.65",
      "--wb-tracking-display": "-0.02em",
      "--wb-tracking-heading": "-0.01em",
      "--wb-tracking-body": "0",
      "--wb-weight-display": "700",
      "--wb-weight-heading": "600",
      "--wb-weight-body": "400",
      "--wb-section-y": "clamp(3rem, 6vw, 5.5rem)",
      "--wb-stack-gap": "clamp(0.75rem, 1vw, 1.25rem)",
    },
  },
  {
    id: "luxury-editorial",
    label: "Luxury · Editorial",
    description: "Fraunces display + Manrope body. Soft contrast, expensive, fashion-house feel.",
    googleFonts: ["Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700", "Manrope:wght@400;500;600"],
    vars: {
      "--wb-font-display": STACK.fraunces,
      "--wb-font-heading": STACK.fraunces,
      "--wb-font-body": STACK.manrope,
      "--wb-font-mono": STACK.ibmMono,
      "--wb-fs-display": "clamp(3rem, 7vw + 1rem, 6rem)",
      "--wb-fs-h1": "clamp(2.5rem, 5vw + 0.5rem, 4.25rem)",
      "--wb-fs-h2": "clamp(2rem, 3vw + 0.5rem, 3rem)",
      "--wb-fs-h3": "clamp(1.375rem, 1vw + 1rem, 1.75rem)",
      "--wb-fs-lead": "clamp(1.125rem, 0.5vw + 1rem, 1.375rem)",
      "--wb-fs-body": "clamp(1rem, 0.25vw + 0.95rem, 1.125rem)",
      "--wb-fs-small": "0.9375rem",
      "--wb-fs-caption": "0.8125rem",
      "--wb-lh-display": "1",
      "--wb-lh-heading": "1.1",
      "--wb-lh-body": "1.7",
      "--wb-tracking-display": "-0.03em",
      "--wb-tracking-heading": "-0.015em",
      "--wb-tracking-body": "0.005em",
      "--wb-weight-display": "600",
      "--wb-weight-heading": "600",
      "--wb-weight-body": "400",
      "--wb-section-y": "clamp(4rem, 8vw, 8rem)",
      "--wb-stack-gap": "clamp(1rem, 1.5vw, 1.75rem)",
    },
  },
  {
    id: "minimal-system",
    label: "Minimal · System",
    description: "Native system fonts, restrained scale, generous leading. Zero loading cost.",
    googleFonts: [],
    vars: {
      "--wb-font-display": STACK.sansSystem,
      "--wb-font-heading": STACK.sansSystem,
      "--wb-font-body": STACK.sansSystem,
      "--wb-font-mono": STACK.ibmMono,
      "--wb-fs-display": "clamp(2.25rem, 4.5vw + 1rem, 4rem)",
      "--wb-fs-h1": "clamp(2rem, 3vw + 0.75rem, 3rem)",
      "--wb-fs-h2": "clamp(1.625rem, 2vw + 0.75rem, 2.125rem)",
      "--wb-fs-h3": "clamp(1.1875rem, 0.75vw + 0.9rem, 1.375rem)",
      "--wb-fs-lead": "clamp(1.0625rem, 0.4vw + 0.95rem, 1.1875rem)",
      "--wb-fs-body": "clamp(0.9375rem, 0.25vw + 0.9rem, 1.0625rem)",
      "--wb-fs-small": "0.875rem",
      "--wb-fs-caption": "0.8125rem",
      "--wb-lh-display": "1.1",
      "--wb-lh-heading": "1.2",
      "--wb-lh-body": "1.7",
      "--wb-tracking-display": "-0.02em",
      "--wb-tracking-heading": "-0.01em",
      "--wb-tracking-body": "0",
      "--wb-weight-display": "600",
      "--wb-weight-heading": "600",
      "--wb-weight-body": "400",
      "--wb-section-y": "clamp(2.5rem, 5vw, 5rem)",
      "--wb-stack-gap": "clamp(0.75rem, 1vw, 1.125rem)",
    },
  },
];

export const DEFAULT_TYPO_PRESET_ID = "modern-clean";

export function getTypoPreset(id?: string): TypoPreset {
  return TYPO_PRESETS.find((p) => p.id === id) ?? TYPO_PRESETS[0];
}

/** Build the Google Fonts <link href="..."> for a preset (or null if none). */
export function googleFontsHref(preset: TypoPreset): string | null {
  if (!preset.googleFonts.length) return null;
  const families = preset.googleFonts.map((f) => `family=${f}`).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/** Inline style object for the canvas root. Apply on `.wb-canvas`. */
export function typoStyleVars(preset: TypoPreset): React.CSSProperties {
  return preset.vars as unknown as React.CSSProperties;
}
