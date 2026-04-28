import "dotenv/config"
import express from "express"
import cors from "cors"
import multer from "multer"
import authRoutes from "./routes/authRoutes"
import transactionRoutes from "./routes/transactionRoutes"
import categoryRoutes from "./routes/categoryRoutes"
import itemRoutes from "./routes/itemRoutes"
import orderRoutes from "./routes/orderRoutes"
import customerRoutes from "./routes/customerRoutes"
import { requireAuth } from "./middleware/authMiddleware"

const app = express()

app.use(cors())
app.use(express.json())

// Public auth routes (login, setup) — no JWT required
app.use("/auth", authRoutes)

// All routes below require a valid JWT
app.use(requireAuth)

app.use("/transactions", transactionRoutes)
app.use("/categories", categoryRoutes)
app.use("/items", itemRoutes)
app.use("/orders", orderRoutes)
app.use("/customers", customerRoutes)

const upload = multer({ storage: multer.memoryStorage() })

app.get("/", (_req, res) => {
  res.send("Blind inventory server is running")
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
