// Rate limiting — protects the API and the (optional) free AI quota.
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

const jsonMessage = (message) => ({ error: message })

// Prefer the authenticated user id, fall back to an IPv6-safe IP key.
const userOrIp = (req) => req.user?.id || ipKeyGenerator(req.ip)

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many requests — please slow down.'),
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many sign-in attempts. Try again in a few minutes.'),
})

// Spam protection: a citizen may lodge a handful of complaints per hour.
export const complaintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIp,
  message: jsonMessage('You have submitted several complaints this hour. Please try again later.'),
})

// The live AI preview is debounced client-side; this is a safety net.
export const previewLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIp,
  message: jsonMessage('Too many preview requests.'),
})
