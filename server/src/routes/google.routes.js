import { Router } from 'express'
import { createHash, createHmac, randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '../db.js'
import { env, isProd } from '../env.js'
import { publicUser, signToken } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'

export const googleRoutes = Router()
const origin = new URL(env.clientOrigin).origin
const callback = `${origin}/api/auth/google/callback`
const enabled = Boolean(env.google.clientId && env.google.clientSecret)
const flowKey = createHmac('sha256', env.jwt.secret).update('civicresolve/google-oauth-state').digest()
const flowCookie = 'civic_google_state'
const ticketCookie = 'civic_google_ticket'
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: isProd || origin.startsWith('https:'), path: '/api/auth/google' }
const randomToken = () => randomBytes(32).toString('base64url')
const hashToken = (value) => createHash('sha256').update(value).digest('base64url')
const google = new OAuth2Client(env.google.clientId, env.google.clientSecret, callback)

if (enabled && isProd && !origin.startsWith('https:')) throw new Error('Google sign-in requires an HTTPS CLIENT_ORIGIN in production')

function readCookie(req, name) {
  return req.get('cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1)
}

function backToLogin(res, status) {
  res.redirect(303, `${origin}/login?google=${status}`)
}

googleRoutes.use((_req, res, next) => {
  res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' })
  next()
})

googleRoutes.get('/status', (_req, res) => res.json({ enabled }))

googleRoutes.get('/start', (_req, res) => {
  if (!enabled) return backToLogin(res, 'unavailable')
  const state = randomToken()
  const verifier = randomToken()
  const nonce = randomToken()
  const flow = jwt.sign({ state, verifier, nonce }, flowKey, { algorithm: 'HS256', expiresIn: '10m' })
  const url = google.generateAuthUrl({
    scope: ['openid', 'email', 'profile'], state, nonce, prompt: 'select_account',
    code_challenge: hashToken(verifier), code_challenge_method: 'S256',
  })
  res.cookie(flowCookie, flow, { ...cookieOptions, maxAge: 10 * 60_000 })
  res.clearCookie(ticketCookie, cookieOptions)
  res.redirect(url)
})

googleRoutes.get('/callback', asyncHandler(async (req, res) => {
  if (!enabled) return backToLogin(res, 'unavailable')
  const signedFlow = readCookie(req, flowCookie)
  let flow
  try { flow = jwt.verify(signedFlow, flowKey, { algorithms: ['HS256'] }) }
  catch { return backToLogin(res, 'expired') }
  if (typeof req.query.state !== 'string' || flow.state !== req.query.state) return backToLogin(res, 'expired')
  res.clearCookie(flowCookie, cookieOptions)
  if (req.query.error === 'access_denied') return backToLogin(res, 'cancelled')
  if (typeof req.query.code !== 'string' || !req.query.code) return backToLogin(res, 'failed')

  let profile
  try {
    const { tokens } = await google.getToken({ code: req.query.code, codeVerifier: flow.verifier, redirect_uri: callback })
    if (!tokens.id_token) return backToLogin(res, 'failed')
    const verified = await google.verifyIdToken({ idToken: tokens.id_token, audience: env.google.clientId })
    profile = verified.getPayload()
  } catch {
    return backToLogin(res, 'failed')
  }
  if (!profile?.sub || profile.nonce !== flow.nonce || profile.email_verified !== true || !profile.email) return backToLogin(res, 'failed')

  const email = profile.email.trim().toLowerCase()
  let user = await prisma.user.findUnique({ where: { googleSubject: profile.sub } })
  if (!user) {
    // Password accounts require an explicit linking flow to prove both identities.
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return backToLogin(res, 'existing')
    try {
      user = await prisma.user.create({ data: { email, name: profile.name?.trim().slice(0, 80) || email.split('@')[0], googleSubject: profile.sub, role: 'CITIZEN' } })
    } catch (error) {
      if (error.code !== 'P2002') throw error
      user = await prisma.user.findUnique({ where: { googleSubject: profile.sub } })
      if (!user) return backToLogin(res, 'existing')
    }
  }
  if (user.role !== 'CITIZEN') return backToLogin(res, 'existing')
  const ticket = randomToken()
  await prisma.$transaction([
    prisma.googleLoginTicket.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
    prisma.googleLoginTicket.create({ data: { tokenHash: hashToken(ticket), userId: user.id, expiresAt: new Date(Date.now() + 60_000) } }),
  ])
  res.cookie(ticketCookie, ticket, { ...cookieOptions, maxAge: 60_000 })
  backToLogin(res, 'complete')
}))

googleRoutes.post('/exchange', asyncHandler(async (req, res) => {
  if (!enabled) throw new HttpError(503, 'Google sign-in is unavailable')
  if (req.get('origin') !== origin) throw new HttpError(403, 'Invalid sign-in origin')
  const ticket = readCookie(req, ticketCookie)
  res.clearCookie(ticketCookie, cookieOptions)
  if (!ticket || !/^[\w-]{43}$/.test(ticket)) throw new HttpError(401, 'Google sign-in expired. Start again.')
  const tokenHash = hashToken(ticket)
  const user = await prisma.$transaction(async tx => {
    const record = await tx.googleLoginTicket.findUnique({ where: { tokenHash } })
    if (!record) return null
    const consumed = await tx.googleLoginTicket.deleteMany({ where: { tokenHash, expiresAt: { gt: new Date() } } })
    if (consumed.count !== 1) return null
    return tx.user.findUnique({ where: { id: record.userId } })
  })
  if (user?.role !== 'CITIZEN' || !user.googleSubject) throw new HttpError(401, 'Google sign-in expired. Start again.')
  res.json({ token: signToken(user), user: publicUser(user) })
}))
