import "dotenv/config"
import express from "express"
import cors from "cors"
import path from "path"
import authRoutes from "./routes/authRoutes"
import transactionRoutes from "./routes/transactionRoutes"
import categoryRoutes from "./routes/categoryRoutes"
import itemRoutes from "./routes/itemRoutes"
import orderRoutes from "./routes/orderRoutes"
import customerRoutes from "./routes/customerRoutes"
import adminRoutes from "./routes/adminRoutes"
import continuationRuleRoutes from "./routes/continuationRuleRoutes"
import { requireAuth } from "./middleware/authMiddleware"

const app = express()

// Prisma returns `bigint` for BigInt schema fields (totalAreaMm2, areaMm2).
// JSON.stringify does not support bigint natively, so convert to Number here.
// The area values involved (even millions of m²) fit safely in JS Number.
app.set("json replacer", (_key: string, value: unknown) =>
  typeof value === "bigint" ? Number(value) : value
)

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
)
app.use(express.json())

// Public auth routes (login, setup) — no JWT required
app.use("/auth", authRoutes)

// Serve React SPA static files (no auth needed — React handles client-side auth)
const publicPath = path.join(__dirname, "..", "public")
app.use(express.static(publicPath))

// Protected API routes — requireAuth applied per-router so the SPA catch-all is never blocked
app.use("/transactions", requireAuth, transactionRoutes)
app.use("/categories", requireAuth, categoryRoutes)
app.use("/items", requireAuth, itemRoutes)
app.use("/orders", requireAuth, orderRoutes)
app.use("/customers", requireAuth, customerRoutes)
app.use("/admin", requireAuth, adminRoutes)
app.use("/continuation-rules", requireAuth, continuationRuleRoutes)

// SPA catch-all — serve index.html for any unmatched route (client-side routing)
app.use((_req, res) => {
  res.sendFile(path.join(publicPath, "index.html"))
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
