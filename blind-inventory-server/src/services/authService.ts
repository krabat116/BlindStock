import bcrypt from "bcryptjs"
import prisma from "../lib/prisma"
import { signToken } from "../middleware/authMiddleware"

/**
 * Login with username + password. Returns JWT token + user info.
 */
export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } })

  if (!user) {
    const error = new Error("Invalid username or password")
    ;(error as Error & { status?: number }).status = 401
    throw error
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    const error = new Error("Invalid username or password")
    ;(error as Error & { status?: number }).status = 401
    throw error
  }

  const token = signToken({ id: user.id, username: user.username, role: user.role })

  return {
    token,
    user: { id: user.id, username: user.username, role: user.role },
  }
}

/**
 * Create the first admin user. Only works when no users exist.
 */
export async function setupAdmin(username: string, password: string) {
  const count = await prisma.user.count()
  if (count > 0) {
    const error = new Error("Setup already completed. Use admin account to create users.")
    ;(error as Error & { status?: number }).status = 403
    throw error
  }

  if (!username?.trim() || !password || password.length < 6) {
    const error = new Error("Username is required and password must be at least 6 characters")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { username: username.trim(), passwordHash, role: "ADMIN" },
  })

  const token = signToken({ id: user.id, username: user.username, role: user.role })

  return {
    token,
    user: { id: user.id, username: user.username, role: user.role },
  }
}

/**
 * List all users (without passwordHash)
 */
export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, role: true, createdAt: true },
  })
  return users
}

/**
 * Create a new user (admin only)
 */
export async function createUser(username: string, password: string, role: "ADMIN" | "STAFF" = "STAFF") {
  if (!username?.trim()) {
    const error = new Error("Username is required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (!password || password.length < 6) {
    const error = new Error("Password must be at least 6 characters")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const existing = await prisma.user.findUnique({ where: { username: username.trim() } })
  if (existing) {
    const error = new Error("Username already taken")
    ;(error as Error & { status?: number }).status = 409
    throw error
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { username: username.trim(), passwordHash, role },
    select: { id: true, username: true, role: true, createdAt: true },
  })

  return user
}

/**
 * Delete a user
 */
export async function deleteUser(id: number, requesterId: number) {
  if (id === requesterId) {
    const error = new Error("Cannot delete your own account")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    const error = new Error("User not found")
    ;(error as Error & { status?: number }).status = 404
    throw error
  }

  await prisma.user.delete({ where: { id } })
}

/**
 * Change own password — requires current password verification
 */
export async function changeMyPassword(id: number, currentPassword: string, newPassword: string) {
  if (!newPassword || newPassword.length < 6) {
    const error = new Error("New password must be at least 6 characters")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    const error = new Error("User not found")
    ;(error as Error & { status?: number }).status = 404
    throw error
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    const error = new Error("Current password is incorrect")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id }, data: { passwordHash } })
}

/**
 * Change a user's password
 */
export async function changePassword(id: number, newPassword: string) {
  if (!newPassword || newPassword.length < 6) {
    const error = new Error("Password must be at least 6 characters")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    const error = new Error("User not found")
    ;(error as Error & { status?: number }).status = 404
    throw error
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id }, data: { passwordHash } })
}
