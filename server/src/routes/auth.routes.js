import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../db.js'
import { signToken, requireAuth, publicUser } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { randomBytes, createHash } from 'node:crypto'
import { sendEmail } from '../services/notifyService.js'
import { env } from '../env.js'
import { googleRoutes } from './google.routes.js'

const router = Router()

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name').max(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email').optional(),
    phone: z.string().trim().regex(/^[0-9]{10,15}$/, 'Enter a valid phone number').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  })
  .refine((d) => d.email || d.phone, { message: 'Provide an email or a phone number', path: ['email'] })

router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, phone, password } = req.body
    const or = []
    if (email) or.push({ email })
    if (phone) or.push({ phone })
    const existing = await prisma.user.findFirst({ where: { OR: or } })
    if (existing) throw new HttpError(409, 'An account with those details already exists')

    const user = await prisma.user.create({
      data: { name, email: email || null, phone: phone || null, passwordHash: await bcrypt.hash(password, 10), role: 'CITIZEN' },
    })
    res.status(201).json({ token: signToken(user), user: publicUser(user) })
  }),
)

const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or phone'),
  password: z.string().min(1, 'Enter your password'),
})

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier.toLowerCase() }, { phone: identifier }] },
      include: { department: { select: { name: true } } },
    })
    const hash = user?.passwordHash || '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.'
    const ok = await bcrypt.compare(password, hash)
    if (!user?.passwordHash || !ok) throw new HttpError(401, 'Invalid email/phone or password')
    if (user.role !== 'CITIZEN' && env.workEmailDomains.length && !env.workEmailDomains.includes(user.email?.split('@')[1])) throw new HttpError(403, 'Use an approved work account')
    res.json({ token: signToken(user), user: publicUser(user) })
  }),
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { department: { select: { name: true } } },
    })
    res.json({ user: publicUser(user) })
  }),
)

// One-click demo logins (development convenience only).
router.get('/demo-accounts', (_req, res) => {
  if (env.nodeEnv === 'production' || process.env.DEMO_ACCOUNTS_ENABLED !== 'true') return res.json({ accounts: [] })
  res.json({
    accounts: [
      { role: 'CITIZEN', name: 'Ramesh Patil', identifier: 'citizen@civic.test', password: 'demo1234', hint: 'Lodge & track complaints' },
      { role: 'OFFICER', name: 'Er. Sunil Deshmukh', identifier: 'officer@civic.test', password: 'demo1234', hint: 'Roads & Footpaths (PWD) queue' },
      { role: 'ADMIN', name: 'Commissioner Rao', identifier: 'admin@civic.test', password: 'demo1234', hint: 'City-wide dashboard' },
    ],
  })
})

// No account discovery and no reset secrets in API responses or logs.
router.post('/forgot-password', validate(z.object({ email: z.string().trim().toLowerCase().email() })), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } })
  if (user?.passwordHash && env.mail.enabled) {
    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    await prisma.$transaction(async tx => {
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } })
      await tx.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60_000) } })
    })
    const url = new URL(env.resetUrl)
    url.searchParams.set('token', token)
    await sendEmail(user.email, 'CivicResolve password reset', `Reset your password within 30 minutes: ${url}`)
  }
  res.json({ message: 'If the account exists, a password reset email will be sent.' })
}))
router.post('/reset-password', validate(z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: z.string().min(8).max(100) })), asyncHandler(async (req, res) => {
  const tokenHash = createHash('sha256').update(req.body.token).digest('hex')
  const passwordHash = await bcrypt.hash(req.body.password, 12)
  await prisma.$transaction(async tx => {
    const record = await tx.passwordResetToken.findUnique({ where: { tokenHash } })
    if (!record) throw new HttpError(400, 'Invalid or expired reset link')
    const claimed = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } })
    if (claimed.count !== 1) throw new HttpError(400, 'Invalid or expired reset link')
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash, tokenVersion: { increment: 1 } } })
    await tx.passwordResetToken.deleteMany({ where: { userId: record.userId } })
  })
  res.json({ message: 'Password updated. Please sign in again.' })
}))

router.get('/notifications', requireAuth, asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({ where: { userId: req.user.id, channel: 'IN_APP' }, orderBy: { sentAt: 'desc' }, take: 100 })
  const unread = await prisma.notification.count({ where: { userId: req.user.id, read: false, channel: 'IN_APP' } })
  res.json({ notifications, unread })
}))
router.patch('/notifications/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: { read: true } })
  if (!result.count) throw new HttpError(404, 'Notification not found')
  res.json({ ok: true })
}))

router.use('/google', googleRoutes)

export default router
