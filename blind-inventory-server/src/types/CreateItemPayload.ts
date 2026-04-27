export type CreateItemPayload =
  | {
      name: string
      categoryId: number
      stockType: "COUNT"
      quantity: number
      minimumStock: number
      unit: string
      defaultLengthMm?: null
      totalLengthMm?: null
      minimumLengthMm?: null
    }
  | {
      name: string
      categoryId: number
      stockType: "LENGTH"
      defaultLengthMm: number
      totalLengthMm: number
      minimumLengthMm: number
      quantity?: null
      minimumStock?: null
      unit?: null
    }