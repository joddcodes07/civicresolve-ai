// Optional LLM provider adapter. Supports any OpenAI-compatible endpoint
// (Groq, OpenAI, Ollama, OpenRouter) plus Google Gemini. This is a *transparent
// upgrade*: if it is not configured or fails, aiService falls back to the local
// rules classifier, so the product never breaks.

import { env, llmEnabled } from '../../env.js'
import { CATEGORIES } from '../../data/taxonomy.js'
import { maskPII } from '../../lib/text.js'

const CATEGORY_NAMES = CATEGORIES.map((c) => c.name)

const SYSTEM_PROMPT = `You are the routing engine for an Indian municipal grievance portal.
Read the citizen's complaint (it may be in English, Hindi, Marathi or Hinglish) and reply with
STRICT JSON only, no prose, using exactly these keys:

{
  "language": "en" | "hi" | "mr" | "hinglish",
  "english_text": "<faithful English translation of the complaint>",
  "category": "<one of the allowed categories verbatim>",
  "severity": <integer 1-5, 5 = immediate danger to life>,
  "safety_risk": <true|false>,
  "summary": "<max 120 character English summary>",
  "confidence": <number 0..1>
}

Allowed categories (choose exactly one, verbatim):
${CATEGORY_NAMES.join('\n')}

Rules: never invent a category. If unsure, use "Other / General" and set confidence below 0.6.
Examples:
- "nala block hai, paani bhar gaya" -> category "Blocked Drain", severity 4, confidence 0.9
- "बच्चे खेल रहे हैं और मैनहोल खुला है" -> category "Open / Missing Manhole", severity 5, safety_risk true`

function timeoutSignal(ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, clear: () => clearTimeout(timer) }
}

export function llmAvailable() {
  return llmEnabled
}

function defaultBaseUrl(provider) {
  if (env.llm.baseUrl) return env.llm.baseUrl.replace(/\/$/, '')
  switch (provider) {
    case 'groq':
      return 'https://api.groq.com/openai/v1'
    case 'openai':
      return 'https://api.openai.com/v1'
    case 'ollama':
      return 'http://127.0.0.1:11434/v1'
    default:
      return ''
  }
}

function defaultModel(provider) {
  if (env.llm.model) return env.llm.model
  switch (provider) {
    case 'groq':
      return 'openai/gpt-oss-20b'
    case 'openai':
      return 'gpt-4o-mini'
    case 'ollama':
      return 'llama3.1'
    case 'gemini':
      return 'gemini-2.5-flash'
    default:
      return ''
  }
}

function parseJsonResponse(raw) {
  if (!raw) return null
  const cleaned = String(raw).replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}

async function callOpenAICompatible(text) {
  const baseUrl = defaultBaseUrl(env.llm.provider)
  const model = defaultModel(env.llm.provider)
  if (!baseUrl || !model) return null

  const { signal, clear } = timeoutSignal(env.llm.timeoutMs)
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(env.llm.apiKey ? { Authorization: `Bearer ${env.llm.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
      }),
    })
    if (!res.ok) return null
    const body = await res.json()
    return parseJsonResponse(body?.choices?.[0]?.message?.content)
  } catch {
    return null
  } finally {
    clear()
  }
}

async function callGemini(text) {
  const model = defaultModel('gemini')
  const { signal, clear } = timeoutSignal(env.llm.timeoutMs)
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.llm.apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    })
    if (!res.ok) return null
    const body = await res.json()
    const raw = body?.candidates?.[0]?.content?.parts?.[0]?.text
    return parseJsonResponse(raw)
  } catch {
    return null
  } finally {
    clear()
  }
}

/**
 * Classify via the configured LLM. Returns a normalised object or null.
 */
export async function classifyWithLLM(text) {
  if (!llmAvailable()) return null
  const masked = maskPII(text)
  const json =
    env.llm.provider === 'gemini' ? await callGemini(masked) : await callOpenAICompatible(masked)
  if (!json) return null

  const categoryName = CATEGORY_NAMES.includes(json.category) ? json.category : null
  const severity = Math.min(5, Math.max(1, Math.round(Number(json.severity) || 3)))

  return {
    provider: env.llm.provider,
    model: defaultModel(env.llm.provider),
    categoryName,
    severity,
    safetyRisk: Boolean(json.safety_risk),
    confidence: Math.min(1, Math.max(0, Number(json.confidence) || 0.7)),
    language: ['en', 'hi', 'mr', 'hinglish'].includes(json.language) ? json.language : 'en',
    englishText: String(json.english_text || text).trim(),
    summary: String(json.summary || '').trim(),
  }
}
