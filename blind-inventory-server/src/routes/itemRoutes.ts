import express from "express"
import {
  getItems,
  updateItemStock,
  adjustItemStock,
  updateItemName,
  updateItemSettings,
  createItem,
  deleteItem,
  bulkCreateMissingItems,
} from "../services/itemService"
import { requireAdmin } from "../middleware/authMiddleware"

const router = express.Router()

/**
 * GET /items
 * Return all inventory items
 */
router.get("/", async (_req, res) => {
  try {
    const items = await getItems()
    res.json(items)
  } catch (error) {
    console.error("Failed to fetch items:", error)
    res.status(500).json({ message: "Failed to fetch items" })
  }
})

/**
 * PATCH /items/:id/stock
 * Update stock for one item
 * COUNT 타입: { quantity, note }
 * LENGTH 타입: { totalLengthMm, note }
 * AREA 타입: { totalAreaMm2, note }
 */
router.patch("/:id/stock", async (req, res) => {
  try {
    const itemId = Number(req.params.id)
    const { quantity, totalLengthMm, totalAreaMm2, note } = req.body

    const updatedItem = await updateItemStock(itemId, { quantity, totalLengthMm, totalAreaMm2, note })
    res.json(updatedItem)
  } catch (error) {
    console.error("Failed to update stock:", error)

    const status =
      error instanceof Error && "status" in error && typeof error.status === "number"
        ? error.status
        : 500

    const message =
      error instanceof Error ? error.message : "Failed to update stock"

    res.status(status).json({ message })
  }
})

/**
 * PATCH /items/:id/adjust
 * Manual stock adjustment
 * type "out"        → deduct from current stock
 * type "adjustment" → set to exact value
 */
router.patch("/:id/adjust", async (req, res) => {
  try {
    const itemId = Number(req.params.id)
    const { type, quantity, totalLengthMm, totalAreaMm2, note } = req.body

    if (type !== "out" && type !== "adjustment") {
      res.status(400).json({ message: "type must be 'out' or 'adjustment'" })
      return
    }

    const updatedItem = await adjustItemStock(itemId, { type, quantity, totalLengthMm, totalAreaMm2, note })
    res.json(updatedItem)
  } catch (error) {
    console.error("Failed to adjust stock:", error)

    const status =
      error instanceof Error && "status" in error && typeof error.status === "number"
        ? error.status
        : 500

    const message =
      error instanceof Error ? error.message : "Failed to adjust stock"

    res.status(status).json({ message })
  }
})

/**
 * PATCH /items/:id/settings
 * 아이템 stockType 및 관련 설정 업데이트 (COUNT ↔ LENGTH 전환 포함)
 */
router.patch("/:id/settings", requireAdmin, async (req, res) => {
  try {
    const itemId = Number(req.params.id)
    const updatedItem = await updateItemSettings(itemId, req.body)
    res.json(updatedItem)
  } catch (error) {
    console.error("Failed to update item settings:", error)

    const status =
      error instanceof Error && "status" in error && typeof error.status === "number"
        ? error.status
        : 500

    const message =
      error instanceof Error ? error.message : "Failed to update item settings"

    res.status(status).json({ message })
  }
})

/**
 * PATCH /items/:id
 * Update item name
 */
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const itemId = Number(req.params.id)
    const { name } = req.body

    const updatedItem = await updateItemName(itemId, name)
    res.json(updatedItem)
  } catch (error) {
    console.error("Failed to update item:", error)

    const status =
      error instanceof Error && "status" in error && typeof error.status === "number"
        ? error.status
        : 500

    const message =
      error instanceof Error ? error.message : "Failed to update item"

    res.status(status).json({ message })
  }
})

/**
 * POST /items/bulk-create-missing
 * Create items that appeared as "Missing" in an order preview.
 * Skips items that already exist. Requires admin.
 */
router.post("/bulk-create-missing", requireAdmin, async (req, res) => {
  try {
    const { items } = req.body
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "items must be a non-empty array" })
      return
    }
    const result = await bulkCreateMissingItems(items)
    res.json(result)
  } catch (error) {
    console.error("Failed to bulk-create missing items:", error)
    res.status(500).json({ message: "Failed to create missing items" })
  }
})

/**
 * POST /items
 * Create a new item
 */
router.post("/", requireAdmin, async (req, res) => {
  try {
    const createdItem = await createItem(req.body)
    res.status(201).json(createdItem)
  } catch (error) {
    console.error("Failed to create item:", error)

    const status =
      error instanceof Error && "status" in error && typeof error.status === "number"
        ? error.status
        : 500

    const message =
      error instanceof Error ? error.message : "Failed to create item"

    res.status(status).json({ message })
  }
})

/**
 * DELETE /items/:id
 * Delete one item
 */
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const itemId = Number(req.params.id)

    await deleteItem(itemId)
    res.status(204).send()
  } catch (error) {
    console.error("Failed to delete item:", error)

    const status =
      error instanceof Error && "status" in error && typeof error.status === "number"
        ? error.status
        : 500

    const message =
      error instanceof Error ? error.message : "Failed to delete item"

    res.status(status).json({ message })
  }
})

export default router