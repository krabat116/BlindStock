import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

/**
 * These 5 categories are domain constants for roller blind manufacturing.
 * They must exist in the DB for Excel order uploads to match and deduct stock.
 *
 * Run with: npx prisma db seed
 */
const REQUIRED_CATEGORIES = [
  "FINISH",
  "WINDER",
  "PIN",
  "CHAIN",
  "ALUMINIUM TUBES",
]

async function main() {
  console.log("Seeding required categories...")

  for (const name of REQUIRED_CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    console.log(`  ✓ ${name}`)
  }

  console.log("Done. Existing data was not modified.")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
