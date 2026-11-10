// Centralised, validated configuration loaded from server/.env
import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
// server/.env is the source of truth for this project, so it overrides any
// ambient shell variables (e.g. a global NODE_ENV=production).
loadEnv({ path: path.resolve(here, '../.env'), quiet: true, override: false })

const bool = (v, fallback = false) => {
  if (v === undefined || v === null || v === '') return fallback
  return String(v).toLowerCase() === 'true'
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',

  jwt: {
    secret: process.env.JWT_SECRET || 'civicresolve-insecure-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  groqKey: process.env.GROQ_API_KEY || process.env.LLM_API_KEY || '',
  whisperModel: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo',
  trustProxy: Number(process.env.TRUST_PROXY_HOPS || 0),
  resetUrl: process.env.PASSWORD_RESET_URL || 'http://localhost:5173/reset-password',
  workEmailDomains: (process.env.WORK_EMAIL_DOMAINS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),

  llm: {
    provider: String(process.env.LLM_PROVIDER || (process.env.GROQ_API_KEY ? 'groq' : '')).trim().toLowerCase(),
    apiKey: process.env.GROQ_API_KEY || process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || '',
    baseUrl: process.env.LLM_BASE_URL || '',
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 8000),
  },

  mail: {
    enabled: bool(process.env.MAIL_ENABLED, false),
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'CivicResolve <no-reply@civicresolve.local>',
  },

  sla: {
    enabled: bool(process.env.SLA_CRON_ENABLED, true),
    schedule: process.env.SLA_CRON_SCHEDULE || '*/15 * * * *',
  },
}

export const isProd = env.nodeEnv === 'production'
if (isProd && (env.jwt.secret.length < 32 || env.jwt.secret.includes('change-me'))) throw new Error('Set a random JWT_SECRET of at least 32 characters')
if (isProd && !env.databaseUrl) throw new Error('DATABASE_URL is required')
if (isProd && !env.resetUrl.startsWith('https://')) throw new Error('PASSWORD_RESET_URL must use HTTPS')

export const llmEnabled = Boolean(env.llm.provider && (env.llm.apiKey || env.llm.provider === 'ollama'))
