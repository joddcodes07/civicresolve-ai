// Idempotent, additive reference import. No delete/reset operations.
import fs from 'node:fs/promises'
import { prisma } from '../src/db.js'
import { DEPARTMENTS, CATEGORIES } from '../src/data/taxonomy.js'
import { centroid, pointInPolygon } from '../src/lib/geo.js'

async function importPune() {
  if (process.argv.includes('--if-missing') && await prisma.setting.findUnique({ where: { key: 'referenceData' }, select: { key: true } })) {
    console.log('Pune reference data is already present.')
    return
  }
  const collection = JSON.parse(await fs.readFile(new URL('../data/pune-2022-wards.geojson', import.meta.url)))
  const boundary = { type: 'MultiPolygon', coordinates: collection.features.flatMap(f => f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]) }
  let places = []
  try { places = JSON.parse(await fs.readFile(new URL('../data/pune-places.json', import.meta.url))).places } catch (e) { if (e.code !== 'ENOENT') throw e }
  const counts = await prisma.$transaction(async tx => {
    for (const d of DEPARTMENTS) {
      // Never overwrite a department/SLA edited by a teammate or administrator.
      await tx.department.upsert({ where: { code: d.code }, update: {}, create: { code: d.code, name: d.name, slaHours: d.slaHours } })
    }
    for (const c of CATEGORIES) {
      const dept = await tx.department.findUniqueOrThrow({ where: { code: c.departmentCode } })
      await tx.category.upsert({ where: { name: c.name }, update: {}, create: { name: c.name, departmentId: dept.id, keywords: c.keywords, defaultSeverity: c.defaultSeverity, dupRadiusMetres: 50 } })
    }
    for (const f of collection.features) {
      const name = f.properties.Name1
      const centre = centroid(f.geometry)
      await tx.ward.upsert({ where: { name }, update: {}, create: { name, ...centre, boundary: f.geometry } })
    }
    let imported = 0
    for (const p of places) {
      if (!pointInPolygon(p.lat, p.lng, boundary)) continue
      await tx.sensitivePlace.upsert({ where: { id: p.id }, update: {}, create: p })
      imported++
    }
    for (const [key, value] of Object.entries({
      puneBoundary: JSON.stringify(boundary),
      referenceData: JSON.stringify({ wardVintage: 2022, wardSource: 'https://github.com/answerquest/pune-2022-wards', wardLicense: 'MIT', placeSource: 'OpenStreetMap contributors / ODbL-1.0', departmentStatus: 'Application routing taxonomy, not verified PMC department registry', slaStatus: 'Proposed project targets, not official PMC service guarantees', importedAt: new Date().toISOString() }),
    })) await tx.setting.upsert({ where: { key }, update: {}, create: { key, value } })
    return { wards: collection.features.length, places: imported }
  }, { timeout: 120000 })
  console.log(JSON.stringify({ ...counts, departments: DEPARTMENTS.length, categories: CATEGORIES.length, note: 'Historical ward geometry + community places loaded. SLA targets remain provisional. No complaints or users fabricated.' }))
}

try { await importPune() }
finally { await prisma.$disconnect() }
