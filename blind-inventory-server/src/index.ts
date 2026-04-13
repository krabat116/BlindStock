import "dotenv/config"
import express from "express"
import cors from "cors"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import multer from "multer"
import transactionRoutes from "./routes/transactionRoutes"
import categoryRoutes from "./routes/categoryRoutes"
import itemRoutes from "./routes/itemRoutes"
import orderRoutes from "./routes/orderRoutes"
import customerRoutes from "./routes/customerRoutes"


// const prisma = new PrismaClient({ adapter })

const app = express()

app.use(cors())
app.use(express.json())
app.use("/transactions", transactionRoutes)
app.use("/categories", categoryRoutes)
app.use("/items", itemRoutes)
app.use("/orders", orderRoutes)
app.use("/customers", customerRoutes)

const upload = multer({ storage: multer.memoryStorage() })



app.get("/", (_req, res) => {
  res.send("Blind inventory server is running")
})




const PORT = 3001

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})