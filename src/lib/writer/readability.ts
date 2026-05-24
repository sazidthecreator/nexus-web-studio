/**
 * Flesch-Kincaid readability scoring — pure, offline, deterministic.
 * Works on any plain text (block content extracted upstream).
 */

export type ReadabilityResult = {
  fleschReadingEase: number;   // 0..100, higher = easier
  fleschKincaidGrade: number;  // ~ US grade level
  words: number;
  sentences: number;
  syllables: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  level: "very-easy" | "easy" | "standard" | "hard" | "very-hard";
  hint: string;
};

const VOWELS = /[aeiouy]+/g;

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w
    .replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "");
  const m = trimmed.match(VOWELS);
  return Math.max(1, m ? m.length : 1);
}

export function analyzeReadability(text: string): ReadabilityResult {
  const safe = (text || "").trim();
  if (!safe) {
    return {
      fleschReadingEase: 0,
      fleschKincaidGrade: 0,
      words: 0,
      sentences: 0,
      syllables: 0,
      avgWordsPerSentence: 0,
      avgSyllablesPerWord: 0,
      level: "standard",
      hint: "Add some content to score readability.",
    };
  }
  const sentences = Math.max(1, (safe.match(/[.!?]+/g) || []).length);
  const wordList = safe.split(/\s+/).filter(Boolean);
  const words = Math.max(1, wordList.length);
  const syllables = wordList.reduce((sum, w) => sum + countSyllables(w), 0);

  const avgWordsPerSentence = words / sentences;
  const avgSyllablesPerWord = syllables / words;

  const fleschReadingEase =
    206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const fleschKincaidGrade =
    0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

  let level: ReadabilityResult["level"] = "standard";
  let hint = "Reads at a typical adult level.";
  if (fleschReadingEase >= 80) {
    level = "very-easy";
    hint = "Very easy — great for broad audiences.";
  } else if (fleschReadingEase >= 65) {
    level = "easy";
    hint = "Easy — clear and approachable.";
  } else if (fleschReadingEase >= 50) {
    level = "standard";
    hint = "Plain English — works for most readers.";
  } else if (fleschReadingEase >= 30) {
    level = "hard";
    hint = "Hard — try shorter sentences and simpler words.";
  } else {
    level = "very-hard";
    hint = "Very hard — break long sentences and avoid jargon.";
  }

  return {
    fleschReadingEase: round(fleschReadingEase, 1),
    fleschKincaidGrade: round(fleschKincaidGrade, 1),
    words,
    sentences,
    syllables,
    avgWordsPerSentence: round(avgWordsPerSentence, 2),
    avgSyllablesPerWord: round(avgSyllablesPerWord, 2),
    level,
    hint,
  };
}

function round(n: number, p: number): number {
  if (!Number.isFinite(n)) return 0;
  const f = Math.pow(10, p);
  return Math.round(n * f) / f;
}
