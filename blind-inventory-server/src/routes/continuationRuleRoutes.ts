import express from "express"
import {
  getRules,
  createRule,
  deleteRule,
} from "../services/continuationRuleService"
import { requireAdmin } from "../middleware/authMiddleware"

const router = express.Router()

/**
 * GET /continuation-rules
 * Return all continuation row rules
 */
router.get("/", async (_req, res) => {
  try {
    const rules = await getRules()
    res.json(rules)
  } catch (error) {
    console.error("Failed to fetch continuation rules:", error)
    res.status(500).json({ message: "Failed to fetch continuation rules" })
  }
})

/**
 * POST /continuation-rules
 * Create a new keyword → category rule
 */
router.post("/", requireAdmin, async (req, res) => {
  try {
    const rule = await createRule(req.body.keyword, req.body.categoryName)
    res.status(201).json(rule)
  } catch (error) {
    console.error("Failed to create continuation rule:", error)

    const status =
      error instanceof Error && "status" in error && typeof error.status === "number"
        ? error.status
        : 500

    const message =
      error instanceof Error ? error.message : "Failed to create continuation rule"

    res.status(status).json({ message })
  }
})

/**
 * DELETE /continuation-rules/:id
 * Delete a rule by id
 */
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    await deleteRule(id)
    res.status(204).send()
  } catch (error) {
    console.error("Failed to delete continuation rule:", error)

    const status =
      error instanceof Error && "status" in error && typeof error.status === "number"
        ? error.status
        : 500

    const message =
      error instanceof Error ? error.message : "Failed to delete continuation rule"

    res.status(status).json({ message })
  }
})

export default router
