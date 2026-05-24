/**
 * Common-mistakes "spelling lite" — embedded dictionary of frequent
 * confusions and typos. Pure, offline, no network. Returns suggestions
 * with character offsets so callers can highlight in-place.
 */

const COMMON_FIXES: Record<string, string> = {
  // typos
  teh: "the", recieve: "receive", definately: "definitely", seperate: "separate",
  occured: "occurred", tommorow: "tomorrow", untill: "until", begining: "beginning",
  beleive: "believe", acheive: "achieve", arguement: "argument", calender: "calendar",
  cemetary: "cemetery", concious: "conscious", embarass: "embarrass", enviroment: "environment",
  existance: "existence", goverment: "government", harrass: "harass", independant: "independent",
  liason: "liaison", maintainance: "maintenance", neccessary: "necessary", noticable: "noticeable",
  occassion: "occasion", peice: "piece", percieve: "perceive", priviledge: "privilege",
  publically: "publicly", recomend: "recommend", refered: "referred", relevent: "relevant",
  succesful: "successful", supercede: "supersede", thier: "their", truely: "truly",
  wierd: "weird", writting: "writing",
  // common confusions
  alot: "a lot", alright: "all right", thats: "that's", dont: "don't", cant: "can't",
  wont: "won't", couldnt: "couldn't", wouldnt: "wouldn't", shouldnt: "shouldn't",
  // brand-style fixes
  ecommerce: "e-commerce", inbox: "inbox",
};

const PHRASE_FIXES: Array<[RegExp, string]> = [
  [/\bcould of\b/gi, "could have"],
  [/\bshould of\b/gi, "should have"],
  [/\bwould of\b/gi, "would have"],
  [/\bin regards to\b/gi, "regarding"],
  [/\beach and every\b/gi, "every"],
  [/\bin order to\b/gi, "to"],
  [/\bdue to the fact that\b/gi, "because"],
];

export type SpellSuggestion = {
  start: number;
  end: number;
  original: string;
  suggestion: string;
  reason: "typo" | "phrasing";
};

export function checkSpelling(text: string): SpellSuggestion[] {
  if (!text) return [];
  const out: SpellSuggestion[] = [];
  // Word-level fixes
  const wordRe = /[A-Za-z'-]+/g;
  let m: RegExpExecArray | null;
  while ((m = wordRe.exec(text)) !== null) {
    const orig = m[0];
    const lower = orig.toLowerCase();
    const fix = COMMON_FIXES[lower];
    if (fix) {
      out.push({
        start: m.index,
        end: m.index + orig.length,
        original: orig,
        suggestion: matchCase(fix, orig),
        reason: "typo",
      });
    }
  }
  // Phrase-level fixes
  for (const [re, replacement] of PHRASE_FIXES) {
    re.lastIndex = 0;
    let pm: RegExpExecArray | null;
    while ((pm = re.exec(text)) !== null) {
      out.push({
        start: pm.index,
        end: pm.index + pm[0].length,
        original: pm[0],
        suggestion: replacement,
        reason: "phrasing",
      });
      if (pm[0].length === 0) re.lastIndex++;
    }
  }
  out.sort((a, b) => a.start - b.start);
  return out;
}

function matchCase(target: string, source: string): string {
  if (source === source.toUpperCase()) return target.toUpperCase();
  if (source[0] === source[0]?.toUpperCase()) return target[0].toUpperCase() + target.slice(1);
  return target;
}
