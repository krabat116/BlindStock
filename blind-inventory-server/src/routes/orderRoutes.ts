import express from "express"
import multer from "multer"
import {
  previewOrderUpload,
  confirmOrderDeduction,
} from "../services/orderService"

const router = express.Router()

/**
 * Use memory storage so the uploaded Excel file
 * can be parsed directly from req.file.buffer
 */
const upload = multer({ storage: multer.memoryStorage() })

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
 * Confirm stock deduction after preview
 */
router.post("/confirm-deduction", async (req, res) => {
  try {
    const result = await confirmOrderDeduction(req.body)
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