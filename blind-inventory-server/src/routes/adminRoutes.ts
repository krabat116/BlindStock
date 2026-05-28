import { Router } from "express"
import { requireAdmin } from "../middleware/authMiddleware"
import { resetInventory } from "../services/adminService"

const router = Router()

/**
 * POST /admin/reset
 * Admin only. Zeroes all item stock, deletes all transactions and order records.
 */
router.post("/reset", requireAdmin, async (req, res) => {
  try {
    const result = await resetInventory()
    res.json(result)
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500
    res.status(status).json({ message: (err as Error).message })
  }
})

export default router
