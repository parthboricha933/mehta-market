// One-time migration: hash the existing admin password in the database.
// This script is idempotent: it only hashes passwords that are still plain text.
// Existing hashed passwords are left untouched.
import { db } from '../src/lib/db'
import { hashPassword, isPasswordHashed } from '../src/lib/auth'

async function main() {
  const admins = await db.admin.findMany()
  console.log(`Found ${admins.length} admin user(s)`)

  for (const a of admins) {
    if (isPasswordHashed(a.passwordHash)) {
      console.log(`  - ${a.username}: password already hashed, skipping`)
      continue
    }
    const hashed = await hashPassword(a.passwordHash)
    await db.admin.update({ where: { id: a.id }, data: { passwordHash: hashed } })
    console.log(`  - ${a.username}: password hashed successfully (was plain text "${a.passwordHash}")`)
  }

  console.log('Migration complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
