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
  category: "Finish" | "Winder" | "Pin" | "Chain" | "Tube" | "Bracket" | "Cap"
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

  // Motor → no winder used (componentryColour is for pin only)
  if (operationRaw.trim().toUpperCase() === "MOTOR") return ""

  // SWIVEL operation → winder type is "SWIVEL" (e.g. "BLACK SWIVEL")
  if (isSwivelOperation(operationRaw)) {
    return `${colour} SWIVEL`
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
  const colour = finish.trim().toUpperCase()
  if (!colour) return ""
  return `${colour} FINISH`
}

/**
 * Build the chain item name from the chain material type (col 16)
 * and the chain size extracted from col 14.
 *
 * col 16 (chainType, already normalised): "METAL", "WHITE", or ""
 * col 14 (operationRaw): numeric size, "SWIVEL NNN", or "MOTOR"
 *
 * Examples:
 *   chainType="METAL", operationRaw="500"         → "METAL 500"
 *   chainType="METAL", operationRaw="1250"        → "METAL 1250"
 *   chainType="METAL", operationRaw="SWIVEL 1000" → "METAL 1000"
 *   chainType="WHITE", operationRaw="SWIVEL 750"  → "WHITE 750"
 *   chainType=""                                   → "" (no chain)
 *   operationRaw="MOTOR"                           → "" (no chain)
 */
export function buildChainName(chainType: string, operationRaw: string): string {
  // col 16 empty → no chain
  if (!chainType) return ""

  const operation = operationRaw.trim().toUpperCase()

  // Motor → no physical chain
  if (operation === "MOTOR") return ""

  // Extract numeric size:
  // - Standard: operationRaw = "500", "1250"
  // - Swivel:   operationRaw = "SWIVEL 1000" → extract 1000
  let size: number | null = null

  if (operation.startsWith("SWIVEL")) {
    const match = operation.match(/SWIVEL\s+(\d+)/i)
    size = match ? parseInt(match[1], 10) : null
  } else {
    const n = parseInt(operation, 10)
    size = Number.isNaN(n) ? null : n
  }

  if (!size || size <= 0) return chainType // fallback: chain type without size

  return `${chainType} ${size}` // e.g. "METAL 500", "WHITE 750"
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

  const finishColour = row.finish.trim().toUpperCase()
  const finishName = buildFinishName(row.finish)
  if (finishName) {
    components.push({
      sourceRow: row.rowNumber,
      category: "Finish",
      itemName: finishName,
      quantity: qty,
      // Finish는 LENGTH 타입: 블라인드 가로 너비(mm) × 수량 = 차감할 길이
      ...(typeof row.width === "number" && !Number.isNaN(row.width)
        ? { lengthMm: row.width * qty }
        : {}),
    })

    // Cap: 레일 양 끝을 막는 캡, 블라인드 1개당 2개 (양쪽 각 1개)
    // 색상만 사용 ("WHITE CAP", not "WHITE FINISH CAP")
    components.push({
      sourceRow: row.rowNumber,
      category: "Cap",
      itemName: `${finishColour} CAP`,
      quantity: qty * 2,
    })
  }

  const chainName = buildChainName(row.chainType, row.operationRaw)
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