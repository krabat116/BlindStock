export type OrderPreviewItem = {
  category: string
  itemName: string
  quantity: number
  lengthMm: number | null       // LENGTH 타입: 차감할 총 길이(mm)
  sourceRows: number[]
  matched: boolean
  stockType: "COUNT" | "LENGTH"
  currentStock: number | null   // COUNT 타입의 현재 재고
  currentLengthMm: number | null // LENGTH 타입의 현재 재고(mm)
  itemId: number | null
}

export type OrderPreviewResponse = {
  parsedRowCount: number
  orderSheetNo: number | null
  accountName: string
  totalItems: number
  preview: OrderPreviewItem[]
}