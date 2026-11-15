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

// Targeted rate limiter for login attempts with protection against brute-force attacks.
// skipSuccessfulRequests ensures legitimate users never get locked out by normal logins.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many failed sign-in attempts. Try again in 15 minutes.'),
})

// Protect account creation from spam bots.
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many accounts created from this connection. Try again in an hour.'),
})

// Protect password reset endpoints from email bombing and token enumeration.
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many password reset attempts. Try again in 15 minutes.'),
})

// Kept for backward compatibility
export const authLimiter = loginLimiter

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
