import test from 'node:test'
import assert from 'node:assert/strict'

process.env.NODE_ENV = 'test'
const { parseQueueQuery } = await import('../routes/officer.routes.js')

const FILTERS = ['open', 'urgent', 'high', 'safety', 'breached', 'needs_review', 'reopened', 'in_progress', 'resolved']

test('queue query defaults to the open filter and page one', () => {
  assert.deepEqual(parseQueueQuery({}), { filter: 'open', page: 1 })
  assert.deepEqual(parseQueueQuery({ q: 'pothole' }), { filter: 'open', page: 1 })
})

test('queue query accepts every supported filter', () => {
  for (const filter of FILTERS) {
    assert.deepEqual(parseQueueQuery({ filter }), { filter, page: 1 })
  }
})

test('queue query accepts positive integer pages', () => {
  assert.equal(parseQueueQuery({ page: '1' }).page, 1)
  assert.equal(parseQueueQuery({ page: '001' }).page, 1)
  assert.equal(parseQueueQuery({ page: '7' }).page, 7)
})

test('queue query rejects unsupported filters with a 400', () => {
  for (const filter of ['bogus', '', 'OPEN', ['open']]) {
    assert.throws(
      () => parseQueueQuery({ filter }),
      (err) => err.status === 400 && err.message === 'Invalid queue filter',
    )
  }
})

test('queue query rejects invalid pages with a 400', () => {
  for (const page of ['0', '-1', '1.5', 'abc', '', 'Infinity']) {
    assert.throws(
      () => parseQueueQuery({ page }),
      (err) => err.status === 400 && err.message === 'Invalid page',
    )
  }
})
