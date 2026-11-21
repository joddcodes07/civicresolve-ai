import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('explicit hosting and isolated-test configuration wins over local dotenv defaults', () => {
  const moduleUrl = new URL('../env.js', import.meta.url).href
  const source = 'import { env } from ' + JSON.stringify(moduleUrl) +
    '; console.log(JSON.stringify({ databaseUrl: env.databaseUrl, clientOrigin: env.clientOrigin }));'
  const databaseUrl = 'postgresql://viva@127.0.0.1:59999/configuration_test'
  const clientOrigin = 'https://current-civicresolve.example.test'
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: databaseUrl, CLIENT_ORIGIN: clientOrigin },
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout.trim()), { databaseUrl, clientOrigin })
})
