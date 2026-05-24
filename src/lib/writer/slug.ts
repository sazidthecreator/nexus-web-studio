/**
 * Unicode-aware slug generator with optional dedupe.
 * Pure, offline, deterministic.
 */

const TRANSLIT: Record<string, string> = {
  à: "a", á: "a", â: "a", ä: "a", ã: "a", å: "a", ā: "a",
  ç: "c", č: "c",
  é: "e", è: "e", ê: "e", ë: "e", ē: "e", ě: "e",
  í: "i", ì: "i", î: "i", ï: "i", ī: "i",
  ñ: "n",
  ó: "o", ò: "o", ô: "o", ö: "o", õ: "o", ō: "o", ø: "o",
  ú: "u", ù: "u", û: "u", ü: "u", ū: "u",
  ý: "y", ÿ: "y",
  ß: "ss", æ: "ae", œ: "oe",
};

export function slugify(input: string): string {
  if (!input) return "";
  let s = input.normalize("NFKD").toLowerCase();
  s = s.replace(/[\u0300-\u036f]/g, ""); // strip combining marks
  s = s.replace(/[\u00c0-\u017f]/g, (ch) => TRANSLIT[ch] ?? "");
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s.slice(0, 80);
}

export function uniqueSlug(input: string, taken: Iterable<string>): string {
  const base = slugify(input) || "page";
  const set = new Set(taken);
  if (!set.has(base)) return base;
  let i = 2;
  while (set.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
