import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const model = JSON.parse(readFileSync(path.join(__dirname, "genre_model.json"), "utf-8"));

const TOKEN_PATTERN = /[a-z0-9]{2,}/giu;

function tokenize(text) {
  return (text.toLowerCase().match(TOKEN_PATTERN) || []).filter((t) => /\w/.test(t));
}

function vectorize(text) {
  const counts = new Map();
  for (const token of tokenize(text)) {
    const index = model.vocab[token];
    if (index === undefined) continue;
    counts.set(index, (counts.get(index) || 0) + 1);
  }

  const tfidf = new Map();
  let normSq = 0;
  for (const [index, count] of counts) {
    const value = count * model.idf[index];
    tfidf.set(index, value);
    normSq += value * value;
  }

  const norm = Math.sqrt(normSq) || 1;
  for (const [index, value] of tfidf) {
    tfidf.set(index, value / norm);
  }
  return tfidf;
}

function classifyGenre(title, channel) {
  const vec = vectorize(`${title || ""} ${channel || ""}`);
  if (vec.size === 0) return "other";

  let bestClass = "other";
  let bestScore = -Infinity;

  for (let c = 0; c < model.classes.length; c++) {
    let score = model.intercept[c];
    for (const [index, value] of vec) {
      score += value * model.coef[c][index];
    }
    if (score > bestScore) {
      bestScore = score;
      bestClass = model.classes[c];
    }
  }
  return bestClass;
}

export { classifyGenre };
