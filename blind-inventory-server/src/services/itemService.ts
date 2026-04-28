import prisma from "../lib/prisma"
import type { CreateItemPayload } from "../types/CreateItemPayload"

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
    stockType: item.stockType,
    quantity: item.quantity,
    minimumStock: item.minimumStock,
    unit: item.unit,
    defaultLengthMm: item.defaultLengthMm,
    totalLengthMm: item.totalLengthMm,
    minimumLengthMm: item.minimumLengthMm,
    cutoffLengthMm: item.cutoffLengthMm,
    category: item.category.name,
  }))
}

/**
 * Update stock for one item (increment-based)
 * COUNT 타입: payload.quantity = 추가할 수량 (기존 재고에 합산)
 * LENGTH 타입: payload.totalLengthMm = 추가할 길이(mm) (기존 총 길이에 합산)
 */
export async function updateItemStock(
  itemId: number,
  payload: { quantity?: number; totalLengthMm?: number; note?: string }
) {
  if (!Number.isInteger(itemId)) {
    const error = new Error("Invalid item id")
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

  const note = payload.note

  if (existingItem.stockType === "LENGTH") {
    const addedLengthMm = payload.totalLengthMm ?? 0

    if (typeof addedLengthMm !== "number" || addedLengthMm < 0) {
      const error = new Error("Added length must be a non-negative number")
      ;(error as Error & { status?: number }).status = 400
      throw error
    }

    const previousLengthMm = existingItem.totalLengthMm ?? 0
    const newTotalLengthMm = previousLengthMm + addedLengthMm

    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.item.update({
        where: { id: itemId },
        data: { totalLengthMm: newTotalLengthMm },
        include: { category: true },
      })

      await tx.transaction.create({
        data: {
          itemId,
          type: "in",
          lengthMm: addedLengthMm,
          source: "manual",
          note: note?.trim() || `Added ${addedLengthMm.toLocaleString()}mm (new total: ${newTotalLengthMm.toLocaleString()}mm)`,
        },
      })

      return updatedItem
    })

    return {
      id: result.id,
      name: result.name,
      stockType: result.stockType,
      quantity: result.quantity,
      minimumStock: result.minimumStock,
      unit: result.unit,
      defaultLengthMm: result.defaultLengthMm,
      totalLengthMm: result.totalLengthMm,
      minimumLengthMm: result.minimumLengthMm,
      cutoffLengthMm: result.cutoffLengthMm,
      category: result.category.name,
    }
  }

  // COUNT 타입
  const addedQuantity = payload.quantity ?? 0

  if (typeof addedQuantity !== "number" || addedQuantity < 0) {
    const error = new Error("Added quantity must be a non-negative number")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const previousQuantity = existingItem.quantity ?? 0
  const newQuantity = previousQuantity + addedQuantity

  const result = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.item.update({
      where: { id: itemId },
      data: { quantity: newQuantity },
      include: { category: true },
    })

    await tx.transaction.create({
      data: {
        itemId,
        type: "in",
        quantity: addedQuantity,
        source: "manual",
        note: note?.trim() || `Added ${addedQuantity} units (new total: ${newQuantity})`,
      },
    })

    return updatedItem
  })

  return {
    id: result.id,
    name: result.name,
    stockType: result.stockType,
    quantity: result.quantity,
    minimumStock: result.minimumStock,
    unit: result.unit,
    defaultLengthMm: result.defaultLengthMm,
    totalLengthMm: result.totalLengthMm,
    minimumLengthMm: result.minimumLengthMm,
    cutoffLengthMm: result.cutoffLengthMm,
    category: result.category.name,
  }
}

/**
 * 아이템의 재고 타입 및 설정 업데이트
 * COUNT ↔ LENGTH 전환, 또는 각 타입별 임계값 변경
 */
export async function updateItemSettings(
  itemId: number,
  payload: {
    stockType: "COUNT" | "LENGTH"
    // COUNT 전용
    minimumStock?: number
    unit?: string
    // LENGTH 전용
    defaultLengthMm?: number
    totalLengthMm?: number
    minimumLengthMm?: number
    cutoffLengthMm?: number
  }
) {
  if (!Number.isInteger(itemId)) {
    const error = new Error("Invalid item id")
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

  if (payload.stockType === "COUNT") {
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        stockType: "COUNT",
        minimumStock: payload.minimumStock ?? existingItem.minimumStock ?? 0,
        unit: payload.unit?.trim() ?? existingItem.unit ?? "pcs",
        // LENGTH 필드 초기화
        defaultLengthMm: null,
        totalLengthMm: null,
        minimumLengthMm: null,
        cutoffLengthMm: null,
      },
      include: { category: true },
    })

    return { ...updatedItem, category: updatedItem.category.name }
  }

  // LENGTH 타입으로 전환
  const defaultLengthMm = payload.defaultLengthMm ?? existingItem.defaultLengthMm
  const totalLengthMm = payload.totalLengthMm ?? existingItem.totalLengthMm ?? 0
  const minimumLengthMm = payload.minimumLengthMm ?? existingItem.minimumLengthMm ?? 0
  const cutoffLengthMm = payload.cutoffLengthMm ?? existingItem.cutoffLengthMm ?? 800

  if (!defaultLengthMm || defaultLengthMm <= 0) {
    const error = new Error("Default length must be greater than 0")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const updatedItem = await prisma.$transaction(async (tx) => {
    const updated = await tx.item.update({
      where: { id: itemId },
      data: {
        stockType: "LENGTH",
        defaultLengthMm,
        totalLengthMm,
        minimumLengthMm,
        cutoffLengthMm,
        // COUNT 필드 초기화
        quantity: null,
        minimumStock: null,
        unit: "mm",
      },
      include: { category: true },
    })

    // 초기 재고 트랜잭션 기록 (이전이 COUNT였다면)
    if (existingItem.stockType === "COUNT" && totalLengthMm > 0) {
      await tx.transaction.create({
        data: {
          itemId,
          type: "adjustment",
          lengthMm: totalLengthMm,
          source: "manual",
          note: `Converted from COUNT to LENGTH type. Initial total: ${totalLengthMm}mm`,
        },
      })
    }

    return updated
  })

  return { ...updatedItem, category: updatedItem.category.name }
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
export async function createItem(input: CreateItemPayload) {
  const trimmedName = typeof input.name === "string" ? input.name.trim() : ""

  if (!trimmedName) {
    const error = new Error("Item name is required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (!Number.isInteger(input.categoryId)) {
    const error = new Error("Valid category is required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
  })

  if (!category) {
    const error = new Error("Category not found")
    ;(error as Error & { status?: number }).status = 404
    throw error
  }

  const existingItem = await prisma.item.findFirst({
    where: {
      name: trimmedName,
      categoryId: input.categoryId,
    },
  })

  if (existingItem) {
    const error = new Error("An item with the same name already exists in this category")
    ;(error as Error & { status?: number }).status = 409
    throw error
  }

  if (input.stockType === "COUNT") {
    const trimmedUnit = typeof input.unit === "string" ? input.unit.trim() : ""

    if (typeof input.quantity !== "number" || input.quantity < 0) {
      const error = new Error("Quantity must be a non-negative number")
      ;(error as Error & { status?: number }).status = 400
      throw error
    }

    if (typeof input.minimumStock !== "number" || input.minimumStock < 0) {
      const error = new Error("Minimum stock must be a non-negative number")
      ;(error as Error & { status?: number }).status = 400
      throw error
    }

    if (!trimmedUnit) {
      const error = new Error("Unit is required")
      ;(error as Error & { status?: number }).status = 400
      throw error
    }

    const createdItem = await prisma.item.create({
      data: {
        name: trimmedName,
        categoryId: input.categoryId,
        stockType: "COUNT",
        quantity: input.quantity,
        minimumStock: input.minimumStock,
        unit: trimmedUnit,
        defaultLengthMm: null,
        totalLengthMm: null,
        minimumLengthMm: null,
      },
      include: {
        category: true,
      },
    })

    if (input.quantity > 0) {
      await prisma.transaction.create({
        data: {
          itemId: createdItem.id,
          type: "in",
          quantity: input.quantity,
          lengthMm: null,
          source: "initial_stock",
          note: `Initial stock for new item: ${trimmedName}`,
        },
      })
    }

    return {
      id: createdItem.id,
      name: createdItem.name,
      stockType: createdItem.stockType,
      quantity: createdItem.quantity,
      minimumStock: createdItem.minimumStock,
      unit: createdItem.unit,
      defaultLengthMm: createdItem.defaultLengthMm,
      totalLengthMm: createdItem.totalLengthMm,
      minimumLengthMm: createdItem.minimumLengthMm,
      category: createdItem.category.name,
    }
  }

  if (typeof input.defaultLengthMm !== "number" || input.defaultLengthMm <= 0) {
    const error = new Error("Default length must be greater than 0")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (typeof input.totalLengthMm !== "number" || input.totalLengthMm < 0) {
    const error = new Error("Total length must be a non-negative number")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (typeof input.minimumLengthMm !== "number" || input.minimumLengthMm < 0) {
    const error = new Error("Minimum length must be a non-negative number")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const createdItem = await prisma.item.create({
    data: {
      name: trimmedName,
      categoryId: input.categoryId,
      stockType: "LENGTH",
      quantity: null,
      minimumStock: null,
      unit: "mm",
      defaultLengthMm: input.defaultLengthMm,
      totalLengthMm: input.totalLengthMm,
      minimumLengthMm: input.minimumLengthMm,
      cutoffLengthMm: input.cutoffLengthMm ?? 800,
    },
    include: {
      category: true,
    },
  })

  if (input.totalLengthMm > 0) {
    await prisma.transaction.create({
      data: {
        itemId: createdItem.id,
        type: "in",
        quantity: null,
        lengthMm: input.totalLengthMm,
        source: "initial_stock",
        note: `Initial length stock for new item: ${trimmedName}`,
      },
    })
  }

  return {
    id: createdItem.id,
    name: createdItem.name,
    stockType: createdItem.stockType,
    quantity: createdItem.quantity,
    minimumStock: createdItem.minimumStock,
    unit: createdItem.unit,
    defaultLengthMm: createdItem.defaultLengthMm,
    totalLengthMm: createdItem.totalLengthMm,
    minimumLengthMm: createdItem.minimumLengthMm,
    cutoffLengthMm: createdItem.cutoffLengthMm,
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