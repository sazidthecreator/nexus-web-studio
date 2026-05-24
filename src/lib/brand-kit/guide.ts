// Self-contained brand-guide HTML generator.
import type { PaletteSet, Palette } from "./palette";
import type { FontPairing } from "./fonts";
import { googleFontsImport } from "./fonts";

function swatch(name: string, hex: string, fg: string): string {
  return `<div class="swatch">
  <div class="chip" style="background:${hex};color:${fg}"><span>${hex.toUpperCase()}</span></div>
  <div class="meta"><strong>${name}</strong><span>${hex.toUpperCase()}</span></div>
</div>`;
}

function paletteBlock(title: string, p: Palette): string {
  return `<section class="palette">
  <h3>${title}</h3>
  <div class="swatches">
    ${swatch("Primary", p.primary, p.background)}
    ${swatch("Secondary", p.secondary, p.background)}
    ${swatch("Accent", p.accent, p.background)}
    ${swatch("Background", p.background, p.foreground)}
    ${swatch("Surface", p.surface, p.foreground)}
    ${swatch("Foreground", p.foreground, p.background)}
  </div>
</section>`;
}

export function buildBrandGuide(opts: {
  brand: string;
  industry?: string;
  style?: string;
  paletteSet: PaletteSet;
  font: FontPairing;
  logoSvg: string;       // primary
  iconSvg: string;       // icon-only
  wordmarkSvg: string;
}): string {
  const { brand, industry, style, paletteSet, font, logoSvg, iconSvg, wordmarkSvg } = opts;
  const p = paletteSet.light;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${brand} — Brand Guidelines</title>
${googleFontsImport(font)}
<style>
:root {
  --primary: ${p.primary};
  --secondary: ${p.secondary};
  --accent: ${p.accent};
  --bg: ${p.background};
  --surface: ${p.surface};
  --fg: ${p.foreground};
  --muted: ${p.mutedForeground};
  --font-display: "${font.display.family}", system-ui, sans-serif;
  --font-body: "${font.body.family}", system-ui, sans-serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--font-body); }
.wrap { max-width: 1080px; margin: 0 auto; padding: 64px 32px; }
h1, h2, h3 { font-family: var(--font-display); letter-spacing: -0.02em; margin: 0 0 16px; }
h1 { font-size: 64px; line-height: 1; }
h2 { font-size: 32px; margin-top: 64px; }
h3 { font-size: 18px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 24px; }
.lede { color: var(--muted); font-size: 18px; max-width: 60ch; }
.hero { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; padding: 48px; background: var(--surface); border-radius: 24px; margin-top: 48px; }
.hero .stage { aspect-ratio: 1/1; display: grid; place-items: center; background: var(--bg); border-radius: 16px; padding: 32px; }
.hero .stage svg { max-width: 100%; max-height: 100%; }
.logo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px; }
.logo-grid .cell { aspect-ratio: 1/1; background: var(--surface); border-radius: 16px; display: grid; place-items: center; padding: 32px; }
.logo-grid .cell.dark { background: ${paletteSet.dark.background}; }
.logo-grid .cell.brand { background: var(--primary); }
.swatches { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.swatch .chip { aspect-ratio: 16/10; border-radius: 12px; display: flex; align-items: flex-end; padding: 14px 16px; font-family: var(--font-body); font-weight: 600; font-size: 13px; }
.swatch .meta { display: flex; justify-content: space-between; padding: 8px 4px; font-size: 13px; color: var(--muted); }
.swatch .meta strong { color: var(--fg); font-weight: 600; }
.type-spec { display: grid; gap: 32px; padding: 32px; background: var(--surface); border-radius: 16px; }
.type-spec .row { border-top: 1px solid color-mix(in oklab, var(--fg) 10%, transparent); padding-top: 24px; }
.type-spec .row:first-child { border-top: 0; padding-top: 0; }
.type-spec .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 8px; }
.h1-sample { font-family: var(--font-display); font-size: 72px; line-height: 1; letter-spacing: -0.02em; font-weight: 700; }
.h2-sample { font-family: var(--font-display); font-size: 44px; line-height: 1.1; font-weight: 600; }
.body-sample { font-size: 17px; line-height: 1.6; max-width: 65ch; }
footer { margin-top: 96px; padding-top: 32px; border-top: 1px solid color-mix(in oklab, var(--fg) 10%, transparent); color: var(--muted); font-size: 14px; }
.tag { display: inline-block; background: var(--accent); color: var(--bg); padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
</style>
</head>
<body>
<div class="wrap">
  <span class="tag">Brand Guidelines</span>
  <h1 style="margin-top: 16px;">${brand}</h1>
  <p class="lede">${[industry, style].filter(Boolean).join(" · ") || "A brand identity built with care."}</p>

  <section class="hero">
    <div class="stage">${logoSvg}</div>
    <div>
      <h3>Primary lockup</h3>
      <p class="lede">Use the combination mark on light surfaces. Maintain clear space equal to the cap height of the wordmark on all sides.</p>
    </div>
  </section>

  <h2>Logo system</h2>
  <h3>Variants</h3>
  <div class="logo-grid">
    <div class="cell">${iconSvg}</div>
    <div class="cell dark" style="color:${paletteSet.dark.foreground}">${iconSvg}</div>
    <div class="cell brand" style="color:${p.background}">${wordmarkSvg}</div>
  </div>

  <h2>Color</h2>
  ${paletteBlock("Light mode", paletteSet.light)}
  ${paletteBlock("Dark mode", paletteSet.dark)}

  <h2>Typography</h2>
  <h3>${font.name} — ${font.vibe}</h3>
  <div class="type-spec">
    <div class="row">
      <div class="label">Display · ${font.display.family}</div>
      <div class="h1-sample">${brand}</div>
    </div>
    <div class="row">
      <div class="label">Subhead</div>
      <div class="h2-sample">Building things worth making.</div>
    </div>
    <div class="row">
      <div class="label">Body · ${font.body.family}</div>
      <div class="body-sample">This is body copy. It should read comfortably across long passages, supporting the display type without competing with it. Pairings have been chosen for hierarchy and harmony — never decoration alone.</div>
    </div>
  </div>

  <footer>Generated by Sitely · ${new Date().toISOString().slice(0, 10)}</footer>
</div>
</body>
</html>`;
}
