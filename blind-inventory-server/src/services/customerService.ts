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