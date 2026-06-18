// Cleanup script: remove test orders created during verification.
// Run with: bun run scripts/cleanup-test-orders.ts
import { db } from '../src/lib/db'

async function main() {
  // Delete orders that were created during testing (those with customerName containing "Test" or "Notification Test" or "T")
  const testOrders = await db.order.findMany({
    where: {
      OR: [
        { customerName: { contains: 'Test' } },
        { customerName: { equals: 'T' } },
        { customerName: { contains: 'Realtime' } },
        { customerName: { contains: 'Notification' } },
      ]
    },
    select: { id: true, orderNumber: true, customerName: true }
  })
  console.log(`Found ${testOrders.length} test orders to clean up:`)
  for (const o of testOrders) {
    console.log(`  - ${o.orderNumber} (${o.customerName})`)
    await db.order.delete({ where: { id: o.id } })
  }

  // Reset soldCount for the demo product back to a sensible value
  const demo = await db.product.findFirst({ where: { name: 'demo' } })
  if (demo) {
    await db.product.update({ where: { id: demo.id }, data: { soldCount: 0 } })
    console.log('Reset soldCount for "demo" product to 0')
  }

  console.log('Cleanup complete.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
