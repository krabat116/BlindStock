import jwt from "jsonwebtoken"
import type { Request, Response, NextFunction } from "express"

export type AuthPayload = {
  id: number
  username: string
  role: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production"

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ message: "Invalid or expired token" })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ message: "Admin access required" })
    return
  }
  next()
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}
