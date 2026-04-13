import express from "express"
import {
  getCustomers,
  getCustomerDetail,
} from "../services/customerService"

const router = express.Router()

/**
 * GET /customers
 * Return all customers with order counts
 */
router.get("/", async (_req, res) => {
  try {
    const customers = await getCustomers()
    res.json(customers)
  } catch (error) {
    console.error("Failed to fetch customers:", error)
    res.status(500).json({ message: "Failed to fetch customers" })
  }
})

/**
 * GET /customers/:id
 * Return one customer with order history and summary
 */
router.get("/:id", async (req, res) => {
  try {
    const customer = await getCustomerDetail(req.params.id)

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" })
    }

    res.json(customer)
  } catch (error) {
    console.error("Failed to fetch customer detail:", error)
    res.status(500).json({ message: "Failed to fetch customer detail" })
  }
})

export default router