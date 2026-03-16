import "dotenv/config"
import express from "express"
import cors from "cors"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
})

const prisma = new PrismaClient({ adapter })

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (_req, res) => {
  res.send("Blind inventory server is running")
})

app.get("/items", async (_req, res) => {
  try {
    const items = await prisma.item.findMany({
      include: { category: true },
      orderBy: { id: "asc" },
    })

    const formattedItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      minimumStock: item.minimumStock,
      unit: item.unit,
      category: item.category.name,
    }))

    res.json(formattedItems)
  } catch (error) {
    console.error("Failed to fetch items:", error)
    res.status(500).json({ message: "Failed to fetch items" })
  }
})

app.patch("/items/:id/stock", async (req, res) => {
  try {
    const itemId = Number(req.params.id)
    const { quantity } = req.body

    if (!Number.isInteger(itemId)) {
      return res.status(400).json({ message: "Invalid item id" })
    }

    if (typeof quantity !== "number" || quantity < 0) {
      return res.status(400).json({ message: "Quantity must be a non-negative number" })
    }

    const existingItem = await prisma.item.findUnique({
      where: { id: itemId },
      include: { category: true },
    })

    if (!existingItem) {
      return res.status(404).json({ message: "Item not found" })
    }

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: { quantity },
      include: { category: true },
    })

    res.json({
      id: updatedItem.id,
      name: updatedItem.name,
      quantity: updatedItem.quantity,
      minimumStock: updatedItem.minimumStock,
      unit: updatedItem.unit,
      category: updatedItem.category.name,
    })
  } catch (error) {
    console.error("Failed to update stock:", error)
    res.status(500).json({ message: "Failed to update stock" })
  }
})
const PORT = 3001

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})