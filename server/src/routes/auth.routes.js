import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../db.js'
import { signToken, requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { env } from '../env.js'

const router = Router()

const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role,
  departmentId: u.departmentId, department: u.department?.name || null,
})

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name').max(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email').optional(),
    phone: z.string().trim().regex(/^[0-9]{10,15}$/, 'Enter a valid phone number').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100),
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
    if (!user) throw new HttpError(401, 'No account found with those details')
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) throw new HttpError(401, 'Incorrect password')
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
  if (env.nodeEnv === 'production') return res.json({ accounts: [] })
  res.json({
    accounts: [
      { role: 'CITIZEN', name: 'Ramesh Patil', identifier: 'citizen@civic.test', password: 'demo1234', hint: 'Lodge & track complaints' },
      { role: 'OFFICER', name: 'Er. Sunil Deshmukh', identifier: 'officer@civic.test', password: 'demo1234', hint: 'Roads & Footpaths (PWD) queue' },
      { role: 'ADMIN', name: 'Commissioner Rao', identifier: 'admin@civic.test', password: 'demo1234', hint: 'City-wide dashboard' },
    ],
  })
})

export default router
