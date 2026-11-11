import test from 'node:test'
import assert from 'node:assert/strict'
import { indiaDayStart } from '../services/submissionService.js'
import { pointInPolygon } from '../lib/geo.js'
import { nextComplaintCode } from '../lib/ids.js'

test('daily quota resets at India midnight', () => {
  assert.equal(indiaDayStart(new Date('2026-11-10T18:29:59Z')).toISOString(), '2026-11-09T18:30:00.000Z')
  assert.equal(indiaDayStart(new Date('2026-11-10T18:30:00Z')).toISOString(), '2026-11-10T18:30:00.000Z')
})
test('Pune multipolygon checks all outer polygons and excludes holes', () => {
  const polygon = { type: 'MultiPolygon', coordinates: [
    [[[0,0],[2,0],[2,2],[0,2],[0,0]], [[0.5,0.5],[1,0.5],[1,1],[0.5,1],[0.5,0.5]]],
    [[[4,4],[6,4],[6,6],[4,6],[4,4]]],
  ] }
  assert.equal(pointInPolygon(5,5,polygon), true)
  assert.equal(pointInPolygon(0.75,0.75,polygon), false)
  assert.equal(pointInPolygon(3,3,polygon), false)
})
test('parallel complaint codes do not depend on row counts', async () => {
  const codes = await Promise.all(Array.from({ length: 1000 }, () => nextComplaintCode()))
  assert.equal(new Set(codes).size, codes.length)
})
