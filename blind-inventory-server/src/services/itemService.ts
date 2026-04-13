import prisma from "../lib/prisma"

/**
 * Get all inventory items with category names
 */
export async function getItems() {
  const items = await prisma.item.findMany({
    include: { category: true },
    orderBy: { id: "asc" },
  })

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    minimumStock: item.minimumStock,
    unit: item.unit,
    category: item.category.name,
  }))
}

/**
 * Update stock quantity for one item
 */
export async function updateItemStock(
  itemId: number,
  quantity: number,
  note?: string
) {
  if (!Number.isInteger(itemId)) {
    const error = new Error("Invalid item id")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (typeof quantity !== "number" || quantity < 0) {
    const error = new Error("Quantity must be a non-negative number")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const existingItem = await prisma.item.findUnique({
    where: { id: itemId },
    include: { category: true },
  })

  if (!existingItem) {
    const error = new Error("Item not found")
    ;(error as Error & { status?: number }).status = 404
    throw error
  }

  const previousQuantity = existingItem.quantity
  const difference = quantity - previousQuantity

  let transactionType = "adjustment"

  if (difference > 0) transactionType = "in"
  if (difference < 0) transactionType = "out"

  const result = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.item.update({
      where: { id: itemId },
      data: { quantity },
      include: { category: true },
    })

    await tx.transaction.create({
      data: {
        itemId: itemId,
        type: transactionType,
        quantity: Math.abs(difference),
        source: "manual",
        note:
          note?.trim() ||
          `Stock updated from ${previousQuantity} to ${quantity}`,
      },
    })

    return updatedItem
  })

  return {
    id: result.id,
    name: result.name,
    quantity: result.quantity,
    minimumStock: result.minimumStock,
    unit: result.unit,
    category: result.category.name,
  }
}

/**
 * Update item name
 */
export async function updateItemName(itemId: number, name: string) {
  const trimmedName = typeof name === "string" ? name.trim() : ""

  if (!Number.isInteger(itemId)) {
    const error = new Error("Invalid item id")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (!trimmedName) {
    const error = new Error("Item name is required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const existingItem = await prisma.item.findUnique({
    where: { id: itemId },
    include: { category: true },
  })

  if (!existingItem) {
    const error = new Error("Item not found")
    ;(error as Error & { status?: number }).status = 404
    throw error
  }

  const duplicateItem = await prisma.item.findFirst({
    where: {
      name: trimmedName,
      categoryId: existingItem.categoryId,
      NOT: {
        id: itemId,
      },
    },
  })

  if (duplicateItem) {
    const error = new Error("An item with the same name already exists in this category")
    ;(error as Error & { status?: number }).status = 409
    throw error
  }

  const updatedItem = await prisma.item.update({
    where: { id: itemId },
    data: { name: trimmedName },
    include: { category: true },
  })

  return {
    id: updatedItem.id,
    name: updatedItem.name,
    quantity: updatedItem.quantity,
    minimumStock: updatedItem.minimumStock,
    unit: updatedItem.unit,
    category: updatedItem.category.name,
  }
}

/**
 * Create a new inventory item
 */
export async function createItem(input: {
  name: string
  categoryId: number
  quantity: number
  minimumStock: number
  unit: string
}) {
  const { name, categoryId, quantity, minimumStock, unit } = input

  const trimmedName = typeof name === "string" ? name.trim() : ""
  const trimmedUnit = typeof unit === "string" ? unit.trim() : ""

  if (!trimmedName) {
    const error = new Error("Item name is required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (!Number.isInteger(categoryId)) {
    const error = new Error("Valid category is required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (typeof quantity !== "number" || quantity < 0) {
    const error = new Error("Quantity must be a non-negative number")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (typeof minimumStock !== "number" || minimumStock < 0) {
    const error = new Error("Minimum stock must be a non-negative number")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (!trimmedUnit) {
    const error = new Error("Unit is required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  })

  if (!category) {
    const error = new Error("Category not found")
    ;(error as Error & { status?: number }).status = 404
    throw error
  }

  const existingItem = await prisma.item.findFirst({
    where: {
      name: trimmedName,
      categoryId,
    },
  })

  if (existingItem) {
    const error = new Error("An item with the same name already exists in this category")
    ;(error as Error & { status?: number }).status = 409
    throw error
  }

  const createdItem = await prisma.item.create({
    data: {
      name: trimmedName,
      categoryId,
      quantity,
      minimumStock,
      unit: trimmedUnit,
    },
    include: {
      category: true,
    },
  })

  if (quantity > 0) {
    await prisma.transaction.create({
      data: {
        itemId: createdItem.id,
        type: "in",
        quantity,
        source: "initial_stock",
        note: `Initial stock for new item: ${trimmedName}`,
      },
    })
  }

  return {
    id: createdItem.id,
    name: createdItem.name,
    quantity: createdItem.quantity,
    minimumStock: createdItem.minimumStock,
    unit: createdItem.unit,
    category: createdItem.category.name,
  }
}

/**
 * Delete one item
 */
export async function deleteItem(itemId: number) {
  if (!Number.isInteger(itemId)) {
    const error = new Error("Invalid item id")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const existingItem = await prisma.item.findUnique({
    where: { id: itemId },
  })

  if (!existingItem) {
    const error = new Error("Item not found")
    ;(error as Error & { status?: number }).status = 404
    throw error
  }

  await prisma.item.delete({
    where: { id: itemId },
  })
}