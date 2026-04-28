import express from "express"
import {
  login,
  setupAdmin,
  listUsers,
  createUser,
  deleteUser,
  changePassword,
  changeMyPassword,
} from "../services/authService"
import { requireAuth, requireAdmin } from "../middleware/authMiddleware"

const router = express.Router()

/**
 * POST /auth/login
 * Public — issue JWT token
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body
    const result = await login(username, password)
    res.json(result)
  } catch (error) {
    const err = error as Error & { status?: number }
    res.status(err.status || 500).json({ message: err.message })
  }
})

/**
 * POST /auth/setup
 * Public — create the first admin account (only works when 0 users exist)
 */
router.post("/setup", async (req, res) => {
  try {
    const { username, password } = req.body
    const result = await setupAdmin(username, password)
    res.status(201).json(result)
  } catch (error) {
    const err = error as Error & { status?: number }
    res.status(err.status || 500).json({ message: err.message })
  }
})

/**
 * GET /auth/me
 * Returns current user info from token
 */
router.get("/me", requireAuth, (req, res) => {
  res.json(req.user)
})

/**
 * GET /auth/users
 * Admin only — list all users
 */
router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const users = await listUsers()
    res.json(users)
  } catch (error) {
    const err = error as Error & { status?: number }
    res.status(err.status || 500).json({ message: err.message })
  }
})

/**
 * POST /auth/users
 * Admin only — create a new user
 */
router.post("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body
    const user = await createUser(username, password, role)
    res.status(201).json(user)
  } catch (error) {
    const err = error as Error & { status?: number }
    res.status(err.status || 500).json({ message: err.message })
  }
})

/**
 * DELETE /auth/users/:id
 * Admin only — delete a user
 */
router.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    await deleteUser(id, req.user!.id)
    res.status(204).send()
  } catch (error) {
    const err = error as Error & { status?: number }
    res.status(err.status || 500).json({ message: err.message })
  }
})

/**
 * PATCH /auth/users/:id/password
 * Admin only — reset a user's password
 */
router.patch("/users/:id/password", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { password } = req.body
    await changePassword(id, password)
    res.json({ message: "Password updated" })
  } catch (error) {
    const err = error as Error & { status?: number }
    res.status(err.status || 500).json({ message: err.message })
  }
})

/**
 * PATCH /auth/me/password
 * Any logged-in user — change own password (requires current password)
 */
router.patch("/me/password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    await changeMyPassword(req.user!.id, currentPassword, newPassword)
    res.json({ message: "Password updated" })
  } catch (error) {
    const err = error as Error & { status?: number }
    res.status(err.status || 500).json({ message: err.message })
  }
})

export default router
