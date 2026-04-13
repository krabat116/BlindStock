import "dotenv/config"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaClient } from "@prisma/client"

/**
 * Create the SQLite adapter using DATABASE_URL
 */
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
})

/**
 * Create one shared Prisma client instance
 */
const prisma = new PrismaClient({
  adapter,
})

export default prisma