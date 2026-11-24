// Database-level checks for the status domain and keyword reference volume.
// Requires an isolated PostgreSQL database whose name ends in _test or _dhruv.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

test('status domain and keyword integrity', { skip: process.env.RUN_DB_TESTS !== 'true' }, async t => {
  const { env } = await import('../env.js')
  const databaseName = new URL(env.databaseUrl).pathname
  if (!databaseName.endsWith('_test') && !databaseName.endsWith('_dhruv')) {
    throw new Error('Database integrity tests require an isolated database ending _test or _dhruv')
  }

  const { prisma } = await import('../db.js')
  const suffix = randomBytes(6).toString('hex')

  try {
    await t.test('StatusHistory status columns use the ComplaintStatus enum', async () => {
      const columns = await prisma.$queryRaw`
        SELECT column_name, udt_name, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'StatusHistory'
          AND column_name IN ('fromStatus', 'toStatus')
        ORDER BY column_name
      `
      assert.equal(columns.length, 2)
      assert.ok(columns.every((c) => c.udt_name === 'ComplaintStatus'))
      const byName = Object.fromEntries(columns.map((c) => [c.column_name, c.is_nullable]))
      assert.equal(byName.fromStatus, 'YES')
      assert.equal(byName.toStatus, 'NO')
    })

    await t.test('the database rejects a value outside the ComplaintStatus domain', async () => {
      await assert.rejects(
        prisma.statusHistory.create({ data: { complaintId: `missing-${suffix}`, toStatus: 'NOT_A_STATUS' } }),
      )
    })

    await t.test('a keyword cannot reference a missing category', async () => {
      await assert.rejects(
        prisma.categoryKeyword.create({ data: { categoryId: `missing-${suffix}`, keyword: 'alpha' } }),
        (error) => error.code === 'P2003',
      )
    })

    await t.test('the reference keyword volume and taxonomy parity are preserved', async () => {
      const { CATEGORIES } = await import('../data/taxonomy.js')
      const expectedKeywords = CATEGORIES.reduce((total, category) => total + category.keywords.length, 0)
      const stored = await prisma.categoryKeyword.count()
      assert.ok(stored >= expectedKeywords)

      const categories = await prisma.category.findMany({
        select: { name: true, keywords: { select: { keyword: true } } },
      })
      const storedPairs = new Set(categories.flatMap((c) => c.keywords.map((k) => `${c.name.toLowerCase()}|${k.keyword.toLowerCase()}`)))
      const missing = CATEGORIES.flatMap((c) => c.keywords
        .filter((keyword) => !storedPairs.has(`${c.name.toLowerCase()}|${keyword.toLowerCase()}`))
        .map((keyword) => `${c.name} → ${keyword}`))
      assert.deepEqual(missing, [])
    })
  } finally {
    await prisma.$disconnect()
  }
})
