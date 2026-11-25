// Only retry the read-only readiness check. OAuth start/exchange must not be replayed.
export async function checkGoogleSignIn({ signal, onRetry, fetcher = fetch, timeoutMs = 20000, retryDelayMs = 2000 } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    signal?.throwIfAborted()
    let retryable = true
    try {
      const response = await fetcher('/api/auth/google/status', {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]),
      })
      if (!response.ok) {
        retryable = response.status === 429 || response.status >= 500
        throw new Error('Google sign-in could not be checked. Please retry.')
      }
      const status = await response.json()
      if (typeof status.enabled !== 'boolean') throw new Error('The sign-in service returned an unexpected response. Please retry.')
      return status
    } catch (error) {
      signal?.throwIfAborted()
      if (!retryable || attempt === 2) throw error
      onRetry?.()
      await new Promise((resolve, reject) => {
        const cancel = () => {
          clearTimeout(timer)
          reject(signal.reason)
        }
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', cancel)
          resolve()
        }, retryDelayMs)
        signal?.addEventListener('abort', cancel, { once: true })
      })
    }
  }
}
