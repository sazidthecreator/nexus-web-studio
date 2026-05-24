// Convert a SitelyTheme to CSS custom properties.
// Injected into the <head> of every published page to theme the site.
import type { SitelyTheme } from "./theme-generator";

export function themeToCSS(theme: SitelyTheme): string {
  const p = theme.primary;
  const n = theme.neutral;
  const stops = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  const primaryLines = stops
    .map((s, i) => `      --color-primary-${s}: ${p[i]};`)
    .join("\n");
  const neutralLines = stops
    .map((s, i) => `      --color-neutral-${s}: ${n[i]};`)
    .join("\n");

  return `:root {
${primaryLines}

      --color-accent: ${theme.accent};
      --color-success: ${theme.success};
      --color-warning: ${theme.warning};
      --color-danger:  ${theme.danger};

${neutralLines}

      /* Component aliases */
      --color-bg: var(--color-neutral-50);
      --color-surface: var(--color-neutral-100);
      --color-border: var(--color-neutral-200);
      --color-text: var(--color-neutral-900);
      --color-text-muted: var(--color-neutral-500);
      --color-cta-bg: var(--color-primary-500);
      --color-cta-text: ${theme.textOnPrimary};
      --color-cta-hover-bg: var(--color-primary-600);
    }`;
}
