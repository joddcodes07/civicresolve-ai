// Tiny fetch wrapper with JWT storage + typed errors.
const BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'civicresolve.token'
const USER_KEY = 'civicresolve.user'

let token = null
try {
  token = localStorage.getItem(TOKEN_KEY)
} catch {
  token = null
}

export function getToken() {
  return token
}

export function setToken(next) {
  token = next || null
  try {
    if (next) localStorage.setItem(TOKEN_KEY, next)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
  get reasons() {
    return this.details?.reasons || []
  }
}

async function request(path, { method = 'GET', body, form, headers, signal } = {}) {
  const opts = { method, headers: { ...(headers || {}) }, signal }
  if (token) opts.headers.Authorization = `Bearer ${token}`

  if (form) {
    opts.body = form
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  const res = await fetch(BASE + path, opts)
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (res.ok && data === null) {
    throw new ApiError('The server returned an unexpected response. Please retry.', 502)
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data)
  }
  return data
}

export const api = {
  get: (path, opts) => request(path, opts),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  upload: (path, form) => request(path, { method: 'POST', form }),
}

export function uploadUrl(relative) {
  if (!relative) return null
  if (/^https?:/.test(relative)) return relative
  return `${BASE}${relative}`
}
