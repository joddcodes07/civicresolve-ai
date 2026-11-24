// Read-only validation of the 3NF normalization invariants.
// Usage:
//   npm --workspace server run db:validate
//   DATABASE_URL=... node server/scripts/validate-normalization.js
import { prisma } from '../src/db.js'
import { CATEGORIES } from '../src/data/taxonomy.js'

const failures = []
const checks = []

function check(name, ok, detail) {
  checks.push({ name, ok, detail })
  if (!ok) failures.push(`${name}: ${detail}`)
}

const databaseName = new URL(process.env.DATABASE_URL || '').pathname || '(unset)'

try {
  const legacy = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Category' AND column_name = 'keywords'
  `
  check('legacy Category.keywords column removed', legacy.length === 0, `found ${legacy.length} legacy column(s)`)

  const key = await prisma.$queryRaw`
    SELECT a.attname::text AS name
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = '"CategoryKeyword"'::regclass AND c.contype = 'p'
    ORDER BY a.attnum
  `
  check(
    'CategoryKeyword composite primary key',
    JSON.stringify(key.map((k) => k.name)) === JSON.stringify(['categoryId', 'keyword']),
    `primary key is ${key.map((k) => k.name).join(', ')}`,
  )

  const constraints = await prisma.$queryRaw`
    SELECT conname FROM pg_constraint
    WHERE conrelid = '"CategoryKeyword"'::regclass AND contype = 'c'
  `
  check(
    'CategoryKeyword rejects blank keywords',
    constraints.some((c) => c.conname === 'CategoryKeyword_keyword_not_blank'),
    `constraints: ${constraints.map((c) => c.conname).join(', ') || 'none'}`,
  )

  const statusColumns = await prisma.$queryRaw`
    SELECT column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'StatusHistory'
      AND column_name IN ('fromStatus', 'toStatus')
    ORDER BY column_name
  `
  check(
    'StatusHistory status columns use ComplaintStatus',
    statusColumns.length === 2 && statusColumns.every((c) => c.udt_name === 'ComplaintStatus'),
    JSON.stringify(statusColumns),
  )

  const [empty, duplicates, orphans, keywordless] = await Promise.all([
    prisma.$queryRaw`SELECT count(*)::int AS count FROM "CategoryKeyword" WHERE btrim(keyword) = ''`,
    prisma.$queryRaw`
      SELECT count(*)::int AS count FROM (
        SELECT "categoryId", keyword FROM "CategoryKeyword" GROUP BY 1, 2 HAVING count(*) > 1
      ) d
    `,
    prisma.$queryRaw`
      SELECT count(*)::int AS count FROM "CategoryKeyword" k
      LEFT JOIN "Category" c ON c.id = k."categoryId" WHERE c.id IS NULL
    `,
    prisma.$queryRaw`
      SELECT count(*)::int AS count FROM "Category" c
      WHERE NOT EXISTS (SELECT 1 FROM "CategoryKeyword" k WHERE k."categoryId" = c.id)
    `,
  ])
  check('no empty keywords', empty[0].count === 0, `${empty[0].count} empty keyword(s)`)
  check('no duplicate keywords per category', duplicates[0].count === 0, `${duplicates[0].count} duplicate pair(s)`)
  check('no orphan keywords', orphans[0].count === 0, `${orphans[0].count} orphan(s)`)
  check('every category has keywords', keywordless[0].count === 0, `${keywordless[0].count} category/categories without keywords`)

  const expectedKeywords = CATEGORIES.reduce((total, category) => total + category.keywords.length, 0)
  const stored = await prisma.categoryKeyword.count()
  check('reference keyword volume preserved', stored >= expectedKeywords, `${stored} stored, ${expectedKeywords} expected from taxonomy`)

  const categories = await prisma.category.findMany({
    select: { name: true, keywords: { select: { keyword: true } } },
  })
  const storedPairs = new Set(categories.flatMap((c) => c.keywords.map((k) => `${c.name.toLowerCase()}|${k.keyword.toLowerCase()}`)))
  const missing = CATEGORIES.flatMap((c) => c.keywords
    .filter((keyword) => !storedPairs.has(`${c.name.toLowerCase()}|${keyword.toLowerCase()}`))
    .map((keyword) => `${c.name} → ${keyword}`))
  check('taxonomy keywords present in normalized table', missing.length === 0, `${missing.length} missing; ${missing.slice(0, 5).join(', ')}`)

  console.log(JSON.stringify({ database: databaseName, passed: failures.length === 0, checks }, null, 2))
  if (failures.length) {
    console.error(`\nNormalization validation failed:\n- ${failures.join('\n- ')}`)
    process.exitCode = 1
  }
} finally {
  await prisma.$disconnect()
}
