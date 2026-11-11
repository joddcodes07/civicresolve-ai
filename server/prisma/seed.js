// CivicResolve-AI seed — builds a realistic demo city so every screen and chart
// has data. Uses the real classifier + formulas, so seeded rows carry genuine AI
// confidence, priority scores, SLA deadlines and duplicate issue grouping.
//
//   npm run db:seed        (or via npm run db:setup)

import bcrypt from 'bcryptjs'
import { prisma } from '../src/db.js'
import { DEPARTMENTS, CATEGORIES, WARDS, wardBoundary, CITY } from '../src/data/taxonomy.js'
import { classifyComplaint } from '../src/services/aiService.js'
import { resolveIssue } from '../src/services/dupService.js'
import { getPriority } from '../src/services/priorityService.js'
import { computeDueAt, getEscalationLevel, hoursBetween } from '../src/services/slaService.js'
import { nextComplaintCode } from '../src/lib/ids.js'

// Small deterministic PRNG so re-seeding produces a stable-looking city.
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20261031)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const between = (min, max) => min + rand() * (max - min)

// A pool of realistic complaint texts (English / Hindi / Marathi / Hinglish).
const SAMPLES = [
  // Roads
  { c: 'Potholes & Bad Roads', t: 'There is a big pothole on FC Road near the bus stop, two-wheelers keep skidding.' },
  { c: 'Potholes & Bad Roads', t: 'सड़क पर बड़ा गड्ढा है, दोपहिया गाड़ियाँ फिसल रही हैं' },
  { c: 'Potholes & Bad Roads', t: 'रस्त्यावर मोठा खड्डा आहे, गाड्या घसरत आहेत' },
  { c: 'Potholes & Bad Roads', t: 'sadak pe bada khadda hai bhai, accident ho jayega' },
  { c: 'Open / Missing Manhole', t: 'An open manhole without a cover near the school gate, children walk past it every day.' },
  { c: 'Open / Missing Manhole', t: 'स्कूल के पास मैनहोल खुला है, बच्चे रोज़ गुजरते हैं' },
  { c: 'Open / Missing Manhole', t: 'शाळेजवळ मॅनहोल उघडा आहे, धोका आहे' },
  { c: 'Broken Footpath', t: 'Footpath tiles are broken near the market, people are forced to walk on the road.' },
  { c: 'Road Cave-in / Sinkhole', t: 'The road has caved in near the bridge, it looks dangerous for vehicles.' },
  // Water
  { c: 'No Water Supply', t: 'No water supply in our society for the last three days.' },
  { c: 'No Water Supply', t: 'तीन दिन से पानी नहीं आ रहा है' },
  { c: 'No Water Supply', t: 'पाणी येत नाही तीन दिवसांपासून, त्रास होत आहे' },
  { c: 'Contaminated Water', t: 'The tap water is muddy and smells bad, we cannot drink it.' },
  { c: 'Contaminated Water', t: 'पानी गंदा आ रहा है, बीमारी फैलेगी' },
  { c: 'Water Pipeline Leak', t: 'A water pipeline is leaking on the main road and a lot of water is being wasted.' },
  // Drainage
  { c: 'Blocked Drain', t: 'The drain outside my house is blocked and dirty water is standing.' },
  { c: 'Blocked Drain', t: 'नाला ब्लॉक है, गंदा पानी भर गया है' },
  { c: 'Blocked Drain', t: 'गटार तुंबले आहे, पाणी साचले आहे' },
  { c: 'Overflowing Sewage', t: 'Sewage is overflowing on the street near the temple, very bad smell.' },
  { c: 'Overflowing Sewage', t: 'सीवेज ओवरफ्लो हो रहा है सड़क पर' },
  // Waste
  { c: 'Garbage Not Collected', t: 'Garbage has not been collected for a week in our lane.' },
  { c: 'Garbage Not Collected', t: 'कचरा उचलला नाही आठवड्यापासून' },
  { c: 'Garbage Not Collected', t: 'kachra nahi utha raha ek hafte se' },
  { c: 'Garbage Burning / Illegal Dump', t: 'Someone is burning garbage in the open every evening, the smoke is terrible.' },
  { c: 'Dead Animal', t: 'A dead dog is lying near the park and it smells very bad.' },
  // Lighting
  { c: 'Streetlight Not Working', t: 'The streetlight in our lane has not worked for two weeks, it is very dark at night.' },
  { c: 'Streetlight Not Working', t: 'स्ट्रीट लाइट खराब है, रात में अंधेरा रहता है' },
  { c: 'Exposed / Sparking Wires', t: 'A live wire is hanging low and sparking near the bus stop, very dangerous.' },
  // Health
  { c: 'Public Toilet Issue', t: 'The public toilet near the station is very dirty and has no water.' },
  { c: 'Mosquito Breeding / Stagnant Water', t: 'Stagnant water near the construction site is breeding mosquitoes, dengue risk.' },
  { c: 'Stray Animals', t: 'A pack of stray dogs is roaming near the school every morning.' },
  // Parks
  { c: 'Park Maintenance', t: 'The garden near our colony is unkempt and the benches are broken.' },
  { c: 'Fallen / Dangerous Tree', t: 'A big tree has fallen on the road after the storm and is blocking traffic.' },
  // Town planning
  { c: 'Encroachment / Illegal Hoarding', t: 'A shop has illegally encroached on the footpath outside the market.' },
  // Building
  { c: 'Dangerous / Illegal Structure', t: 'An old building wall is cracked and looks like it will collapse any moment.' },
  // Traffic
  { c: 'Traffic Signal Not Working', t: 'The traffic signal at the junction has not been working since morning.' },
  { c: 'Illegal Parking', t: 'Cars are parked illegally and blocking our gate.' },
  // Fire
  { c: 'Fire Hazard', t: 'Dry grass has piled up behind the market and a fire could spread fast.' },
  // Education
  { c: 'School Building / Facility Issue', t: 'The school building roof is leaking badly during the rains.' },
  // Revenue
  { c: 'Certificate / Tax Delay', t: 'My birth certificate application has been pending for over a month.' },
  // Others
  { c: 'Other / General', t: 'There is a problem in our area that nobody is looking into, please help.' },
]

const CITIZENS = [
  { name: 'Ramesh Patil', email: 'citizen@civic.test', phone: '9820011111' },
  { name: 'Aarti Kulkarni', email: 'aarti@civic.test', phone: '9820022222' },
  { name: 'Imran Shaikh', email: 'imran@civic.test', phone: '9820033333' },
  { name: 'Sunita Jadhav', email: 'sunita@civic.test', phone: '9820044444' },
  { name: 'Vikram Rao', email: 'vikram@civic.test', phone: '9820055555' },
]

const OFFICER_NAMES = [
  'Er. Sunil Deshmukh', 'Er. Meera Joshi', 'Er. Anil Gaikwad', 'Er. Priya Nair',
  'Er. Rakesh Pawar', 'Dr. Kavita More', 'Er. Sanjay Bhosale', 'Er. Neha Shirke',
  'Er. Amit Kadam', 'Insp. Rahul Chavan', 'Officer Kiran Sawant', 'Er. Deepa Menon',
  'Er. Pramod Shinde', 'Er. Vaishali Rane',
]

async function clean() {
  // Order matters (children first).
  await prisma.notification.deleteMany()
  await prisma.message.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.transfer.deleteMany()
  await prisma.statusHistory.deleteMany()
  await prisma.complaint.deleteMany()
  await prisma.issue.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
  await prisma.department.deleteMany()
  await prisma.ward.deleteMany()
  await prisma.setting.deleteMany()
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seeding is disabled in production')
  console.log('Seeding synthetic demo data. SLA values and square ward boundaries are illustrative, not official PMC data.')
  if (await prisma.user.count() || await prisma.department.count() || await prisma.complaint.count()) throw new Error('Demo seed only runs on an empty database. Existing data was preserved.')

  const passwordHash = await bcrypt.hash('demo1234', 10)

  // ---- Departments -------------------------------------------------------
  const departments = []
  for (const d of DEPARTMENTS) {
    departments.push(await prisma.department.create({ data: { name: d.name, code: d.code, slaHours: d.slaHours } }))
  }
  const deptByCode = new Map(departments.map((d) => [d.code, d]))

  // ---- Categories --------------------------------------------------------
  const categories = []
  for (const c of CATEGORIES) {
    const dept = deptByCode.get(c.departmentCode)
    categories.push(
      await prisma.category.create({
        data: {
          name: c.name,
          defaultSeverity: c.defaultSeverity,
          dupRadiusMetres: c.dupRadiusMetres,
          keywords: c.keywords,
          departmentId: dept.id,
        },
      }),
    )
  }

  // ---- Wards -------------------------------------------------------------
  const wards = []
  for (const w of WARDS) {
    wards.push(
      await prisma.ward.create({
        data: { name: w.name, lat: w.lat, lng: w.lng, boundary: wardBoundary(w.lat, w.lng) },
      }),
    )
  }

  // ---- Users -------------------------------------------------------------
  const admin = await prisma.user.create({
    data: { name: 'Commissioner Rao', email: 'admin@civic.test', phone: '9800000001', passwordHash, role: 'ADMIN' },
  })

  const citizens = []
  for (const c of CITIZENS) {
    citizens.push(await prisma.user.create({ data: { ...c, passwordHash, role: 'CITIZEN' } }))
  }

  const officers = []
  for (let i = 0; i < departments.length; i++) {
    const dept = departments[i]
    const name = i === 0 ? 'Er. Sunil Deshmukh' : OFFICER_NAMES[i % OFFICER_NAMES.length]
    const email = i === 0 ? 'officer@civic.test' : `officer.${dept.code.toLowerCase()}@civic.test`
    const officer = await prisma.user.create({
      data: {
        name, email, phone: `98100000${String(i).padStart(2, '0')}`,
        passwordHash, role: 'OFFICER', departmentId: dept.id,
      },
    })
    await prisma.department.update({ where: { id: dept.id }, data: { headUserId: officer.id } })
    officers.push(officer)
  }
  const officerByDept = new Map(officers.map((o) => [o.departmentId, o]))

  console.log(`  ${departments.length} departments · ${categories.length} categories · ${wards.length} wards · ${1 + citizens.length + officers.length} users`)

  // ---- Complaints --------------------------------------------------------
  // A weighted status cycle so every screen (queue, escalations, reopened,
  // needs-review, DPI) has data, plus explicit duplicate clusters so the F4
  // grouping is visible on the public issue map.
  const STATUS_CYCLE = [
    'ASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'CONFIRMED', 'ASSIGNED', 'RESOLVED',
    'IN_PROGRESS', 'REOPENED', 'CONFIRMED', 'NEEDS_REVIEW', 'ASSIGNED', 'SUBMITTED',
    'RESOLVED', 'CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'ASSIGNED',
    'RESOLVED', 'NEEDS_REVIEW',
  ]

  const catNameToId = new Map(categories.map((c) => [c.name, c]))

  const specs = []
  // One complaint per sample text.
  for (let i = 0; i < SAMPLES.length; i++) {
    specs.push({ sample: SAMPLES[i], status: STATUS_CYCLE[i % STATUS_CYCLE.length] })
  }
  // Duplicate clusters: several citizens reporting the same problem at one spot.
  const CLUSTERS = [
    'Open / Missing Manhole', 'Blocked Drain', 'Potholes & Bad Roads',
    'Garbage Not Collected', 'Streetlight Not Working', 'Overflowing Sewage',
  ]
  for (const name of CLUSTERS) {
    const sample = SAMPLES.find((s) => s.c === name)
    if (!sample) continue
    const ward = pick(wards)
    const count = 3 + Math.floor(rand() * 2)
    for (let k = 0; k < count; k++) {
      specs.push({
        sample,
        status: k === 0 ? 'IN_PROGRESS' : 'ASSIGNED',
        ward,
        lat: ward.lat + (rand() - 0.5) * 0.0006,
        lng: ward.lng + (rand() - 0.5) * 0.0006,
      })
    }
  }

  let created = 0
  const complaints = []

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i]
    const { sample, status } = spec
    const category = catNameToId.get(sample.c) || categories[categories.length - 1]
    const ward = spec.ward || pick(wards)
    const department = departments.find((d) => d.id === category.departmentId)
    const citizen = pick(citizens)

    const lat = spec.lat ?? ward.lat + (rand() - 0.5) * 0.006
    const lng = spec.lng ?? ward.lng + (rand() - 0.5) * 0.006

    const ai = await classifyComplaint(sample.t)
    const resolvedCategory = catNameToId.get(ai.categoryName) || category

    const issue = await resolveIssue({
      categoryId: resolvedCategory.id,
      lat,
      lng,
      wardId: ward.id,
      text: ai.englishText || sample.t,
      radiusMetres: resolvedCategory.dupRadiusMetres,
    })

    // Mix of fresh, mid-life and overdue complaints so SLA colours span green→red.
    const ageHours =
      rand() < 0.5 ? between(1, 28) : rand() < 0.8 ? between(28, 100) : between(100, 320)
    const createdAt = new Date(Date.now() - ageHours * 3600 * 1000)
    const slaHours = department.slaHours
    const dueAt = computeDueAt(createdAt, slaHours)

    const isClosed = status === 'RESOLVED' || status === 'CONFIRMED'
    const resolvedAt = isClosed ? new Date(createdAt.getTime() + between(4, slaHours * 1.6) * 3600 * 1000) : null

    const priority = getPriority({
      severity: ai.severity,
      safetyRisk: ai.safetyRisk,
      reportCount: issue.reportCount,
      hoursPassed: isClosed && resolvedAt ? hoursBetween(createdAt, resolvedAt) : hoursBetween(createdAt),
      slaHours,
      reopened: status === 'REOPENED',
      nearSchoolOrHospital: ai.nearSchoolOrHospital,
    })

    const escalationLevel = isClosed ? 0 : getEscalationLevel(hoursBetween(createdAt), slaHours)
    const officer = status === 'NEEDS_REVIEW' ? null : officerByDept.get(department.id)

    const complaint = await prisma.complaint.create({
      data: {
        code: await nextComplaintCode(),
        originalText: sample.t,
        englishText: ai.englishText,
        summary: ai.summary,
        language: ai.language,
        severity: ai.severity,
        safetyRisk: ai.safetyRisk,
        aiConfidence: ai.confidence,
        needsReview: status === 'NEEDS_REVIEW' || ai.needsReview,
        routingSource: ai.routingSource,
        priority: priority.score,
        priorityReason: priority.reasonText,
        lat,
        lng,
        status,
        escalationLevel,
        reopened: status === 'REOPENED',
        slaHours,
        dueAt,
        resolvedAt,
        confirmsAt: status === 'RESOLVED' ? new Date(Date.now() + 5 * 24 * 3600 * 1000) : null,
        createdAt,
        citizenId: citizen.id,
        officerId: officer?.id || null,
        categoryId: resolvedCategory.id,
        departmentId: department.id,
        wardId: ward.id,
        issueId: issue.issueId,
      },
    })
    complaints.push(complaint)
    created += 1

    // Timeline.
    await prisma.statusHistory.create({
      data: {
        complaintId: complaint.id, fromStatus: null, toStatus: status === 'NEEDS_REVIEW' ? 'NEEDS_REVIEW' : 'ASSIGNED',
        note: `AI routed to ${department.name} · ${resolvedCategory.name}.`, createdAt,
      },
    })
    if (status === 'IN_PROGRESS' || isClosed) {
      await prisma.statusHistory.create({
        data: { complaintId: complaint.id, fromStatus: 'ASSIGNED', toStatus: 'IN_PROGRESS', note: 'Crew assigned, work started.', changedById: officer?.id, createdAt: new Date(createdAt.getTime() + 6 * 3600 * 1000) },
      })
    }
    if (isClosed) {
      await prisma.statusHistory.create({
        data: { complaintId: complaint.id, fromStatus: 'IN_PROGRESS', toStatus: 'RESOLVED', note: 'Repair completed and area cleared.', changedById: officer?.id, createdAt: resolvedAt },
      })
    }
    if (status === 'CONFIRMED') {
      await prisma.statusHistory.create({
        data: { complaintId: complaint.id, fromStatus: 'RESOLVED', toStatus: 'CONFIRMED', note: 'Citizen confirmed the fix.', createdAt: new Date(resolvedAt.getTime() + 2 * 3600 * 1000) },
      })
    }
    if (status === 'REOPENED') {
      await prisma.statusHistory.create({
        data: { complaintId: complaint.id, fromStatus: 'RESOLVED', toStatus: 'REOPENED', note: 'Citizen reopened — problem is not fixed.', createdAt: new Date(createdAt.getTime() + 30 * 3600 * 1000) },
      })
    }

    if (status === 'CONFIRMED' || status === 'REOPENED' || status === 'RESOLVED') {
      await prisma.feedback.create({
        data: {
          complaintId: complaint.id,
          confirmed: status === 'CONFIRMED' || status === 'RESOLVED',
          rating: status === 'REOPENED' ? 2 : Math.round(between(3, 5)),
          comment: status === 'REOPENED' ? 'Not actually fixed.' : 'Thank you, resolved well.',
        },
      })
    }

    if (status === 'CONFIRMED' || status === 'REOPENED' || status === 'RESOLVED' || i % 4 === 0) {
      await prisma.notification.create({
        data: {
          userId: citizen.id, complaintId: complaint.id,
          message: `Complaint ${complaint.code} is now ${status.replace('_', ' ').toLowerCase()}.`,
        },
      })
    }

    // A short conversation on a few restored cases.
    if (i % 9 === 0) {
      await prisma.message.create({ data: { complaintId: complaint.id, senderRole: 'CITIZEN', senderId: citizen.id, senderName: citizen.name, body: 'Any update on this? It has been a while.', createdAt: new Date(createdAt.getTime() + 8 * 3600 * 1000) } })
      if (officer) {
        await prisma.message.create({ data: { complaintId: complaint.id, senderRole: 'OFFICER', senderId: officer.id, senderName: officer.name, body: 'Our team has visited the spot. Work will be completed shortly.', createdAt: new Date(createdAt.getTime() + 10 * 3600 * 1000) } })
      }
    }
  }

  // Update each issue's priority to its highest complaint priority.
  const allIssues = await prisma.issue.findMany({ select: { id: true } })
  for (const iss of allIssues) {
    const top = await prisma.complaint.findFirst({ where: { issueId: iss.id }, orderBy: { priority: 'desc' }, select: { priority: true } })
    if (top) await prisma.issue.update({ where: { id: iss.id }, data: { priority: top.priority } })
  }

  // ---- Settings ----------------------------------------------------------
  const settings = {
    confirmWindowDays: '7', similarityThreshold: '0.8',
    dpiWeightOnTime: '0.4', dpiWeightVrr: '0.4', dpiWeightRating: '0.2', autoAssign: 'true',
  }
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.create({ data: { key, value } })
  }

  // A few transfers to give the AI-accuracy page something to show.
  const roadsDept = deptByCode.get('ROADS')
  const drainageDept = deptByCode.get('DRAINAGE')
  const misplaced = complaints.filter((c) => c.departmentId === roadsDept.id).slice(0, 4)
  for (const c of misplaced) {
    await prisma.transfer.create({
      data: { complaintId: c.id, fromDeptId: roadsDept.id, toDeptId: drainageDept.id, reason: 'Drainage related, not roads.', officerId: officerByDept.get(roadsDept.id)?.id },
    })
  }

  const totalComplaints = await prisma.complaint.count()
  const totalIssues = await prisma.issue.count()
  console.log(`  ${created} complaints · ${totalIssues} issues · ${await prisma.notification.count()} notifications`)
  console.log(`\nDone. Demo accounts (password: demo1234):`)
  console.log('  citizen@civic.test  · Ramesh Patil (citizen)')
  console.log('  officer@civic.test  · Er. Sunil Deshmukh (Roads & Footpaths, PWD)')
  console.log('  admin@civic.test    · Commissioner Rao (city admin)')
  console.log(`\nCity: ${CITY.name} · ${totalComplaints} complaints seeded.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (err) => {
    console.error('Seed failed:', err)
    await prisma.$disconnect()
    process.exit(1)
  })
