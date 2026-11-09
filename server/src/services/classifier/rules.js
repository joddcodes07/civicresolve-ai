// Deterministic, zero-dependency classifier. Works fully offline so the product
// never depends on an external API key. The LLM path (services/provider/llm.js)
// is a transparent upgrade that falls back to these rules on any failure.

import { CATEGORIES, SEVERITY_SIGNALS, SAFETY_SIGNALS, GLOSS } from '../../data/taxonomy.js'
import { normalizeText, hasDevanagari, cosineSimilarity, firstSentences } from '../../lib/text.js'

const MARATHI_MARKERS = ['आहे', 'नाही', 'आणि', 'मध्ये', 'येत', 'तुंबले', 'झाले', 'करा', 'पाहिजे', 'होत']
const HINGLISH_MARKERS = ['hai', 'nahi', 'raha', 'gaya', 'karo', 'kya', 'bhi', 'mein', 'ka', 'ki', 'ke', 'koi']
const DEVANAGARI_RE = /[\u0900-\u097F]/

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Case/space-insensitive keyword hit test with ASCII word boundaries. */
function containsKeyword(normalized, keyword) {
  const kw = normalizeText(keyword)
  if (!kw) return false
  if (DEVANAGARI_RE.test(kw)) return normalized.includes(kw)
  const re = new RegExp(`(^|[^\\p{L}])${escapeRegExp(kw)}([^\\p{L}]|$)`, 'u')
  return re.test(` ${normalized} `)
}

function keywordWeight(keyword) {
  const words = normalizeText(keyword).split(' ').filter(Boolean).length
  return 1 + 0.6 * (words - 1)
}

export function detectLanguage(text = '') {
  const normalized = normalizeText(text)
  if (hasDevanagari(text)) {
    const marathiHits = MARATHI_MARKERS.filter((m) => normalized.includes(normalizeText(m))).length
    return marathiHits >= 1 ? 'mr' : 'hi'
  }
  const tokens = normalized.split(' ')
  const hinglishHits = tokens.filter((t) => HINGLISH_MARKERS.includes(t)).length
  if (hinglishHits >= 2) return 'hinglish'
  return 'en'
}

/** Rough word-by-word English rendering for Devanagari input (no LLM needed). */
export function glossToEnglish(text = '') {
  if (!hasDevanagari(text)) return String(text).trim()
  return String(text)
    .split(/\s+/)
    .map((word) => {
      const key = word.replace(/[^\u0900-\u097F]/g, '')
      return GLOSS[key] || word
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function severityFromSignals(text, base) {
  const normalized = normalizeText(text)
  let severity = base
  if (SEVERITY_SIGNALS.critical.some((k) => containsKeyword(normalized, k))) severity = Math.max(severity, 5)
  else if (SEVERITY_SIGNALS.high.some((k) => containsKeyword(normalized, k))) severity = Math.max(severity, 4)
  return Math.min(5, Math.max(1, severity))
}

export function detectSafetyRisk(text) {
  const normalized = normalizeText(text)
  return SAFETY_SIGNALS.some((k) => containsKeyword(normalized, k))
}

const SENSITIVE_PLACE_SIGNALS = [
  'school', 'hospital', 'clinic', 'children', 'child', 'bus stop', 'market', 'temple',
  'बच्चे', 'बच्चा', 'शाळा', 'शाळेत', 'स्कूल', 'अस्पताल', 'रुग्णालय', 'बाजार',
]

/** +10 in F1 when the problem is next to a school / hospital / busy public place. */
export function detectSensitivePlace(text) {
  const normalized = normalizeText(text)
  return SENSITIVE_PLACE_SIGNALS.some((k) => containsKeyword(normalized, k))
}

/** Score every category against the text and return them sorted best-first. */
export function scoreCategories(text = '') {
  const normalized = normalizeText(text)
  const scored = CATEGORIES.map((category) => {
    let score = 0
    const matched = []
    for (const keyword of category.keywords) {
      if (containsKeyword(normalized, keyword)) {
        const w = keywordWeight(keyword)
        score += w
        matched.push(keyword)
      }
    }
    // A short cosine nudge so a near-verbatim retype of a seed phrase wins ties.
    const nameScore = cosineSimilarity(category.name, normalized) * 0.5
    return { category, score: score + nameScore, matched }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored
}

/**
 * Classify a complaint with the local rules engine.
 * @returns {{category:object, departmentCode:string, severity:number, safetyRisk:boolean,
 *            confidence:number, matched:string[], language:string, englishText:string, summary:string}}
 */
export function classifyWithRules(text = '') {
  const language = detectLanguage(text)
  const scored = scoreCategories(text)
  const top = scored[0]
  const second = scored[1]

  const fallback = CATEGORIES.find((c) => c.name === 'Other / General')

  let chosen = top
  let confidence
  if (!top || top.score <= 0) {
    chosen = { category: fallback, score: 0, matched: [] }
    confidence = 0.3
  } else {
    const margin = top.score - (second ? second.score : 0)
    const absolute = Math.min(1, top.score / 5)
    const relative = top.score > 0 ? margin / top.score : 0
    confidence = Math.min(0.97, 0.42 + 0.4 * relative + 0.25 * absolute)
  }

  const category = chosen.category
  const severity = severityFromSignals(text, category.defaultSeverity)
  const safetyRisk = detectSafetyRisk(text)
  const nearSchoolOrHospital = detectSensitivePlace(text)
  const englishText = glossToEnglish(text)

  return {
    category,
    categoryName: category.name,
    departmentCode: category.departmentCode,
    severity,
    safetyRisk,
    nearSchoolOrHospital,
    confidence: Number(confidence.toFixed(3)),
    matched: chosen.matched || [],
    language,
    englishText,
    summary: firstSentences(englishText || text, 140),
    needsReview: confidence < 0.6,
    routingSource: 'rules',
  }
}
