import { env } from '../env.js'
import { HttpError } from '../middleware/error.js'
export async function transcribeAudio(file, language) {
  if (!env.groqKey) throw new HttpError(503, 'Voice transcription requires GROQ_API_KEY on the server')
  if (!file) throw new HttpError(400, 'Attach an audio recording in the audio field')
  const form = new FormData()
  form.set('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname)
  form.set('model', env.whisperModel)
  form.set('response_format', 'json')
  if (language) form.set('language', language)
  let response
  try {
    response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${env.groqKey}` }, body: form,
      signal: AbortSignal.timeout(30000),
    })
  } catch { throw new HttpError(502, 'Transcription timed out. Please retry or type your complaint.') }
  if (!response.ok) throw new HttpError(response.status === 429 ? 429 : 502, 'Voice service unavailable. Please retry or type your complaint.')
  const result = await response.json()
  if (typeof result.text !== 'string') throw new HttpError(502, 'Invalid transcription response')
  return { text: result.text.trim(), provider: 'groq', model: env.whisperModel }
}
