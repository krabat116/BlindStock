import express from "express"
import {
  getItems,
  updateItemStock,
  updateItemName,
  createItem,
  deleteItem,
} from "../services/itemService"

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
 * Update stock quantity for one item
 */
router.patch("/:id/stock", async (req, res) => {
  try {
    const itemId = Number(req.params.id)
    const { quantity, note } = req.body

    const updatedItem = await updateItemStock(itemId, quantity, note)
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
 * PATCH /items/:id
 * Update item name
 */
router.patch("/:id", async (req, res) => {
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
 * POST /items
 * Create a new item
 */
router.post("/", async (req, res) => {
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
router.delete("/:id", async (req, res) => {
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