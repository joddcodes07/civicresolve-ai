// JWT auth + role guards.
import jwt from 'jsonwebtoken'
import { prisma } from '../db.js'
import { env } from '../env.js'

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwt.secret, { expiresIn: env.jwt.expiresIn })
}

function readToken(req) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) return header.slice(7)
  return null
}

export function optionalAuth(req, _res, next) {
  const token = readToken(req)
  if (token) {
    try {
      req.auth = jwt.verify(token, env.jwt.secret)
    } catch {
      req.auth = null
    }
  }
  next()
}

export async function requireAuth(req, res, next) {
  const token = readToken(req)
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try {
    const payload = jwt.verify(token, env.jwt.secret)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, departmentId: true, wardId: true },
    })
    if (!user) return res.status(401).json({ error: 'Account not found' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Session expired, please sign in again' })
  }
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
