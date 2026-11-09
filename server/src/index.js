// CivicResolve-AI API server — Express 5 + Socket.IO + Prisma (PostgreSQL).
import express from 'express'
import http from 'node:http'
import cors from 'cors'
import helmet from 'helmet'
import { Server as SocketServer } from 'socket.io'

import { env } from './env.js'
import { prisma, disconnectDb } from './db.js'
import { setIO, rooms } from './socket.js'
import { apiLimiter, authLimiter, previewLimiter } from './middleware/rateLimit.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { UPLOAD_DIR } from './middleware/upload.js'

import authRoutes from './routes/auth.routes.js'
import metaRoutes from './routes/meta.routes.js'
import aiRoutes from './routes/ai.routes.js'
import complaintRoutes from './routes/complaints.routes.js'
import officerRoutes from './routes/officer.routes.js'
import adminRoutes from './routes/admin.routes.js'
import issueRoutes from './routes/issues.routes.js'
import { startSlaCron } from './jobs/slaCron.js'

const app = express()
app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow the configured client, localhost variants, and same-origin/no-origin.
      if (!origin) return cb(null, true)
      const allowed = [env.clientOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173']
      if (allowed.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
        return cb(null, true)
      }
      cb(null, false)
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', fallthrough: true }))

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'civicresolve-api', time: new Date().toISOString() }))

app.use('/api', apiLimiter)
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/meta', metaRoutes)
app.use('/api/ai', previewLimiter, aiRoutes)
app.use('/api/complaints', complaintRoutes)
app.use('/api/officer', officerRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/issues', issueRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

const server = http.createServer(app)
const io = new SocketServer(server, {
  cors: { origin: true, credentials: true },
  path: '/socket.io',
})
setIO(io)

io.on('connection', (socket) => {
  socket.on('join:complaint', (code) => {
    if (code) socket.join(rooms.complaint(String(code).toUpperCase()))
  })
  socket.on('leave:complaint', (code) => {
    if (code) socket.leave(rooms.complaint(String(code).toUpperCase()))
  })
  socket.on('join:user', (userId) => {
    if (userId) socket.join(rooms.user(userId))
  })
  socket.on('join:officer', (departmentId) => {
    if (departmentId) socket.join(rooms.officers(departmentId))
  })
  socket.on('join:admin', () => socket.join(rooms.admins))
})

server.listen(env.port, () => {
  console.log(`\n  CivicResolve-AI API  ·  http://localhost:${env.port}`)
  console.log(`  AI engine: ${env.llm.provider ? `llm (${env.llm.provider}) + rules fallback` : 'local rules (no API key needed)'}`)
  console.log(`  Client origin: ${env.clientOrigin}\n`)
})

startSlaCron()

async function shutdown(signal) {
  console.log(`\n[${signal}] shutting down...`)
  server.close()
  await disconnectDb()
  process.exit(0)
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

export { app, server, io, prisma }
