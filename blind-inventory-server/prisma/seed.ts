import "dotenv/config"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
})

const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.transaction.deleteMany()
  await prisma.item.deleteMany()
  await prisma.category.deleteMany()

  const chainCategory = await prisma.category.create({
    data: { name: "Chain" },
  })

  const winderCategory = await prisma.category.create({
    data: { name: "Winder" },
  })

  const tubeCategory = await prisma.category.create({
    data: { name: "Aluminium Tube" },
  })

  await prisma.item.createMany({
    data: [
      {
        name: "Metal Chain",
        quantity: 120,
        minimumStock: 30,
        unit: "pcs",
        categoryId: chainCategory.id,
      },
      {
        name: "Plastic Chain White",
        quantity: 18,
        minimumStock: 20,
        unit: "pcs",
        categoryId: chainCategory.id,
      },
      {
        name: "White Winder",
        quantity: 64,
        minimumStock: 15,
        unit: "pcs",
        categoryId: winderCategory.id,
      },
      {
        name: "45mm Aluminium Tube",
        quantity: 0,
        minimumStock: 10,
        unit: "pcs",
        categoryId: tubeCategory.id,
      },
    ],
  })
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