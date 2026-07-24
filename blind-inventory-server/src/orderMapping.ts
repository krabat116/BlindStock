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
  /** col 15: "L" or "R" — used for Spring Assist direction */
  sideWdr: string
  /** col 11: "OR" if open-roll — reverses Spring Assist direction */
  roll: string
  qty: number

  /**
   * Optional tube override value from the small blank column
   * next to BLIND NO.
   * Example: "43", "43A"
   */
  tubeOverride?: string | null

  /**
   * True when the BLIND NO cell contains "RESKIN".
   * RESKIN orders are fabric-replacement jobs — only the fabric (AREA type)
   * should be deducted; all other components (finish, chain, winder, pin, tube)
   * are left untouched.
   */
  isReskin?: boolean
}

export type PreviewComponent = {
  sourceRow: number
  category: string
  itemName: string
  quantity: number
  lengthMm?: number // LENGTH 타입 부품의 차감할 총 길이(mm)
  areaMm2?: number  // AREA 타입 부품(천)의 차감할 총 면적(mm²)
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
 * Standard chain lengths stocked by the factory (mm).
 * When a customer orders a non-standard length, the factory cuts down
 * the nearest longer chain, so we snap up to the next available size.
 */
const STANDARD_CHAIN_SIZES_MM = [500, 750, 1000, 1250, 1500, 1750, 2000]
const MAX_CHAIN_SIZE_MM = STANDARD_CHAIN_SIZES_MM[STANDARD_CHAIN_SIZES_MM.length - 1] // 2000
/**
 * Requests within this many mm above the max are filled with a single max chain.
 * e.g. 2050 → just "METAL 2000" (factory cuts 50 mm off)
 * e.g. 2051+ → two chains
 */
const SINGLE_CHAIN_TOLERANCE_MM = 50

/**
 * Returns the smallest standard chain size that is >= requestedMm.
 * If the requested size exceeds all standard sizes, returns the largest.
 */
export function snapChainSize(requestedMm: number): number {
  const fit = STANDARD_CHAIN_SIZES_MM.find((s) => s >= requestedMm)
  return fit ?? MAX_CHAIN_SIZE_MM
}

/**
 * Returns the chain item name(s) needed for the given request.
 *
 * - Standard / near-standard sizes → single item name
 * - Sizes > MAX + TOLERANCE → two item names (max chain + smallest covering remainder)
 *
 * Examples:
 *   "METAL", "900"         → ["METAL 1000"]          (snapped up)
 *   "METAL", "2000"        → ["METAL 2000"]
 *   "METAL", "2050"        → ["METAL 2000"]           (within tolerance)
 *   "METAL", "2100"        → ["METAL 2000", "METAL 500"]
 *   "METAL", "2600"        → ["METAL 2000", "METAL 750"]  (500 < 600, snap to 750? wait:
 *                                                           remainder=600 → snapChainSize(600)=750)
 *   "METAL", "MOTOR"       → []
 *   "",      "500"         → []
 */
export function getChainItemNames(chainType: string, operationRaw: string): string[] {
  if (!chainType) return []

  const operation = operationRaw.trim().toUpperCase()
  if (operation === "MOTOR") return []

  let size: number | null = null

  if (operation.startsWith("SWIVEL")) {
    const match = operation.match(/SWIVEL\s+(\d+)/i)
    size = match ? parseInt(match[1], 10) : null
  } else if (operation.startsWith("SA")) {
    const match = operation.match(/SA\s+(\d+)/i)
    size = match ? parseInt(match[1], 10) : null
  } else {
    const n = parseInt(operation, 10)
    size = Number.isNaN(n) ? null : n
  }

  if (!size || size <= 0) return [chainType] // fallback: type only

  // Single chain range (including tolerance above max)
  if (size <= MAX_CHAIN_SIZE_MM + SINGLE_CHAIN_TOLERANCE_MM) {
    return [`${chainType} ${snapChainSize(size)}`]
  }

  // Two-chain combination: max chain + smallest that covers the remainder
  const remainder = size - MAX_CHAIN_SIZE_MM
  const secondSize = snapChainSize(remainder)
  return [`${chainType} ${MAX_CHAIN_SIZE_MM}`, `${chainType} ${secondSize}`]
}

/**
 * Build the chain item name from the chain material type (col 16)
 * and the chain size extracted from col 14.
 *
 * col 16 (chainType, already normalised): "METAL", "WHITE", or ""
 * col 14 (operationRaw): numeric size, "SWIVEL NNN", or "MOTOR"
 *
 * Non-standard sizes are snapped up to the nearest standard size
 * (e.g. 900 → 1000) because the factory cuts from stock chains.
 *
 * Examples:
 *   chainType="METAL", operationRaw="500"         → "METAL 500"
 *   chainType="METAL", operationRaw="900"         → "METAL 1000"
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
  } else if (operation.startsWith("SA")) {
    // "SA 1250" → Spring Assist + chain size 1250
    const match = operation.match(/SA\s+(\d+)/i)
    size = match ? parseInt(match[1], 10) : null
  } else {
    const n = parseInt(operation, 10)
    size = Number.isNaN(n) ? null : n
  }

  if (!size || size <= 0) return chainType // fallback: chain type without size

  const snapped = snapChainSize(size)
  return `${chainType} ${snapped}` // e.g. "METAL 500", "WHITE 1000" (snapped from 900)
}

/**
 * Returns true when col 14 indicates a Spring Assist is attached.
 * Pattern: "SA NNN" (e.g. "SA 1250")
 */
export function isSpringAssistOperation(operationRaw: string): boolean {
  return /^SA\s+\d+/i.test(operationRaw.trim())
}

/**
 * Spring Assist size guide (from Shadelite Spring Assist Guide chart).
 *
 * Format: [minWidth, minDrop]
 * Sorted descending by minWidth — first matching row wins.
 *
 * WIDTH range   | min DROP for SA
 * 3011+         | 0    (any drop)
 * 2861 – 3010   | 1001
 * 2711 – 2860   | 1201
 * 2561 – 2710   | 1501
 * 2411 – 2560   | 1801
 * 2261 – 2410   | 2101
 * ≤ 2260        | never (no rule)
 */
const SA_SIZE_RULES: Array<[number, number]> = [
  [3011, 0],
  [2861, 1001],
  [2711, 1201],
  [2561, 1501],
  [2411, 1801],
  [2261, 2101],
]

/**
 * Returns true when the blind's width & drop fall in the Spring Assist
 * required zone according to the size guide chart.
 */
export function requiresSpringAssistBySize(
  width: number | null,
  drop: number | null
): boolean {
  if (width === null || drop === null || width <= 0 || drop <= 0) return false
  for (const [minWidth, minDrop] of SA_SIZE_RULES) {
    if (width >= minWidth) return drop >= minDrop
  }
  return false
}

/**
 * Build the Spring Assist item name.
 *
 * Rules:
 *  - componentryColour starts with "S " (e.g. "S WHITE", "S BLACK")
 *      → "S SPRING ASSIST"  (no direction — S-type uses built-in spring)
 *  - plain colour (e.g. "BIRCH", "WHITE")
 *      → direction from sideWdr ("L" = LEFT, "R" = RIGHT)
 *      → if roll === "OR" the direction is reversed
 *      → "SPRING ASSIST LEFT" or "SPRING ASSIST RIGHT"
 */
export function buildSpringAssistName(
  componentryColour: string,
  sideWdr: string,
  roll: string
): string {
  const colour = componentryColour.trim().toUpperCase()
  const side = sideWdr.trim().toUpperCase()
  const rollVal = roll.trim().toUpperCase()

  // S-prefix colour → no direction needed
  if (colour.startsWith("S ")) {
    return "S SPRING ASSIST"
  }

  // Plain colour → derive direction, reversed by OR roll
  let isLeft = side === "L"
  if (rollVal === "OR") isLeft = !isLeft

  return isLeft ? "SPRING ASSIST LEFT" : "SPRING ASSIST RIGHT"
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

/**
 * Some finish colours share a cap with a different-named finish.
 * Key: finish colour (uppercase), Value: cap colour to use instead.
 * e.g. SAHARA finish → BLACK CAP (not SAHARA CAP)
 */
const CAP_COLOUR_OVERRIDES: Record<string, string> = {
  SAHARA: "BLACK",
}

export function mapOrderRowToComponents(row: ParsedOrderRow): PreviewComponent[] {
  // RESKIN orders: fabric replacement only — skip all non-fabric components
  if (row.isReskin) return []

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
    // Some finishes share a cap colour — see CAP_COLOUR_OVERRIDES above.
    const capColour = CAP_COLOUR_OVERRIDES[finishColour] ?? finishColour
    components.push({
      sourceRow: row.rowNumber,
      category: "Cap",
      itemName: `${capColour} CAP`,
      quantity: qty * 2,
    })
  }

  const chainNames = getChainItemNames(row.chainType, row.operationRaw)
  for (const chainName of chainNames) {
    components.push({
      sourceRow: row.rowNumber,
      category: "Chain",
      itemName: chainName,
      quantity: qty,
    })
  }

  // Spring Assist: triggered either by explicit "SA NNN" in operation column
  // or by width/drop falling in the Spring Assist size guide chart.
  const needsSpringAssist =
    isSpringAssistOperation(row.operationRaw) ||
    requiresSpringAssistBySize(row.width, row.drop)

  if (needsSpringAssist) {
    const springAssistName = buildSpringAssistName(
      row.componentryColour,
      row.sideWdr,
      row.roll
    )
    components.push({
      sourceRow: row.rowNumber,
      category: "Spring Assist",
      itemName: springAssistName,
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