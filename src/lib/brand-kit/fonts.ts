// Curated open-source font pairings. All Google Fonts.

export type FontPairing = {
  id: string;
  name: string;
  vibe: string;
  display: { family: string; weights: string };
  body: { family: string; weights: string };
  rule: string;
};

export const FONT_PAIRINGS: FontPairing[] = [
  { id: "playfair-source", name: "Playfair Display + Source Sans 3", vibe: "Editorial",
    display: { family: "Playfair Display", weights: "400;700;900" },
    body: { family: "Source Sans 3", weights: "300;400;600" },
    rule: "Serif display + sans body — classic editorial." },
  { id: "space-inter", name: "Space Grotesk + Inter", vibe: "Modern SaaS",
    display: { family: "Space Grotesk", weights: "400;500;700" },
    body: { family: "Inter", weights: "300;400;500;700" },
    rule: "Geometric sans + neutral sans — modern product UI." },
  { id: "fraunces-jost", name: "Fraunces + Jost", vibe: "Artisanal",
    display: { family: "Fraunces", weights: "400;700;900" },
    body: { family: "Jost", weights: "300;400;500" },
    rule: "Variable serif + geometric sans — craft brands." },
  { id: "syne-dm", name: "Syne + DM Sans", vibe: "Creative agency",
    display: { family: "Syne", weights: "500;700;800" },
    body: { family: "DM Sans", weights: "400;500;700" },
    rule: "Quirky display + neutral body — agency portfolios." },
  { id: "archivo-black", name: "Archivo Black + Archivo", vibe: "Strong brand",
    display: { family: "Archivo Black", weights: "400" },
    body: { family: "Archivo", weights: "400;500;700" },
    rule: "Heavy display + same-family body — tight identity." },
  { id: "bebas-barlow", name: "Bebas Neue + Barlow", vibe: "Bold / sports",
    display: { family: "Bebas Neue", weights: "400" },
    body: { family: "Barlow", weights: "400;500;700" },
    rule: "Condensed display + utilitarian body — sports/bold." },
  { id: "cormorant-mulish", name: "Cormorant Garamond + Mulish", vibe: "Luxury",
    display: { family: "Cormorant Garamond", weights: "400;500;700" },
    body: { family: "Mulish", weights: "300;400;600" },
    rule: "Elegant serif + soft sans — luxury hospitality." },
  { id: "raleway-lato", name: "Raleway + Lato", vibe: "Professional",
    display: { family: "Raleway", weights: "300;500;700" },
    body: { family: "Lato", weights: "400;700" },
    rule: "Refined sans + warm sans — corporate professional." },
  { id: "oswald-merriweather", name: "Oswald + Merriweather", vibe: "News / magazine",
    display: { family: "Oswald", weights: "500;700" },
    body: { family: "Merriweather", weights: "400;700" },
    rule: "Condensed sans + reading serif — editorial news." },
  { id: "manrope-ibm-mono", name: "Manrope + IBM Plex Mono", vibe: "Technical",
    display: { family: "Manrope", weights: "500;700;800" },
    body: { family: "IBM Plex Mono", weights: "400;500" },
    rule: "Sans display + mono accent — dev tools." },
  { id: "abril-poppins", name: "Abril Fatface + Poppins", vibe: "Magazine",
    display: { family: "Abril Fatface", weights: "400" },
    body: { family: "Poppins", weights: "300;400;500" },
    rule: "Display serif + geometric sans — fashion magazine." },
  { id: "lora-roboto", name: "Lora + Roboto", vibe: "Blog / writing",
    display: { family: "Lora", weights: "500;700" },
    body: { family: "Roboto", weights: "400;500" },
    rule: "Soft serif + neutral sans — long-form blogs." },
  { id: "rubik-work", name: "Rubik + Work Sans", vibe: "Friendly tech",
    display: { family: "Rubik", weights: "500;700" },
    body: { family: "Work Sans", weights: "400;500" },
    rule: "Rounded sans + humanist sans — approachable apps." },
  { id: "monoton-roboto-mono", name: "Monoton + Roboto Mono", vibe: "Retro / arcade",
    display: { family: "Monoton", weights: "400" },
    body: { family: "Roboto Mono", weights: "400;500" },
    rule: "Outline display + mono — retro/gaming vibes." },
  { id: "nunito-bree", name: "Bree Serif + Nunito", vibe: "Education",
    display: { family: "Bree Serif", weights: "400" },
    body: { family: "Nunito", weights: "400;600;700" },
    rule: "Slab serif + soft sans — kids/education." },
  { id: "dela-inter", name: "Dela Gothic One + Inter", vibe: "Indie startup",
    display: { family: "Dela Gothic One", weights: "400" },
    body: { family: "Inter", weights: "400;500;700" },
    rule: "Heavy display + neutral body — bold founders." },
  { id: "yeseva-josefin", name: "Yeseva One + Josefin Sans", vibe: "Boutique",
    display: { family: "Yeseva One", weights: "400" },
    body: { family: "Josefin Sans", weights: "300;400;600" },
    rule: "Calligraphic display + airy sans — boutique." },
  { id: "kanit-prompt", name: "Kanit + Prompt", vibe: "Sports / fitness",
    display: { family: "Kanit", weights: "500;700;900" },
    body: { family: "Prompt", weights: "300;400;500" },
    rule: "Italic-friendly sans pair — sports/fitness." },
  { id: "spectral-karla", name: "Spectral + Karla", vibe: "Literary",
    display: { family: "Spectral", weights: "400;600;800" },
    body: { family: "Karla", weights: "400;500;700" },
    rule: "Reading serif + grotesque sans — literary brands." },
  { id: "outfit-jetbrains", name: "Outfit + JetBrains Mono", vibe: "Dev / SaaS",
    display: { family: "Outfit", weights: "500;700;800" },
    body: { family: "JetBrains Mono", weights: "400;500" },
    rule: "Geometric sans + dev mono — devtool brands." },
  { id: "marcellus-quattrocento", name: "Marcellus + Quattrocento Sans", vibe: "Heritage",
    display: { family: "Marcellus", weights: "400" },
    body: { family: "Quattrocento Sans", weights: "400;700" },
    rule: "Roman capital serif + humanist sans — heritage." },
  { id: "league-spartan-noto", name: "League Spartan + Noto Sans", vibe: "Global / civic",
    display: { family: "League Spartan", weights: "500;700;900" },
    body: { family: "Noto Sans", weights: "400;500;700" },
    rule: "Geometric display + multilingual body — civic/global." },
  { id: "tenor-libre", name: "Tenor Sans + Libre Franklin", vibe: "Minimal luxury",
    display: { family: "Tenor Sans", weights: "400" },
    body: { family: "Libre Franklin", weights: "300;400;600" },
    rule: "Refined sans display + classic body — quiet luxury." },
  { id: "anton-roboto", name: "Anton + Roboto", vibe: "Posters",
    display: { family: "Anton", weights: "400" },
    body: { family: "Roboto", weights: "400;500" },
    rule: "Compressed display + neutral body — posters/headlines." },
  { id: "young-serif-mukta", name: "Young Serif + Mukta", vibe: "Wellness",
    display: { family: "Young Serif", weights: "400" },
    body: { family: "Mukta", weights: "300;400;600" },
    rule: "Soft serif + airy sans — wellness/lifestyle." },
];

export function googleFontsImport(p: FontPairing): string {
  const enc = (f: string) => f.replace(/ /g, "+");
  return `@import url("https://fonts.googleapis.com/css2?family=${enc(p.display.family)}:wght@${p.display.weights.replace(/;/g, ";")}&family=${enc(p.body.family)}:wght@${p.body.weights.replace(/;/g, ";")}&display=swap");`;
}

export function fontsCss(p: FontPairing): string {
  return `${googleFontsImport(p)}

:root {
  --font-display: "${p.display.family}", system-ui, sans-serif;
  --font-body: "${p.body.family}", system-ui, sans-serif;
}

body { font-family: var(--font-body); }
h1, h2, h3, h4, h5, h6 { font-family: var(--font-display); }
`;
}

export function typographyCss(p: FontPairing): string {
  return `${googleFontsImport(p)}

/* Typographic scale — fluid, modular */
:root {
  --font-display: "${p.display.family}", system-ui, sans-serif;
  --font-body: "${p.body.family}", system-ui, sans-serif;
}
html { font-family: var(--font-body); font-size: 16px; line-height: 1.6; }
h1 { font-family: var(--font-display); font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; letter-spacing: -0.02em; font-weight: 700; }
h2 { font-family: var(--font-display); font-size: clamp(2rem, 4vw, 3rem); line-height: 1.1; letter-spacing: -0.015em; font-weight: 700; }
h3 { font-family: var(--font-display); font-size: clamp(1.5rem, 3vw, 2rem); line-height: 1.2; font-weight: 600; }
h4 { font-family: var(--font-display); font-size: 1.25rem; line-height: 1.3; font-weight: 600; }
h5 { font-size: 1rem; font-weight: 600; }
h6 { font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
p  { font-size: 1rem; margin: 0 0 1rem; }
small, .caption { font-size: 0.8125rem; color: #777; }
`;
}
