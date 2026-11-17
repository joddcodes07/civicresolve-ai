// Database-level checks for the 1NF/3NF keyword normalization.
// Requires an isolated PostgreSQL database whose name ends in _test or _dhruv.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

test('category keyword normalization', { skip: process.env.RUN_DB_TESTS !== 'true' }, async t => {
  const { env } = await import('../env.js')
  const databaseName = new URL(env.databaseUrl).pathname
  if (!databaseName.endsWith('_test') && !databaseName.endsWith('_dhruv')) {
    throw new Error('Database normalization tests require an isolated database ending _test or _dhruv')
  }

  const { prisma } = await import('../db.js')
  const suffix = randomBytes(6).toString('hex')
  let department = null
  let category = null

  try {
    await t.test('the legacy Category.keywords array column is gone', async () => {
      const columns = await prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Category' AND column_name = 'keywords'
      `
      assert.deepEqual(columns, [])
    })

    await t.test('CategoryKeyword uses a composite (categoryId, keyword) primary key', async () => {
      const columns = await prisma.$queryRaw`
        SELECT a.attname::text AS name
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = '"CategoryKeyword"'::regclass AND c.contype = 'p'
        ORDER BY a.attnum
      `
      assert.deepEqual(columns.map((c) => c.name), ['categoryId', 'keyword'])
    })

    await t.test('every stored keyword is atomic, non-empty, unique, and owned by a category', async () => {
      const [empty, duplicates, orphans] = await Promise.all([
        prisma.$queryRaw`SELECT count(*)::int AS count FROM "CategoryKeyword" WHERE btrim(keyword) = ''`,
        prisma.$queryRaw`
          SELECT count(*)::int AS count FROM (
            SELECT "categoryId", keyword FROM "CategoryKeyword"
            GROUP BY 1, 2 HAVING count(*) > 1
          ) d
        `,
        prisma.$queryRaw`
          SELECT count(*)::int AS count
          FROM "CategoryKeyword" k
          LEFT JOIN "Category" c ON c.id = k."categoryId"
          WHERE c.id IS NULL
        `,
      ])
      assert.equal(empty[0].count, 0)
      assert.equal(duplicates[0].count, 0)
      assert.equal(orphans[0].count, 0)
    })

    await t.test('every existing category has at least one keyword', async () => {
      const rows = await prisma.$queryRaw`
        SELECT count(*)::int AS count
        FROM "Category" c
        WHERE NOT EXISTS (SELECT 1 FROM "CategoryKeyword" k WHERE k."categoryId" = c.id)
      `
      assert.equal(rows[0].count, 0)
    })

    await t.test('category creation accepts nested atomic keywords and rejects duplicates', async () => {
      department = await prisma.department.create({
        data: { name: `Norm Test Dept ${suffix}`, code: `NT-${suffix}` },
      })
      category = await prisma.category.create({
        data: {
          name: `Norm Test Category ${suffix}`,
          departmentId: department.id,
          keywords: { create: [{ keyword: 'alpha' }, { keyword: 'beta' }] },
        },
        include: { keywords: { orderBy: { keyword: 'asc' } } },
      })
      assert.deepEqual(category.keywords.map((k) => k.keyword), ['alpha', 'beta'])

      await assert.rejects(
        prisma.categoryKeyword.create({ data: { categoryId: category.id, keyword: 'alpha' } }),
        (error) => error.code === 'P2002',
      )
      await assert.rejects(
        prisma.categoryKeyword.create({ data: { categoryId: category.id, keyword: '   ' } }),
        (error) => error.code === 'P2004' || String(error.message).includes('CategoryKeyword_keyword_not_blank'),
      )
    })

    await t.test('deleting a category cascades to its keywords', async () => {
      await prisma.category.delete({ where: { id: category.id } })
      const remaining = await prisma.categoryKeyword.count({ where: { categoryId: category.id } })
      assert.equal(remaining, 0)
      category = null
    })
  } finally {
    if (category) await prisma.category.delete({ where: { id: category.id } }).catch(() => {})
    if (department) await prisma.department.delete({ where: { id: department.id } }).catch(() => {})
    await prisma.$disconnect()
  }
})
