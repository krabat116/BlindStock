import prisma from "../lib/prisma"

/**
 * Get all categories with item counts
 * Ordered by category name
 */
export async function getCategories() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  })

  const formattedCategories = categories.map((category) => ({
    id: category.id,
    name: category.name,
    itemCount: category._count.items,
  }))

  return formattedCategories
}

/**
 * Create a new category
 */
export async function createCategory(name: string) {
  const trimmedName = typeof name === "string" ? name.trim() : ""

  if (!trimmedName) {
    throw new Error("Category name is required")
  }

  const existingCategory = await prisma.category.findUnique({
    where: { name: trimmedName },
  })

  if (existingCategory) {
    const error = new Error("Category already exists")
    ;(error as Error & { status?: number }).status = 409
    throw error
  }

  const category = await prisma.category.create({
    data: { name: trimmedName },
  })

  return category
}

/**
 * Delete a category only if it has no items
 */
export async function deleteCategory(categoryId: number) {
  if (!Number.isInteger(categoryId)) {
    const error = new Error("Invalid category id")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const existingCategory = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      _count: {
        select: {
          items: true,
        },
      },
    },
  })

  if (!existingCategory) {
    const error = new Error("Category not found")
    ;(error as Error & { status?: number }).status = 404
    throw error
  }

  if (existingCategory._count.items > 0) {
    const error = new Error("Cannot delete category because it still contains items")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  await prisma.category.delete({
    where: { id: categoryId },
  })
}