export type ParsedOrderRow = {
  rowNumber: number
  account: string
  customerName: string
  width: number | null
  drop: number | null
  material: string
  finish: string
  componentryColour: string
  chainType: string
  operationRaw: string
  qty: number

  /**
   * Optional tube override value from the small blank column
   * next to BLIND NO.
   * Example: "43", "43A"
   */
  tubeOverride?: string | null
}

export type PreviewComponent = {
  sourceRow: number
  category: "Finish" | "Winder" | "Pin" | "Chain" | "Tube"
  itemName: string
  quantity: number
  lengthMm?: number // LENGTH 타입 부품(튜브 등)의 차감할 총 길이(mm)
}

export function isSwivelOperation(operationRaw: string) {
  return operationRaw.toUpperCase().includes("SWIVEL")
}

export function buildWinderName(componentryColour: string, operationRaw: string) {
  const colour = componentryColour.trim().toUpperCase()

  if (!colour) return ""

  if (isSwivelOperation(operationRaw)) {
    return `${colour} WINDER`
  }

  return `${colour} WINDER`
}

export function buildPinName(componentryColour: string) {
  const colour = componentryColour.trim().toUpperCase()

  if (!colour) return ""

  // current rule:
  // swivel pin does not exist separately
  // pin follows colour only
  return `${colour} PIN`
}

export function buildFinishName(finish: string) {
  return finish.trim().toUpperCase()
}

export function buildChainName(chainType: string) {
  return chainType.trim().toUpperCase()
}

/**
 * Decide which tube item should be used for one blind row.
 *
 * Rule priority:
 * 1. If tubeOverride exists, use it first.
 *    Example: "43" -> "43 TUBE", "43A" -> "43A TUBE"
 * 2. Otherwise use width-based default rules:
 *    0 - 2259   -> 38MM TUBE
 *    2260 - 2709 -> 45MM TUBE
 *    2710+      -> HD TUBE
 */
export function getTubeItemName(width: number, tubeOverride?: string | null) {
  const normalizedOverride = tubeOverride?.trim().toUpperCase()

  // Override has the highest priority
  if (normalizedOverride) {
    if (normalizedOverride === "43") return "43mm TUBE"
    if (normalizedOverride === "43A") return "43mm TUBE"

    // Fallback for any future custom override values
    return `${normalizedOverride} TUBE`
  }

  // Width-based default rules
  if (width >= 0 && width <= 2259) {
    return "38mm TUBE"
  }

  if (width >= 2260 && width <= 2709) {
    return "43mm TUBE"
  }

  return "HD TUBE"
}

export function mapOrderRowToComponents(row: ParsedOrderRow): PreviewComponent[] {
  const components: PreviewComponent[] = []
  const qty = row.qty > 0 ? row.qty : 1

  const finishName = buildFinishName(row.finish)
  if (finishName) {
    components.push({
      sourceRow: row.rowNumber,
      category: "Finish",
      itemName: finishName,
      quantity: qty,
    })
  }

  const chainName = buildChainName(row.chainType)
  if (chainName) {
    components.push({
      sourceRow: row.rowNumber,
      category: "Chain",
      itemName: chainName,
      quantity: qty,
    })
  }

  const winderName = buildWinderName(row.componentryColour, row.operationRaw)
  if (winderName) {
    components.push({
      sourceRow: row.rowNumber,
      category: "Winder",
      itemName: winderName,
      quantity: qty,
    })
  }

  const pinName = buildPinName(row.componentryColour)
  if (pinName) {
    components.push({
      sourceRow: row.rowNumber,
      category: "Pin",
      itemName: pinName,
      quantity: qty,
    })
  }

  /**
   * Tube mapping
   * - If width exists, decide the correct tube item
   * - Override value (43 / 43A etc.) takes priority over width rule
   */
  if (typeof row.width === "number" && !Number.isNaN(row.width)) {
    const tubeName = getTubeItemName(row.width, row.tubeOverride)

    if (tubeName) {
      components.push({
        sourceRow: row.rowNumber,
        category: "Tube",
        itemName: tubeName,
        quantity: qty,
        // 튜브는 LENGTH 타입: 블라인드 가로 너비(mm) × 수량 = 차감할 길이
        lengthMm: row.width * qty,
      })
    }
  }

  return components
}