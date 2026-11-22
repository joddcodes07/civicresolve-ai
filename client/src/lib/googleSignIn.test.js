import test from 'node:test'
import assert from 'node:assert/strict'
import { checkGoogleSignIn } from './googleSignIn.js'

const ready = { enabled: true, origin: 'https://civicresolve-ai-wheat.vercel.app' }

test('recovers from an unavailable backend without replaying OAuth mutations', async () => {
  let calls = 0
  const result = await checkGoogleSignIn({ retryDelayMs: 0, fetcher: async (path, options) => {
    assert.equal(path, '/api/auth/google/status')
    assert.equal(options.credentials, 'same-origin')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.method, undefined)
    if (++calls === 1) return new Response('Starting', { status: 503 })
    return Response.json(ready)
  } })
  assert.deepEqual(result, ready)
  assert.equal(calls, 2)
})

test('does not retry permanent errors or disabled authentication', async () => {
  let calls = 0
  await assert.rejects(checkGoogleSignIn({ retryDelayMs: 0, fetcher: async () => {
    calls++
    return new Response('', { status: 403 })
  } }))
  assert.equal(calls, 1)
  assert.deepEqual(await checkGoogleSignIn({ fetcher: async () => Response.json({ enabled: false }) }), { enabled: false })
})

test('stops after three temporary failures', async () => {
  let calls = 0
  await assert.rejects(checkGoogleSignIn({ retryDelayMs: 0, fetcher: async () => {
    calls++
    throw new TypeError('Network unavailable')
  } }))
  assert.equal(calls, 3)
})

test('a timed-out first request can recover on the next attempt', async () => {
  let calls = 0
  assert.deepEqual(await checkGoogleSignIn({ timeoutMs: 5, retryDelayMs: 0, fetcher: async (_, options) => {
    if (++calls > 1) return Response.json(ready)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 100)
      options.signal.addEventListener('abort', () => { clearTimeout(timer); reject(options.signal.reason) }, { once: true })
    })
  } }), ready)
  assert.equal(calls, 2)
})

test('unmount cancels the pending retry', async () => {
  const controller = new AbortController()
  let calls = 0
  const pending = checkGoogleSignIn({ signal: controller.signal, onRetry: () => queueMicrotask(() => controller.abort()), fetcher: async () => {
    calls++
    return new Response('', { status: 503 })
  } })
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(calls, 1)
})
