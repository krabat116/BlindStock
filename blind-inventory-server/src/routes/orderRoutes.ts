import express from "express"
import multer from "multer"
import {
  previewOrderUpload,
  confirmOrderDeduction,
  getOrderStats,
} from "../services/orderService"

const router = express.Router()

/**
 * Use memory storage so the uploaded Excel file
 * can be parsed directly from req.file.buffer
 */
const upload = multer({ storage: multer.memoryStorage() })

/**
 * GET /orders/stats
 * Return factory-wide order summaries (year, month, totalItems per order)
 */
router.get("/stats", async (_req, res) => {
  try {
    const stats = await getOrderStats()
    res.json(stats)
  } catch (error) {
    console.error("Failed to fetch order stats:", error)
    res.status(500).json({ message: "Failed to fetch order stats" })
  }
})

/**
 * POST /orders/preview
 * Upload one Excel file and return parsed preview data
 */
router.post("/preview", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" })
    }

    const result = await previewOrderUpload(req.file.buffer)
    res.json(result)
  } catch (error) {
    console.error("Failed to preview order upload:", error)
    res.status(500).json({ message: "Failed to preview order upload" })
  }
})

/**
 * POST /orders/confirm-deduction
 * Re-uploads the Excel file and atomically deducts stock + saves work order data.
 * Requires the file to be sent as multipart/form-data (field: "file").
 */
router.post("/confirm-deduction", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" })
    }

    const year = parseInt(req.body.year, 10)
    const month = parseInt(req.body.month, 10)
    const orderSheetNo = parseInt(req.body.orderSheetNo, 10)
    const totalItems = parseInt(req.body.totalItems, 10)
    const { fileName, accountName } = req.body

    const result = await confirmOrderDeduction(
      req.file.buffer,
      { year, month, fileName, accountName, orderSheetNo, totalItems },
      req.user!.id
    )
    res.json(result)
  } catch (error) {
    console.error("Failed to confirm deduction:", error)

    const status =
      error instanceof Error && "status" in error && typeof error.status === "number"
        ? error.status
        : 500

    const message =
      error instanceof Error ? error.message : "Failed to confirm deduction"

    res.status(status).json({ message })
  }
})

export default router