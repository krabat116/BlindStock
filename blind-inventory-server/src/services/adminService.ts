import prisma from "../lib/prisma"

/**
 * Reset all inventory data for testing purposes.
 *
 * What is deleted / zeroed:
 *   - All Transaction records
 *   - All CustomerOrder records (cascades to OrderItem)
 *   - All Item stock values → 0 (items and categories themselves are kept)
 *
 * What is kept:
 *   - Items and Categories (structure)
 *   - Customers (account list)
 *   - Users (auth accounts)
 */
export async function resetInventory() {
  const result = await prisma.$transaction(async (tx) => {
    const { count: deletedTransactions } = await tx.transaction.deleteMany()
    const { count: deletedOrders } = await tx.customerOrder.deleteMany()
    const { count: resetItems } = await tx.item.updateMany({
      data: {
        quantity: 0,
        totalLengthMm: 0,
        totalAreaMm2: 0,
      },
    })

    return { deletedTransactions, deletedOrders, resetItems }
  })

  return result
}
