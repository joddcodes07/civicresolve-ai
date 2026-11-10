// Prisma 7 configuration — the CLI reads the migration/datasource settings here
// (they were removed from schema.prisma in Prisma 7).
import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Load server/.env relative to this file so the CLI works from any cwd.
// `override` keeps the project's own .env authoritative over ambient shell vars.
loadEnv({ path: new URL('.env', import.meta.url), quiet: true, override: false })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  datasource: {
    // Use process.env directly (not env()) so `prisma generate` works even
    // when DATABASE_URL is absent, e.g. during a CI type-check.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
})
