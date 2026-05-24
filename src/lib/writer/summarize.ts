/**
 * Extractive TF-IDF summarizer — pure, offline.
 * Picks the highest-scoring sentences by TF-IDF + leading-position bias.
 */

const STOPWORDS = new Set([
  "a","an","the","and","or","but","if","then","else","of","at","by","for","with","about","against","between","into","through","during","before","after","above","below","to","from","up","down","in","out","on","off","over","under","again","further","once","here","there","when","where","why","how","all","any","both","each","few","more","most","other","some","such","no","nor","not","only","own","same","so","than","too","very","s","t","can","will","just","don","should","now","is","are","was","were","be","been","being","have","has","had","do","does","did","this","that","these","those","i","you","he","she","it","we","they","what","which","who","whom","my","your","his","her","its","our","their","me","him","us","them"
]);

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z][a-z0-9'-]+/g) || []).filter(
    (w) => !STOPWORDS.has(w) && w.length > 2,
  );
}

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [])
    .map((s) => s.trim())
    .filter((s) => s.length >= 20);
}

export function summarize(text: string, maxSentences = 3): string {
  const sentences = splitSentences(text || "");
  if (sentences.length <= maxSentences) return sentences.join(" ").trim();

  // Document frequency
  const df = new Map<string, number>();
  const sentenceTokens = sentences.map((s) => {
    const toks = tokenize(s);
    const unique = new Set(toks);
    unique.forEach((t) => df.set(t, (df.get(t) || 0) + 1));
    return toks;
  });

  const N = sentences.length;
  // Score each sentence by sum of TF-IDF + position bonus.
  const scored = sentences.map((s, i) => {
    const toks = sentenceTokens[i];
    const tf = new Map<string, number>();
    toks.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
    let score = 0;
    tf.forEach((freq, term) => {
      const idf = Math.log(1 + N / (1 + (df.get(term) || 0)));
      score += freq * idf;
    });
    // Length normalize + leading bonus.
    score = score / Math.max(1, toks.length);
    const positionBonus = i < 3 ? (3 - i) * 0.1 : 0;
    return { idx: i, sentence: s, score: score + positionBonus };
  });

  scored.sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, maxSentences).sort((a, b) => a.idx - b.idx);
  return picked.map((p) => p.sentence).join(" ").trim();
}

/** Generate a meta description: trim summarized text to ~155 chars. */
export function metaDescription(text: string, max = 155): string {
  const s = summarize(text, 2);
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\-]+$/, "") + "…";
}
