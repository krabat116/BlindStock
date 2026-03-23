import "dotenv/config"
import express from "express"
import cors from "cors"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaClient } from "@prisma/client"
import multer from "multer"
import { parseRecentOrderSheet } from "./parseRecentOrderSheet"
import { mapOrderRowToComponents } from "./orderMapping"

type DeductionRequestItem = {
  itemId: number
  itemName: string
  category: string
  quantity: number
  sourceRows: number[]
}

function normalizeItemName(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase()
}

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
})

const prisma = new PrismaClient({ adapter })

const app = express()

app.use(cors())
app.use(express.json())
const upload = multer({ storage: multer.memoryStorage() })

function normalizeCategoryName(value: string) {
  const normalized = value.trim().toUpperCase()

  const categoryMap: Record<string, string> = {
    WINDER: "WINDER",
    WINDERS: "WINDER",
    PIN: "PIN",
    PINS: "PIN",
    CHAIN: "CHAIN",
    CHAINS: "CHAIN",
    FINISH: "FINISH",
    FINISHES: "FINISH",
  }

  return categoryMap[normalized] ?? normalized
}
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
app.get("/categories", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    const formattedCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      itemCount: category._count.items,
    }))

    res.json(formattedCategories)
  } catch (error) {
    console.error("Failed to fetch categories:", error)
    res.status(500).json({ message: "Failed to fetch categories" })
  }
})
app.get("/transactions", async (_req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        item: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    })

    const formattedTransactions = transactions.map((transaction) => ({
      id: transaction.id,
      itemName: transaction.item.name,
      type: transaction.type,
      quantity: transaction.quantity,
      source: transaction.source,
      note: transaction.note,
      createdAt: transaction.createdAt,
    }))

    res.json(formattedTransactions)
  } catch (error) {
    console.error("Failed to fetch transactions:", error)
    res.status(500).json({ message: "Failed to fetch transactions" })
  }
})

app.patch("/items/:id/stock", async (req, res) => {
  try {
    const itemId = Number(req.params.id)
    const { quantity, note } = req.body

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

    const previousQuantity = existingItem.quantity
    const difference = quantity - previousQuantity

    let transactionType = "adjustment"

    if (difference > 0) transactionType = "in"
    if (difference < 0) transactionType = "out"

    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.item.update({
        where: { id: itemId },
        data: { quantity },
        include: { category: true },
      })

      await tx.transaction.create({
        data: {
          itemId: itemId,
          type: transactionType,
          quantity: Math.abs(difference),
          source: "manual",
          note:
            note?.trim() ||
            `Stock updated from ${previousQuantity} to ${quantity}`,
        },
      })

      return updatedItem
    })

    res.json({
      id: result.id,
      name: result.name,
      quantity: result.quantity,
      minimumStock: result.minimumStock,
      unit: result.unit,
      category: result.category.name,
    })
  } catch (error) {
    console.error("Failed to update stock:", error)
    res.status(500).json({ message: "Failed to update stock" })
  }
})

app.patch("/items/:id", async (req, res) => {
  try {
    const itemId = Number(req.params.id)
    const { name } = req.body
    const trimmedName = typeof name === "string" ? name.trim() : ""

    if (!Number.isInteger(itemId)) {
      return res.status(400).json({ message: "Invalid item id" })
    }

    if (!trimmedName) {
      return res.status(400).json({ message: "Item name is required" })
    }

    const existingItem = await prisma.item.findUnique({
      where: { id: itemId },
      include: { category: true },
    })

    if (!existingItem) {
      return res.status(404).json({ message: "Item not found" })
    }

    const duplicateItem = await prisma.item.findFirst({
      where: {
        name: trimmedName,
        categoryId: existingItem.categoryId,
        NOT: {
          id: itemId,
        },
      },
    })

    if (duplicateItem) {
      return res.status(409).json({
        message: "An item with the same name already exists in this category",
      })
    }

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: { name: trimmedName },
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
    console.error("Failed to update item:", error)
    res.status(500).json({ message: "Failed to update item" })
  }
})


app.post("/categories", async (req, res) => {
  try {
    const { name } = req.body
    const trimmedName = typeof name === "string" ? name.trim() : ""

    if (!trimmedName) {
      return res.status(400).json({ message: "Category name is required" })
    }

    const existingCategory = await prisma.category.findUnique({
      where: { name: trimmedName },
    })

    if (existingCategory) {
      return res.status(409).json({ message: "Category already exists" })
    }

    const category = await prisma.category.create({
      data: { name: trimmedName },
    })

    res.status(201).json(category)
  } catch (error) {
    console.error("Failed to create category:", error)
    res.status(500).json({ message: "Failed to create category" })
  }
})

app.post("/items", async (req, res) => {
  try {
    const { name, categoryId, quantity, minimumStock, unit } = req.body

    const trimmedName = typeof name === "string" ? name.trim() : ""
    const trimmedUnit = typeof unit === "string" ? unit.trim() : ""

    if (!trimmedName) {
      return res.status(400).json({ message: "Item name is required" })
    }

    if (!Number.isInteger(categoryId)) {
      return res.status(400).json({ message: "Valid category is required" })
    }

    if (typeof quantity !== "number" || quantity < 0) {
      return res.status(400).json({ message: "Quantity must be a non-negative number" })
    }

    if (typeof minimumStock !== "number" || minimumStock < 0) {
      return res.status(400).json({ message: "Minimum stock must be a non-negative number" })
    }

    if (!trimmedUnit) {
      return res.status(400).json({ message: "Unit is required" })
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    const existingItem = await prisma.item.findFirst({
      where: {
        name: trimmedName,
        categoryId,
      },
    })

    if (existingItem) {
      return res.status(409).json({
        message: "An item with the same name already exists in this category",
      })
    }

    const createdItem = await prisma.item.create({
      data: {
        name: trimmedName,
        categoryId,
        quantity,
        minimumStock,
        unit: trimmedUnit,
      },
      include: {
        category: true,
      },
    })

    if (quantity > 0) {
      await prisma.transaction.create({
        data: {
          itemId: createdItem.id,
          type: "in",
          quantity,
          source: "initial_stock",
          note: `Initial stock for new item: ${trimmedName}`,
        },
      })
    }

    res.status(201).json({
      id: createdItem.id,
      name: createdItem.name,
      quantity: createdItem.quantity,
      minimumStock: createdItem.minimumStock,
      unit: createdItem.unit,
      category: createdItem.category.name,
    })
  } catch (error) {
    console.error("Failed to create item:", error)
    res.status(500).json({ message: "Failed to create item" })
  }
})

app.post("/orders/preview", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" })
    }

    const parsedRows = parseRecentOrderSheet(req.file.buffer)

    const flatComponents = parsedRows.flatMap(mapOrderRowToComponents)

    const aggregatedMap = new Map<
      string,
      {
        category: string
        itemName: string
        quantity: number
        sourceRows: number[]
      }
    >()

    for (const component of flatComponents) {
      const key = `${component.category}::${component.itemName}`

      if (!aggregatedMap.has(key)) {
        aggregatedMap.set(key, {
          category: component.category,
          itemName: component.itemName,
          quantity: 0,
          sourceRows: [],
        })
      }

      const existing = aggregatedMap.get(key)!
      existing.quantity += component.quantity
      existing.sourceRows.push(component.sourceRow)
    }

    const aggregatedComponents = Array.from(aggregatedMap.values())

    const dbItems = await prisma.item.findMany({
      include: {
        category: true,
      },
    })

    const preview = aggregatedComponents.map((component) => {
      const matchedItem = dbItems.find(
  (item) =>
    item.name.toUpperCase() === component.itemName.toUpperCase() &&
    normalizeCategoryName(item.category.name) ===
      normalizeCategoryName(component.category)
)

      return {
        category: component.category,
        itemName: component.itemName,
        quantity: component.quantity,
        sourceRows: component.sourceRows,
        matched: Boolean(matchedItem),
        currentStock: matchedItem?.quantity ?? null,
        itemId: matchedItem?.id ?? null,
      }
    })

    res.json({
      parsedRowCount: parsedRows.length,
      preview,
    })
  } catch (error) {
    console.error("Failed to preview order upload:", error)
    res.status(500).json({ message: "Failed to preview order upload" })
  }
})

app.post("/orders/confirm-deduction", async (req, res) => {
  try {
    const { previewItems } = req.body as {
      previewItems?: DeductionRequestItem[]
    }

    if (!Array.isArray(previewItems) || previewItems.length === 0) {
      return res.status(400).json({ message: "Preview items are required" })
    }

    // validate request shape
    for (const item of previewItems) {
      if (
        !Number.isInteger(item.itemId) ||
        typeof item.itemName !== "string" ||
        typeof item.category !== "string" ||
        typeof item.quantity !== "number" ||
        item.quantity <= 0
      ) {
        return res.status(400).json({ message: "Invalid preview item payload" })
      }
    }

    const itemIds = previewItems.map((item) => item.itemId)

    const dbItems = await prisma.item.findMany({
      where: {
        id: {
          in: itemIds,
        },
      },
      include: {
        category: true,
      },
    })

    if (dbItems.length !== itemIds.length) {
      return res.status(400).json({
        message: "One or more preview items no longer exist in inventory",
      })
    }

    // Verify exact matching and stock availability
    for (const previewItem of previewItems) {
      const dbItem = dbItems.find((item) => item.id === previewItem.itemId)

      if (!dbItem) {
        return res.status(400).json({
          message: `Missing inventory item for ${previewItem.itemName}`,
        })
      }

      const categoryMatched =
        normalizeCategoryName(dbItem.category.name) ===
        normalizeCategoryName(previewItem.category)

      const itemNameMatched =
        normalizeItemName(dbItem.name) === normalizeItemName(previewItem.itemName)

      if (!categoryMatched || !itemNameMatched) {
        return res.status(400).json({
          message: `Inventory item mismatch for ${previewItem.itemName}`,
        })
      }

      if (dbItem.quantity < previewItem.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${previewItem.itemName}`,
        })
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const previewItem of previewItems) {
        const dbItem = dbItems.find((item) => item.id === previewItem.itemId)!

        await tx.item.update({
          where: { id: dbItem.id },
          data: {
            quantity: {
              decrement: previewItem.quantity,
            },
          },
        })

        await tx.transaction.create({
          data: {
            itemId: dbItem.id,
            type: "out",
            quantity: previewItem.quantity,
            source: "excel_order",
            note: `Order upload deduction (rows: ${previewItem.sourceRows.join(", ")})`,
          },
        })
      }

      return { success: true }
    })

    res.json(result)
  } catch (error) {
    console.error("Failed to confirm deduction:", error)
    res.status(500).json({ message: "Failed to confirm deduction" })
  }
})
app.delete("/items/:id", async (req, res) => {
  try {
    const itemId = Number(req.params.id)

    if (!Number.isInteger(itemId)) {
      return res.status(400).json({ message: "Invalid item id" })
    }

    const existingItem = await prisma.item.findUnique({
      where: { id: itemId },
    })

    if (!existingItem) {
      return res.status(404).json({ message: "Item not found" })
    }

    await prisma.item.delete({
      where: { id: itemId },
    })

    res.status(204).send()
  } catch (error) {
    console.error("Failed to delete item:", error)
    res.status(500).json({ message: "Failed to delete item" })
  }
})

app.delete("/categories/:id", async (req, res) => {
  try {
    const categoryId = Number(req.params.id)

    if (!Number.isInteger(categoryId)) {
      return res.status(400).json({ message: "Invalid category id" })
    }

    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    })

    if (!existingCategory) {
      return res.status(404).json({ message: "Category not found" })
    }

    if (existingCategory._count.items > 0) {
      return res.status(400).json({
        message: "Cannot delete category because it still contains items",
      })
    }

    await prisma.category.delete({
      where: { id: categoryId },
    })

    res.status(204).send()
  } catch (error) {
    console.error("Failed to delete category:", error)
    res.status(500).json({ message: "Failed to delete category" })
  }
})

const PORT = 3001

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})