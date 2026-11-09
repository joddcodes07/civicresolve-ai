// Text utilities — normalisation, tokenising, similarity and PII masking.

const DEVANAGARI = /[\u0900-\u097F]/

export function hasDevanagari(text = '') {
  return DEVANAGARI.test(text)
}

/** Lowercase, strip punctuation, collapse whitespace. Keeps Devanagari intact. */
export function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'in', 'on', 'at',
  'and', 'or', 'for', 'with', 'this', 'that', 'these', 'those', 'it', 'its', 'my', 'our',
  'there', 'here', 'please', 'kindly', 'very', 'from', 'has', 'have', 'had', 'not', 'no',
  'near', 'by', 'nearby', 'area', 'road', 'roads', 'ka', 'ke', 'ki', 'hai', 'ho', 'raha',
  'me', 'mein', 'par', 'se', 'ko', 'aur', 'ek', 'bhi', 'koi', 'है', 'हैं', 'का', 'के', 'की',
  'में', 'पर', 'से', 'को', 'और', 'एक', 'भी', 'कोई', 'आहे', 'आणि', 'मध्ये', 'जवळ',
])

export function tokenize(text = '') {
  return normalizeText(text)
    .split(' ')
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

/** Cosine similarity over token-frequency vectors (0..1). */
export function cosineSimilarity(aText, bText) {
  const a = termFreq(tokenize(aText))
  const b = termFreq(tokenize(bText))
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  let dot = 0
  let magA = 0
  let magB = 0
  for (const k of keys) {
    const av = a[k] || 0
    const bv = b[k] || 0
    dot += av * bv
    magA += av * av
    magB += bv * bv
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

/** Jaccard overlap of token sets (0..1) — used as a secondary duplicate signal. */
export function jaccard(aText, bText) {
  const a = new Set(tokenize(aText))
  const b = new Set(tokenize(bText))
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  return inter / (a.size + b.size - inter)
}

function termFreq(tokens) {
  const tf = {}
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1
  return tf
}

/** Mask Indian phone numbers, Aadhaar-like 12-digit ids and emails before any external call. */
export function maskPII(text = '') {
  return String(text)
    .replace(/\b[6-9]\d{9}\b/g, '[PHONE]')
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[AADHAAR]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EMAIL]')
}

export function firstSentences(text = '', max = 140) {
  const clean = String(text).replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max - 1).trimEnd() + '…'
}
