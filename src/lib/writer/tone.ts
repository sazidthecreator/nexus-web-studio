/**
 * Lexicon-based tone detector — pure, offline.
 * Returns dominant tone and per-tone scores (0..1 normalized).
 */

const LEX = {
  formal: ["therefore", "however", "furthermore", "regarding", "shall", "hereby", "pursuant", "accordingly", "consequently", "moreover"],
  casual: ["hey", "yeah", "cool", "awesome", "stuff", "kinda", "gonna", "wanna", "totally", "nice"],
  urgent: ["now", "today", "limited", "hurry", "deadline", "expire", "last", "only", "instant", "fast"],
  friendly: ["welcome", "thanks", "happy", "love", "enjoy", "great", "wonderful", "delighted", "glad", "smile"],
  confident: ["proven", "guaranteed", "trusted", "leading", "best", "expert", "premier", "top", "renowned", "award"],
  technical: ["api", "algorithm", "framework", "database", "infrastructure", "deployment", "latency", "throughput", "schema", "endpoint"],
} as const;

export type Tone = keyof typeof LEX;
export type ToneScores = Record<Tone, number>;
export type ToneResult = {
  dominant: Tone | null;
  scores: ToneScores;
  hint: string;
};

export function analyzeTone(text: string): ToneResult {
  const empty: ToneScores = {
    formal: 0, casual: 0, urgent: 0, friendly: 0, confident: 0, technical: 0,
  };
  const words = (text || "").toLowerCase().match(/[a-z]+/g) || [];
  if (!words.length) {
    return { dominant: null, scores: empty, hint: "Add content to detect tone." };
  }
  const counts: ToneScores = { ...empty };
  for (const w of words) {
    for (const tone of Object.keys(LEX) as Tone[]) {
      if ((LEX[tone] as readonly string[]).includes(w)) counts[tone] += 1;
    }
  }
  // Normalize by sample size; cap at 1.
  const norm: ToneScores = { ...empty };
  for (const tone of Object.keys(counts) as Tone[]) {
    norm[tone] = Math.min(1, counts[tone] / Math.max(20, words.length / 10));
  }
  let dominant: Tone | null = null;
  let max = 0;
  for (const tone of Object.keys(norm) as Tone[]) {
    if (norm[tone] > max) { max = norm[tone]; dominant = tone; }
  }
  const hints: Record<Tone, string> = {
    formal: "Formal — polished and professional.",
    casual: "Casual — friendly and conversational.",
    urgent: "Urgent — drives quick action.",
    friendly: "Friendly — warm and welcoming.",
    confident: "Confident — assertive and authoritative.",
    technical: "Technical — precise and detailed.",
  };
  return {
    dominant,
    scores: norm,
    hint: dominant ? hints[dominant] : "Neutral tone detected.",
  };
}
