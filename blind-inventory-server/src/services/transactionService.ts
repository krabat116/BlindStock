import prisma from "../lib/prisma"

export async function getTransactions() {
  const transactions = await prisma.transaction.findMany({
    include: {
      item: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  })

  return transactions.map((transaction) => ({
    id: transaction.id,
    itemName: transaction.item.name,
    type: transaction.type,
    quantity: transaction.quantity,
    lengthMm: transaction.lengthMm,
    source: transaction.source,
    note: transaction.note,
    createdAt: transaction.createdAt,
  }))
}