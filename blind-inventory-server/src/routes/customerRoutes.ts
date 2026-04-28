import express from "express"
import {
  getCustomers,
  getCustomerDetail,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../services/customerService"
import { requireAdmin } from "../middleware/authMiddleware"

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

/**
 * POST /customers
 * Create a new customer
 */
router.post("/", async (req, res) => {
  try {
    const customer = await createCustomer(req.body)
    res.status(201).json(customer)
  } catch (error) {
    const err = error as Error & { status?: number }
    console.error("Failed to create customer:", err)
    res.status(err.status || 500).json({ message: err.message || "Failed to create customer" })
  }
})

/**
 * PATCH /customers/:id
 * Update an existing customer
 */
router.patch("/:id", async (req, res) => {
  try {
    const customer = await updateCustomer(req.params.id, req.body)
    res.json(customer)
  } catch (error) {
    const err = error as Error & { status?: number }
    console.error("Failed to update customer:", err)
    res.status(err.status || 500).json({ message: err.message || "Failed to update customer" })
  }
})

/**
 * DELETE /customers/:id
 * Delete a customer and all associated orders
 */
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await deleteCustomer(req.params.id)
    res.status(204).send()
  } catch (error) {
    const err = error as Error & { status?: number }
    console.error("Failed to delete customer:", err)
    res.status(err.status || 500).json({ message: err.message || "Failed to delete customer" })
  }
})

export default router