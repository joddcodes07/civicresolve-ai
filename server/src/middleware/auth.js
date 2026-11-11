// JWT auth + role guards.
import jwt from 'jsonwebtoken'
import { prisma } from '../db.js'
import { env } from '../env.js'

export const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role,
  departmentId: u.departmentId, department: u.department?.name || null,
})

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, ver: user.tokenVersion || 0 }, env.jwt.secret, { expiresIn: env.jwt.expiresIn })
}

function readToken(req) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) return header.slice(7)
  return null
}

export async function authenticateToken(token) {
  const payload = jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] })
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true, departmentId: true, wardId: true, tokenVersion: true },
  })
  if (!user || (payload.ver || 0) !== user.tokenVersion) throw new Error('Invalid session')
  return user
}

export async function optionalAuth(req, res, next) {
  const token = readToken(req)
  if (!token) return next()
  try { req.user = await authenticateToken(token); next() }
  catch { res.status(401).json({ error: 'Session expired, please sign in again' }) }
}

export async function requireAuth(req, res, next) {
  const token = readToken(req)
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try { req.user = await authenticateToken(token); next() }
  catch { res.status(401).json({ error: 'Session expired, please sign in again' }) }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have access to this resource' })
    }
    next()
  }
}
