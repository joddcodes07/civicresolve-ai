// Run only on a trusted server terminal, never expose this as public signup.
import bcrypt from 'bcryptjs'
import { prisma } from '../src/db.js'
import { env } from '../src/env.js'
import { z } from 'zod'
try {
  const args = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(12), role: z.enum(['OFFICER', 'ADMIN']) }).parse({
    name: process.env.WORK_USER_NAME, email: process.env.WORK_USER_EMAIL?.toLowerCase(), password: process.env.WORK_USER_PASSWORD, role: process.env.WORK_USER_ROLE,
  })
  if (!env.workEmailDomains.includes(args.email.split('@')[1])) throw new Error('Add the approved work domain to WORK_EMAIL_DOMAINS first')
  const department = args.role === 'OFFICER' ? await prisma.department.findUniqueOrThrow({ where: { code: process.env.WORK_USER_DEPARTMENT_CODE || '' } }) : null
  const passwordHash = await bcrypt.hash(args.password, 12)
  const user = await prisma.user.create({ data: { name: args.name, email: args.email, passwordHash, role: args.role, departmentId: department?.id } })
  if (process.env.WORK_USER_IS_HEAD === 'true' && department) await prisma.department.update({ where: { id: department.id }, data: { headUserId: user.id } })
  console.log(`Created ${user.role} account ${user.id}. No existing accounts modified.`)
} catch (e) { console.error(e.name === 'ZodError' ? 'Set valid WORK_USER_NAME, WORK_USER_EMAIL, WORK_USER_PASSWORD (12+ characters), and WORK_USER_ROLE.' : e.message); process.exitCode = 1 }
finally { await prisma.$disconnect() }
