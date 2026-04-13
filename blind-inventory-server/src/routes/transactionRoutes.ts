import express from "express"
import { getTransactions } from "../services/transactionService"

const router = express.Router()

router.get("/", async (_req, res) => {
  try {
    const transactions = await getTransactions()
    res.json(transactions)
  } catch (error) {
    console.error("Failed to fetch transactions:", error)
    res.status(500).json({ message: "Failed to fetch transactions" })
  }
})

export default router