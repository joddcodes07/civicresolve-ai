// Only runs when explicitly enabled against an isolated migrated database.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, createHash } from 'node:crypto'

test('backend integration against isolated PostgreSQL', { skip: process.env.RUN_INTEGRATION !== 'true' }, async t => {
  process.env.PORT = '0'
  process.env.SLA_CRON_ENABLED = 'false'
  process.env.LLM_PROVIDER = ''
  process.env.GROQ_API_KEY = ''
  process.env.LLM_API_KEY = ''
  process.env.GOOGLE_CLIENT_ID = 'test-google-client'
  process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret'
  const { env } = await import('../env.js')
  if (!new URL(env.databaseUrl).pathname.endsWith('_dhruv') && !new URL(env.databaseUrl).pathname.endsWith('_test')) throw new Error('Integration tests require an isolated database ending _dhruv or _test')
  const { app, server, io, prisma } = await import('../index.js')
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const tag = `dhruv-test-${randomBytes(6).toString('hex')}`
  const users = []
  const issues = []
  async function request(path, { method = 'GET', body, token, form } = {}) {
    const response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: form || (body ? JSON.stringify(body) : undefined) })
    return { status: response.status, body: await response.json() }
  }
  const register = async suffix => {
    const r = await request('/api/auth/register', { method: 'POST', body: { name: tag, email: `${tag}-${suffix}@example.test`, password: 'TestPassword123!', role: 'ADMIN' } })
    assert.equal(r.status, 201); users.push(r.body.user.id)
    assert.equal(r.body.user.role, 'CITIZEN')
    return r.body
  }
  try {
    await t.test('empty city previews demos only on request and keeps live counts empty', { skip: await prisma.complaint.count() !== 0 }, async () => {
      const map = await request('/api/issues/map?demo=1')
      const stats = await request('/api/meta/stats?demo=1')
      assert.equal(map.status, 200)
      assert.equal(map.body.demo, true)
      assert.ok(map.body.issues.length > 0)
      assert.ok(map.body.issues.every(issue => issue.code.startsWith('DEMO-')))
      assert.equal(map.body.issues.length, map.body.heatmap.length)
      assert.equal(stats.body.stats.total, 0)
      assert.ok(stats.body.demoStats.total > 0)
      const urgent = await request('/api/issues/map?demo=1&priority=urgent')
      assert.ok(urgent.body.issues.length > 0)
      assert.ok(urgent.body.issues.every(issue => issue.priorityBand === 'urgent'))
      assert.deepEqual((await request('/api/issues/map')).body.issues, [])
      assert.equal(await prisma.issue.count(), 0)
    })
    const a = await register('a'), b = await register('b')
    const location = { lat: 18.5204, lng: 73.8567 }
    const text = `${tag} There is a deep pothole on the road outside our house.`
    let complaint
    await t.test('Google sign-in binds the callback to the browser, preserves password accounts and consumes tickets once', async () => {
      const { OAuth2Client } = await import('google-auth-library')
      const google = t.mock.method(OAuth2Client.prototype, 'getToken', async () => ({ tokens: { id_token: 'test-id-token' } }))
      let profile = {}
      t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({ getPayload: () => profile }))
      const origin = new URL(env.clientOrigin).origin
      const start = async () => {
        const response = await fetch(`${base}/api/auth/google/start`, { redirect: 'manual' })
        const authorize = new URL(response.headers.get('location'))
        assert.equal(authorize.origin, 'https://accounts.google.com')
        assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256')
        const cookie = response.headers.getSetCookie().find(value => value.startsWith('civic_google_state='))
        assert.match(cookie, /HttpOnly/i)
        return { state: authorize.searchParams.get('state'), nonce: authorize.searchParams.get('nonce'), cookie: cookie.split(';')[0] }
      }
      const callback = (flow, state = flow.state) => fetch(`${base}/api/auth/google/callback?code=mock-code&state=${state}`, {
        headers: { Cookie: flow.cookie }, redirect: 'manual',
      })
      const flow = await start()
      const mismatch = await callback(flow, 'mismatched-state')
      assert.equal(mismatch.headers.get('location'), `${origin}/login?google=expired`)
      assert.equal(google.mock.callCount(), 0)
      profile = { sub: `${tag}-google`, nonce: flow.nonce, email: a.user.email, email_verified: true }
      assert.equal((await callback(flow)).headers.get('location'), `${origin}/login?google=existing`)

      const newFlow = await start()
      profile = { ...profile, nonce: newFlow.nonce, email: `${tag}-google@example.test`, name: 'Google Test Citizen' }
      const completed = await callback(newFlow)
      assert.equal(completed.headers.get('location'), `${origin}/login?google=complete`)
      const ticket = completed.headers.getSetCookie().find(value => /^civic_google_ticket=[\w-]{43};/.test(value))
      assert.match(ticket, /HttpOnly/i)
      const account = await prisma.user.findUniqueOrThrow({ where: { googleSubject: profile.sub } })
      users.push(account.id)
      assert.equal(account.passwordHash, null)
      const exchange = (requestOrigin) => fetch(`${base}/api/auth/google/exchange`, {
        method: 'POST', headers: { Origin: requestOrigin, Cookie: ticket.split(';')[0] },
      })
      assert.equal((await exchange('https://untrusted.example')).status, 403)
      const results = await Promise.all([exchange(origin), exchange(origin)])
      assert.deepEqual(results.map(result => result.status).sort(), [200, 401])
      const signedIn = await results.find(result => result.ok).json()
      assert.equal(signedIn.user.role, 'CITIZEN')
      assert.equal((await request('/api/auth/me', { token: signedIn.token })).body.user.id, account.id)
      assert.equal((await request('/api/admin/overview', { token: signedIn.token })).status, 403)
    })
    await t.test('anonymous and bad-session submissions are denied', async () => {
      assert.equal((await request('/api/complaints', { method: 'POST', body: { text, ...location } })).status, 401)
      assert.equal((await request('/api/complaints', { method: 'POST', token: 'invalid', body: { text, ...location } })).status, 401)
    })
    await t.test('server rejects short text and out-of-Pune coordinates', async () => {
      assert.equal((await request('/api/complaints', { method: 'POST', token: a.token, body: { text: 'short', ...location } })).status, 400)
      assert.equal((await request('/api/complaints', { method: 'POST', token: a.token, body: { text, lat: 28.6, lng: 77.2 } })).status, 400)
    })
    await t.test('concurrent requests persist exactly five reports and preserve ownership', async () => {
      const r = await Promise.all(Array.from({ length: 7 }, () => request('/api/complaints', { method: 'POST', token: a.token, body: { text, ...location } })))
      assert.equal(r.filter(x => x.status === 201).length, 5, JSON.stringify(r))
      assert.equal(r.filter(x => x.status === 429).length, 2)
      complaint = r.find(x => x.status === 201).body.complaint
      const mine = await request('/api/complaints/mine', { token: a.token })
      assert.equal(mine.body.complaints.length, 5)
      assert.equal((await request('/api/complaints/mine', { token: b.token })).body.complaints.length, 0)
      issues.push(...new Set(mine.body.complaints.map(c => c.issue?.id).filter(Boolean)))
    })
    await t.test('cross-user conversations, feedback, and admin APIs are denied', async () => {
      assert.equal((await request(`/api/complaints/${complaint.id}/messages`, { token: b.token })).status, 403)
      assert.equal((await request(`/api/complaints/${complaint.id}/messages`)).status, 401)
      assert.equal((await request(`/api/complaints/${complaint.id}/feedback`, { method: 'POST', token: b.token, body: { confirmed: true } })).status, 403)
      assert.equal((await request('/api/admin/overview', { token: a.token })).status, 403)
    })
    await t.test('map returns heatmap data and validates filter bounds', async () => {
      const r = await request('/api/issues/map?priority=normal')
      assert.equal(r.status, 200); assert.ok(Array.isArray(r.body.heatmap))
      assert.equal((await request('/api/issues/map?bbox=oops')).status, 400)
      assert.equal((await request('/api/issues/map?demo=1&priority=constructor')).status, 400)
      assert.equal((await request('/api/issues/map?demo=1')).body.demo, false)
      assert.equal((await request('/api/meta/stats?demo=1')).body.demoStats, null)
      const demo = await request('/api/issues/map?demo=preview')
      assert.equal(demo.body.demo, true)
      assert.ok(demo.body.issues.length > 0)
      assert.ok(demo.body.issues.every(issue => issue.code.startsWith('DEMO-')))
      const { body } = await request('/api/meta/stats?demo=preview')
      assert.ok(body.stats.total > 0)
      assert.ok(body.demoStats.total > 0)
    })
    await t.test('duplicates use distance/category/seven days without text overlap', async () => {
      const { findDuplicateCandidate } = await import('../services/dupService.js')
      const stored = await prisma.complaint.findUnique({ where: { id: complaint.id } })
      assert.ok(await findDuplicateCandidate({ categoryId: stored.categoryId, ...location, text: 'entirely different wording' }))
      await prisma.complaint.updateMany({ where: { citizenId: a.user.id }, data: { createdAt: new Date(Date.now() - 8 * 86400000) } })
      assert.equal(await findDuplicateCandidate({ categoryId: stored.categoryId, ...location, text }), null)
    })
    await t.test('photo size and content validation reject spoofed uploads', async () => {
      const form = new FormData(); form.set('text', text); form.set('lat', String(location.lat)); form.set('lng', String(location.lng)); form.set('photo', new Blob(['<html>bad</html>'], { type: 'image/png' }), 'attack.html')
      assert.equal((await request('/api/complaints', { method: 'POST', token: b.token, form })).status, 400)
      const large = new FormData(); large.set('photo', new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' }), 'large.png')
      assert.equal((await request('/api/complaints', { method: 'POST', token: b.token, form: large })).status, 400)
    })
    await t.test('low confidence and untranslated non-English fallbacks require human review', async () => {
      const { classifyComplaint, aiStatus } = await import('../services/aiService.js')
      assert.equal(aiStatus().confidenceGate, 0.7)
      assert.equal((await classifyComplaint('please assist with something unspecified')).needsReview, true)
      const hi = await classifyComplaint('तीन दिन से पानी नहीं आ रहा है')
      assert.equal(hi.needsReview, true); assert.equal(hi.englishText, null)
      const place = await prisma.sensitivePlace.findFirst()
      if (place) assert.equal((await classifyComplaint('A pothole in the road.', { lat: place.lat, lng: place.lng })).nearSchoolOrHospital, true)
    })
    await t.test('single-use password reset revokes existing JWTs', async () => {
      const token = randomBytes(32).toString('hex')
      await prisma.passwordResetToken.create({ data: { userId: b.user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 60000) } })
      assert.equal((await request('/api/auth/reset-password', { method: 'POST', body: { token, password: 'UpdatedPassword123!' } })).status, 200)
      assert.equal((await request('/api/auth/me', { token: b.token })).status, 401)
      assert.equal((await request('/api/auth/reset-password', { method: 'POST', body: { token, password: 'UpdatedPassword123!' } })).status, 400)
      assert.equal((await request('/api/auth/login', { method: 'POST', body: { identifier: `${tag}-b@example.test`, password: 'UpdatedPassword123!' } })).status, 200)
    })
    await t.test('notifications belong only to the signed-in account', async () => {
      const r = await request('/api/auth/notifications', { token: a.token })
      assert.equal(r.status, 200); assert.equal(r.body.notifications.length, 5)
      const other = await request('/api/auth/login', { method: 'POST', body: { identifier: `${tag}-b@example.test`, password: 'UpdatedPassword123!' } })
      assert.equal((await request(`/api/auth/notifications/${r.body.notifications[0].id}/read`, { method: 'PATCH', token: other.body.token, body: {} })).status, 404)
      assert.equal((await request(`/api/auth/notifications/${r.body.notifications[0].id}/read`, { method: 'PATCH', token: a.token, body: {} })).status, 200)
    })
    await t.test('unconfigured voice service returns an actionable error', async () => {
      const form = new FormData(); form.set('audio', new Blob(['test'], { type: 'audio/webm' }), 'voice.webm')
      assert.equal((await request('/api/ai/transcribe', { method: 'POST', token: a.token, form })).status, 503)
    })
    await t.test('officer override is audited; status update delivers SMTP notification through the configured adapter', async () => {
      const { signToken } = await import('../middleware/auth.js')
      const { env } = await import('../env.js')
      const nodemailer = (await import('nodemailer')).default
      const originalTransport = nodemailer.createTransport
      const { passwordHash } = await prisma.user.findUnique({ where: { id: a.user.id } })
      const admin = await prisma.user.create({ data: { name: tag, email: `${tag}-admin@example.test`, passwordHash, role: 'ADMIN' } }); users.push(admin.id)
      const adminToken = signToken(admin)
      const stored = await prisma.complaint.findUnique({ where: { id: complaint.id } })
      const category = await prisma.category.findUnique({ where: { id: stored.categoryId } })
      const changed = await request(`/api/complaints/${complaint.id}/ai-override`, { method: 'PATCH', token: adminToken, body: { categoryId: category.id, reason: 'Officer verified this category manually' } })
      assert.equal(changed.status, 200)
      assert.equal(changed.body.complaint.routingSource, 'officer_override')
      assert.equal(await prisma.transfer.count({ where: { complaintId: complaint.id } }), 1)
      const sent = []
      nodemailer.createTransport = () => ({ sendMail: async mail => { sent.push(mail); return { messageId: 'mock-smtp' } } })
      env.mail.enabled = true; env.mail.host = 'mock-only'
      try {
        const r = await request(`/api/complaints/${complaint.id}/status`, { method: 'PATCH', token: adminToken, body: { toStatus: 'IN_PROGRESS', note: 'Crew assigned for repair' } })
        assert.equal(r.status, 200)
        assert.equal(sent.length, 1)
        assert.equal(sent[0].to, `${tag}-a@example.test`)
        assert.ok(sent[0].text.includes(complaint.code))
        assert.equal((await request(`/api/complaints/${complaint.id}/status`, { method: 'PATCH', token: adminToken, body: { toStatus: 'ASSIGNED' } })).status, 409)
      } finally { env.mail.enabled = false; env.mail.host = ''; nodemailer.createTransport = originalTransport }
    })
    await t.test('SLA breach assigns the department head and commissioner', async () => {
      const c = await prisma.complaint.findUnique({ where: { id: complaint.id } })
      // Use only a department created for this test; never edit a teammate's department.
      const department = await prisma.department.create({ data: { name: tag, code: tag, headUserId: a.user.id, slaHours: 1 } })
      try {
        await prisma.complaint.update({ where: { id: c.id }, data: { departmentId: department.id, createdAt: new Date(Date.now() - 2 * 3600000), slaHours: 1, escalationLevel: 0 } })
        const { runSlaSweep } = await import('../jobs/slaCron.js')
        await runSlaSweep()
        const after = await prisma.complaint.findUnique({ where: { id: c.id } })
        assert.equal(after.officerId, a.user.id); assert.equal(after.escalationLevel, 1)
      } finally { await prisma.complaint.update({ where: { id: c.id }, data: { departmentId: c.departmentId } }); await prisma.department.delete({ where: { id: department.id } }) }
    })
  } finally {
    await prisma.notification.deleteMany({ where: { userId: { in: users } } })
    await prisma.complaint.deleteMany({ where: { citizenId: { in: users } } })
    await prisma.issue.deleteMany({ where: { id: { in: issues }, complaints: { none: {} } } })
    await prisma.user.deleteMany({ where: { id: { in: users } } })
    await new Promise(resolve => io.close(resolve))
    if (server.listening) await new Promise(resolve => server.close(resolve))
    await prisma.$disconnect()
  }
})
