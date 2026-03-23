export type OrderPreviewItem = {
  category: string
  itemName: string
  quantity: number
  sourceRows: number[]
  matched: boolean
  currentStock: number | null
  itemId: number | null
}

export type OrderPreviewResponse = {
  parsedRowCount: number
  preview: OrderPreviewItem[]
}