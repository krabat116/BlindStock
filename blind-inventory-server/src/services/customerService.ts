import prisma from "../lib/prisma"

/**
 * Get all customers for the customers list page
 * Includes total order count for each customer
 */
export async function getCustomers() {
  const customers = await prisma.customer.findMany({
    include: {
      _count: {
        select: {
          orders: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return customers.map((customer) => ({
    id: customer.id,
    accountName: customer.accountName,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    companyName: customer.companyName,
    address: customer.address,
    note: customer.note,
    createdAt: customer.createdAt,
    totalOrders: customer._count.orders,
  }))
}

/**
 * Get one customer with order history and summary data
 */
export async function getCustomerDetail(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: {
          createdAt: "desc",
        },
      },
      _count: {
        select: {
          orders: true,
        },
      },
    },
  })

  if (!customer) return null

  const latestOrderSheetNo = customer.orders[0]?.orderSheetNo ?? null
  const totalItemsOrdered = customer.orders.reduce(
    (sum, order) => sum + order.totalItems,
    0
  )

  return {
    id: customer.id,
    accountName: customer.accountName,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    companyName: customer.companyName,
    address: customer.address,
    note: customer.note,
    createdAt: customer.createdAt,

    // Summary cards
    totalOrders: customer._count.orders,
    latestOrderSheetNo,
    totalItemsOrdered,

    // Order history table
    orders: customer.orders.map((order) => ({
      id: order.id,
      orderSheetNo: order.orderSheetNo,
      year: order.orderYear,
      month: order.orderMonth,
      totalItems: order.totalItems,
      status: order.status,
      fileName: order.fileName,
      createdAt: order.createdAt,
    })),
  }
}

/**
 * Create a new customer
 */
export async function createCustomer(payload: {
  accountName: string
  name?: string
  phone?: string
  email?: string
  companyName?: string
  address?: string
  note?: string
}) {
  const trimmedAccountName = typeof payload.accountName === "string" ? payload.accountName.trim() : ""

  if (!trimmedAccountName) {
    const error = new Error("Account name is required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const existing = await prisma.customer.findUnique({
    where: { accountName: trimmedAccountName },
  })

  if (existing) {
    const error = new Error("A customer with this account name already exists")
    ;(error as Error & { status?: number }).status = 409
    throw error
  }

  const customer = await prisma.customer.create({
    data: {
      accountName: trimmedAccountName,
      name: payload.name?.trim() || null,
      phone: payload.phone?.trim() || null,
      email: payload.email?.trim() || null,
      companyName: payload.companyName?.trim() || null,
      address: payload.address?.trim() || null,
      note: payload.note?.trim() || null,
    },
  })

  return {
    id: customer.id,
    accountName: customer.accountName,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    companyName: customer.companyName,
    address: customer.address,
    note: customer.note,
    createdAt: customer.createdAt,
    totalOrders: 0,
  }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(
  id: string,
  payload: {
    accountName?: string
    name?: string
    phone?: string
    email?: string
    companyName?: string
    address?: string
    note?: string
  }
) {
  const existing = await prisma.customer.findUnique({ where: { id } })

  if (!existing) {
    const error = new Error("Customer not found")
    ;(error as Error & { status?: number }).status = 404
    throw error
  }

  if (payload.accountName !== undefined) {
    const trimmed = payload.accountName.trim()
    if (!trimmed) {
      const error = new Error("Account name cannot be empty")
      ;(error as Error & { status?: number }).status = 400
      throw error
    }
    const duplicate = await prisma.customer.findFirst({
      where: { accountName: trimmed, NOT: { id } },
    })
    if (duplicate) {
      const error = new Error("A customer with this account name already exists")
      ;(error as Error & { status?: number }).status = 409
      throw error
    }
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...(payload.accountName !== undefined && { accountName: payload.accountName.trim() }),
      name: payload.name?.trim() || null,
      phone: payload.phone?.trim() || null,
      email: payload.email?.trim() || null,
      companyName: payload.companyName?.trim() || null,
      address: payload.address?.trim() || null,
      note: payload.note?.trim() || null,
    },
    include: {
      _count: { select: { orders: true } },
    },
  })

  return {
    id: updated.id,
    accountName: updated.accountName,
    name: updated.name,
    phone: updated.phone,
    email: updated.email,
    companyName: updated.companyName,
    address: updated.address,
    note: updated.note,
    createdAt: updated.createdAt,
    totalOrders: updated._count.orders,
  }
}

/**
 * Delete a customer (cascades to orders and order items)
 */
export async function deleteCustomer(id: string) {
  const existing = await prisma.customer.findUnique({ where: { id } })

  if (!existing) {
    const error = new Error("Customer not found")
    ;(error as Error & { status?: number }).status = 404
    throw error
  }

  await prisma.customer.delete({ where: { id } })
}