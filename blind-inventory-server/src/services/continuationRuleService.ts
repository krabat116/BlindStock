import prisma from "../lib/prisma"

export async function getRules() {
  return prisma.continuationRowRule.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      keyword: true,
      categoryName: true,
      createdAt: true,
    },
  })
}

export async function createRule(keyword: string, categoryName: string) {
  const trimmedKeyword = keyword.trim().toUpperCase()
  const trimmedCategory = categoryName.trim()

  if (!trimmedKeyword) {
    const error = new Error("Keyword is required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (!trimmedCategory) {
    const error = new Error("Category name is required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const existing = await prisma.continuationRowRule.findUnique({
    where: { keyword: trimmedKeyword },
  })

  if (existing) {
    const error = new Error(`Keyword "${trimmedKeyword}" already exists`)
    ;(error as Error & { status?: number }).status = 409
    throw error
  }

  return prisma.continuationRowRule.create({
    data: {
      keyword: trimmedKeyword,
      categoryName: trimmedCategory,
    },
    select: {
      id: true,
      keyword: true,
      categoryName: true,
      createdAt: true,
    },
  })
}

export async function deleteRule(id: number) {
  const existing = await prisma.continuationRowRule.findUnique({ where: { id } })

  if (!existing) {
    const error = new Error("Rule not found")
    ;(error as Error & { status?: number }).status = 404
    throw error
  }

  await prisma.continuationRowRule.delete({ where: { id } })
}
