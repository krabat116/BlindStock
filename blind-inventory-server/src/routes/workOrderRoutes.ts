import express from "express"
import { WorkType } from "@prisma/client"
import prisma from "../lib/prisma"
import {
  getWorkOrderGroups,
  getWorkOrderGroupById,
  toggleWorkActivity,
  deleteWorkActivity,
} from "../services/workOrderService"
import { requireAdmin } from "../middleware/authMiddleware"

const router = express.Router()

// ─────────────────────────────────────────────────────────────────────────────
// Groups
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /work-orders/groups
 * Returns all work order groups (all staff can view).
 */
router.get("/groups", async (_req, res) => {
  try {
    const groups = await getWorkOrderGroups(prisma)
    res.json(groups)
  } catch (error) {
    console.error("Failed to fetch work order groups:", error)
    res.status(500).json({ message: "Failed to fetch work order groups" })
  }
})

/**
 * GET /work-orders/groups/:id
 * Returns one group with all its rows and work activities.
 */
router.get("/groups/:id", async (req, res) => {
  try {
    const group = await getWorkOrderGroupById(prisma, req.params.id)
    if (!group) {
      return res.status(404).json({ message: "Work order group not found" })
    }
    res.json(group)
  } catch (error) {
    console.error("Failed to fetch work order group:", error)
    res.status(500).json({ message: "Failed to fetch work order group" })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Activities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /work-orders/activities
 * Toggle a work activity for the requesting staff member.
 * Body: { workOrderRowId: string; workType: WorkType }
 */
router.post("/activities", async (req, res) => {
  try {
    const { workOrderRowId, workType } = req.body as {
      workOrderRowId: string
      workType: WorkType
    }

    if (!workOrderRowId || !workType) {
      return res.status(400).json({ message: "workOrderRowId and workType are required" })
    }

    if (!Object.values(WorkType).includes(workType)) {
      return res.status(400).json({ message: `Invalid workType: ${workType}` })
    }

    const staffUserId = req.user!.id
    const staffUsername = req.user!.username

    const result = await toggleWorkActivity(
      prisma,
      workOrderRowId,
      workType,
      staffUserId,
      staffUsername
    )

    if (result.action === "conflict") {
      return res.status(409).json(result)
    }

    res.json(result)
  } catch (error) {
    console.error("Failed to toggle work activity:", error)
    res.status(500).json({ message: "Failed to toggle work activity" })
  }
})

/**
 * DELETE /work-orders/activities/:id
 * Delete a work activity. Owner or admin only.
 */
router.delete("/activities/:id", async (req, res) => {
  try {
    const result = await deleteWorkActivity(
      prisma,
      req.params.id,
      req.user!.id,
      req.user!.role
    )

    if (!result.deleted) {
      const status = result.reason === "forbidden" ? 403 : 404
      return res.status(status).json({ message: result.reason })
    }

    res.json({ deleted: true })
  } catch (error) {
    console.error("Failed to delete work activity:", error)
    res.status(500).json({ message: "Failed to delete work activity" })
  }
})

export default router
