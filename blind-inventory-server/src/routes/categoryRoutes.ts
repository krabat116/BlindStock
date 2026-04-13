import express from "express"
import {
  getCategories,
  createCategory,
  deleteCategory,
} from "../services/categoryService"

const router = express.Router()

/**
 * GET /categories
 * Return all categories with item counts
 */
router.get("/", async (_req, res) => {
  try {
    const categories = await getCategories()
    res.json(categories)
  } catch (error) {
    console.error("Failed to fetch categories:", error)
    res.status(500).json({ message: "Failed to fetch categories" })
  }
})

/**
 * POST /categories
 * Create a new category
 */
router.post("/", async (req, res) => {
  try {
    const category = await createCategory(req.body.name)
    res.status(201).json(category)
  } catch (error) {
    console.error("Failed to create category:", error)

    const status =
      error instanceof Error && "status" in error && typeof error.status === "number"
        ? error.status
        : 500

    const message =
      error instanceof Error ? error.message : "Failed to create category"

    res.status(status).json({ message })
  }
})

/**
 * DELETE /categories/:id
 * Delete a category only when it has no items
 */
router.delete("/:id", async (req, res) => {
  try {
    const categoryId = Number(req.params.id)

    await deleteCategory(categoryId)

    res.status(204).send()
  } catch (error) {
    console.error("Failed to delete category:", error)

    const status =
      error instanceof Error && "status" in error && typeof error.status === "number"
        ? error.status
        : 500

    const message =
      error instanceof Error ? error.message : "Failed to delete category"

    res.status(status).json({ message })
  }
})

export default router