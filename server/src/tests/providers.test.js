import test from 'node:test'
import assert from 'node:assert/strict'
// These are mock credentials, never a real API call.
process.env.GROQ_API_KEY = 'test-only-not-a-key'
process.env.LLM_PROVIDER = 'groq'
const { classifyWithLLM } = await import('../services/provider/llm.js')
const { transcribeAudio } = await import('../services/voiceService.js')
const valid = { category: 'Potholes & Bad Roads', language: 'en', severity: 4, safety_risk: false, confidence: 0, english_text: 'There is a pothole.', summary: 'Pothole' }

test('Groq JSON validates types, categories, and preserves zero confidence', async () => {
  const original = globalThis.fetch
  let payload
  try {
    globalThis.fetch = async (_url, options) => {
      payload = JSON.parse(options.body)
      return Response.json({ choices: [{ message: { content: JSON.stringify(valid) } }] })
    }
    const result = await classifyWithLLM('My phone is 9876543210 and there is a pothole.')
    assert.equal(result.confidence, 0)
    assert.ok(!payload.messages[1].content.includes('9876543210'))
    for (const invalid of [{ ...valid, safety_risk: 'false' }, { ...valid, category: 'invented' }, { ...valid, confidence: 2 }, { ...valid, severity: 8 }]) {
      globalThis.fetch = async () => Response.json({ choices: [{ message: { content: JSON.stringify(invalid) } }] })
      assert.equal(await classifyWithLLM('A pothole.'), null)
    }
  } finally { globalThis.fetch = original }
})
test('Groq voice uses server-side multipart and returns stable transcription', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://api.groq.com/openai/v1/audio/transcriptions')
      assert.equal(options.body.get('language'), 'mr')
      assert.equal(options.body.get('model'), 'whisper-large-v3-turbo')
      assert.ok(options.headers.Authorization)
      return Response.json({ text: 'रस्त्यावर खड्डा आहे' })
    }
    const result = await transcribeAudio({ buffer: Buffer.from('test-audio'), mimetype: 'audio/webm', originalname: 'voice.webm' }, 'mr')
    assert.equal(result.text, 'रस्त्यावर खड्डा आहे')
    globalThis.fetch = async () => new Response('', { status: 429 })
    await assert.rejects(() => transcribeAudio({ buffer: Buffer.from('test'), mimetype: 'audio/webm', originalname: 'voice.webm' }), e => e.status === 429)
  } finally { globalThis.fetch = original }
})
