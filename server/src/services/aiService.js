// AI routing service. One public entry point: classifyComplaint().
//
// Pipeline: mask -> (LLM provider if configured, else rules) -> validate against
// the DB taxonomy -> confidence gate. Any LLM failure silently falls back to the
// deterministic rules engine so a complaint is never lost.

import { haversineMetres } from '../lib/geo.js'
import { prisma } from '../db.js'
import { classifyWithRules, detectSensitivePlace } from './classifier/rules.js'
import { classifyWithLLM, llmAvailable } from './provider/llm.js'

const FALLBACK_NAME = 'Other / General'
const CONFIDENCE_GATE = 0.7

let categoryCache = null
let categoryCacheAt = 0
const CACHE_TTL_MS = 60_000

export async function getCategoryIndex(force = false) {
  const fresh = categoryCache && Date.now() - categoryCacheAt < CACHE_TTL_MS
  if (fresh && !force) return categoryCache

  const categories = await prisma.category.findMany({ include: { department: true } })
  const byName = new Map()
  const byId = new Map()
  for (const c of categories) {
    byName.set(c.name.toLowerCase(), c)
    byId.set(c.id, c)
  }
  categoryCache = { categories, byName, byId, fallback: byName.get(FALLBACK_NAME.toLowerCase()) || categories[0] }
  categoryCacheAt = Date.now()
  return categoryCache
}

function resolveCategory(index, name) {
  if (!name) return index.fallback
  return index.byName.get(String(name).toLowerCase()) || index.fallback
}

/**
 * Classify a complaint.
 * @param {string} text
 * @param {{ persist?: boolean }} [opts]
 */
export async function classifyComplaint(text, opts = {}) {
  const index = await getCategoryIndex()

  let result = null
  let llmMeta = null

  if (llmAvailable()) {
    const llm = await classifyWithLLM(text)
    if (llm) {
      const category = resolveCategory(index, llm.categoryName)
      const unrecognised = !llm.categoryName
      result = {
        category,
        severity: llm.severity,
        safetyRisk: llm.safetyRisk,
        nearSchoolOrHospital: detectSensitivePlace(text),
        confidence: unrecognised ? Math.min(llm.confidence, 0.5) : llm.confidence,
        language: llm.language,
        englishText: llm.englishText,
        summary: llm.summary || llm.englishText.slice(0, 140),
        matched: [],
        routingSource: 'llm',
      }
      llmMeta = { provider: llm.provider, model: llm.model }
    }
  }

  if (!result) {
    const rules = classifyWithRules(text)
    result = {
      category: resolveCategory(index, rules.categoryName),
      severity: rules.severity,
      safetyRisk: rules.safetyRisk,
      nearSchoolOrHospital: rules.nearSchoolOrHospital,
      confidence: rules.confidence,
      language: rules.language,
      englishText: rules.englishText,
      summary: rules.summary,
      matched: rules.matched,
      routingSource: 'rules',
    }
  }

  if (Number.isFinite(opts.lat) && Number.isFinite(opts.lng)) {
    const places = await prisma.sensitivePlace.findMany({ where: {
      lat: { gte: opts.lat - 0.002, lte: opts.lat + 0.002 },
      lng: { gte: opts.lng - 0.002, lte: opts.lng + 0.002 },
    } })
    result.nearSchoolOrHospital ||= places.some(p => haversineMetres(opts.lat, opts.lng, p.lat, p.lng) <= 200)
  }
  // Local keyword rules do not translate Hindi/Marathi: require an officer check.
  const translationUnavailable = result.routingSource === 'rules' && result.language !== 'en'
  const category = result.category
  const department = category?.department || null
  const needsReview = result.confidence < CONFIDENCE_GATE || !department || translationUnavailable

  return {
    categoryId: category?.id || null,
    categoryName: category?.name || FALLBACK_NAME,
    departmentId: department?.id || null,
    departmentName: department?.name || null,
    departmentCode: department?.code || null,
    slaHours: department?.slaHours || 72,
    severity: result.severity,
    safetyRisk: result.safetyRisk,
    nearSchoolOrHospital: Boolean(result.nearSchoolOrHospital),
    confidence: Number(result.confidence.toFixed(3)),
    needsReview,
    language: result.language,
    translationAvailable: !translationUnavailable,
    englishText: translationUnavailable ? null : result.englishText,
    summary: result.summary,
    matched: opts.includeMatched ? result.matched : undefined,
    routingSource: result.routingSource,
    llm: llmMeta,
  }
}

export function aiStatus() {
  return {
    engine: llmAvailable() ? 'llm+rules' : 'rules',
    llm: llmAvailable(),
    confidenceGate: CONFIDENCE_GATE,
  }
}
