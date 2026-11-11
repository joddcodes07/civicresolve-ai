import fs from 'node:fs/promises'
import { classifyComplaint } from '../src/services/aiService.js'
import { prisma } from '../src/db.js'
import { llmEnabled } from '../src/env.js'
try {
  const samples = JSON.parse(await fs.readFile(new URL('../data/ai-evaluation.json', import.meta.url)))
  const results = []
  for (const s of samples) {
    const result = await classifyComplaint(s.text)
    results.push({ ...s, predictedCategory: result.categoryName, predictedLanguage: result.language, confidence: result.confidence, needsReview: result.needsReview, source: result.routingSource, categoryCorrect: result.categoryName === s.category, languageCorrect: result.language === s.language })
  }
  const report = { evaluatedAt: new Date().toISOString(), providerConfigured: llmEnabled, total: results.length,
    categoryAccuracy: results.filter(r => r.categoryCorrect).length / results.length,
    languageAccuracy: results.filter(r => r.languageCorrect).length / results.length,
    liveLLMResponses: results.filter(r => r.source === 'llm').length,
    limitation: 'Small authored examples, not an independent production benchmark. Translation requires separate bilingual human review. Fallback scores do not measure Groq accuracy.', results }
  const destination = process.argv[2] || 'ai-evaluation-report.json'
  await fs.writeFile(destination, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ total: report.total, categoryAccuracy: report.categoryAccuracy, languageAccuracy: report.languageAccuracy, liveLLMResponses: report.liveLLMResponses, report: destination }))
} finally { await prisma.$disconnect() }
