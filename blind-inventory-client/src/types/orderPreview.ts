export type OrderPreviewItem = {
  category: string
  itemName: string
  quantity: number
  lengthMm: number | null        // LENGTH 타입: 차감할 총 길이(mm)
  areaMm2: number | null         // AREA 타입: 차감할 총 면적(mm²)
  sourceRows: number[]
  matched: boolean
  stockType: "COUNT" | "LENGTH" | "AREA"
  currentStock: number | null    // COUNT 타입의 현재 재고
  currentLengthMm: number | null // LENGTH 타입의 현재 재고(mm)
  currentAreaMm2: number | null  // AREA 타입의 현재 재고(mm²)
  itemId: number | null
}

export type OrderPreviewResponse = {
  parsedRowCount: number
  orderSheetNo: number | null
  accountName: string
  totalItems: number
  preview: OrderPreviewItem[]
}