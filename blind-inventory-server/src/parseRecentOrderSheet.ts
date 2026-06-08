import * as XLSX from "xlsx"
import type { ParsedOrderRow } from "./orderMapping"

type RawRow = Record<string, unknown>

export type ParsedBracketComponent = {
  sourceRow: number
  account: string
  customerName: string
  itemName: string
  quantity: number
}

export type ParsedMotorComponent = {
  sourceRow: number
  account: string
  customerName: string
  itemName: string
  quantity: number
}

export type ParsedOrderSheetResult = {
  orderSheetNo: number | null
  accountName: string
  totalItems: number
  rows: ParsedOrderRow[]
  bracketComponents: ParsedBracketComponent[]
  motorComponents: ParsedMotorComponent[]
}

const columnAliases = {
  account: ["ACCOUNT"],
  customerName: ["CUSTOMER NAME"],
  blindNo: ["BLIND NO"],
  /**
   * The small blank column next to BLIND NO usually becomes COLUMN_3
   * after the two-row header build.
   * We also keep a few fallback names in case the Excel format changes later.
   */
  tubeOverride: ["COLUMN_3", "TUBE OVERRIDE", "OVERRIDE"],
  width: ["WIDTH"],
  drop: ["DROP"],
  material: ["MATERIAL RANGE", "MATERIAL"],
  materialColour: ["MATERIAL COLOUR"],
  finish: ["FINISH"],
  componentryColour: ["COMPONENTRY COLOUR"],
  chainType: ["CHN", "CHAIN"],
  operationRaw: ["CHAIN SIZE/ OPERATION", "OPERATION", "CHAIN SIZE"],
  sideWdr: ["SIDE WDR", "SIDE WDR.", "WDR", "SIDE"],
  roll: ["ROLL"],
  qty: ["QTY", "QUANTITY"],
}

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function toText(value: unknown) {
  return String(value ?? "").trim()
}

function normalizeChainType(chainTypeRaw: string) {
  const value = chainTypeRaw.trim().toUpperCase()

  if (!value || value === "-" || value === "N/A" || value === "NA") {
    return ""
  }

  const chainTypeMap: Record<string, string> = {
    M: "METAL",
    W: "WHITE",
    B: "BLACK",
    C: "CREAM",
    S: "STAINLESS",
    SS: "STAINLESS",
  }

  return chainTypeMap[value] ?? value
}

function getValueByAliases(row: RawRow, aliases: string[]) {
  for (const alias of aliases) {
    const foundKey = Object.keys(row).find(
      (key) => normalizeHeader(key) === normalizeHeader(alias)
    )
    if (foundKey) return row[foundKey]
  }

  return ""
}

function buildHeadersFromTwoRows(row1: unknown[], row2: unknown[]) {
  const maxLength = Math.max(row1.length, row2.length)

  return Array.from({ length: maxLength }, (_, index) => {
    const top = normalizeHeader(row1[index])
    const bottom = normalizeHeader(row2[index])

    if (top && bottom) return `${top} ${bottom}`
    if (top) return top
    if (bottom) return bottom

    // Blank header cells become COLUMN_n
    return `COLUMN_${index}`
  })
}

/**
 * Keywords that identify a continuation row as motor accessories
 * rather than bracket accessories.
 */
const MOTOR_KEYWORDS = /MOTOR|REMOTE|CHARGER|CABLE|BATTERY|RECEIVER/i

/**
 * Parse a motor accessory row's material cell into individual components.
 * Example input: "1X LI-ION 1.1 MOTOR"  →  [{ itemName: "LI-ION 1.1 MOTOR", quantity: 1 }]
 * Example input: "1X AC/DC CHARGER"      →  [{ itemName: "AC/DC CHARGER",    quantity: 1 }]
 */
function parseMotorRow(
  rowNumber: number,
  account: string,
  customerName: string,
  materialRaw: string
): ParsedMotorComponent[] {
  const results: ParsedMotorComponent[] = []

  for (const part of materialRaw.split(",")) {
    const trimmed = part.trim()
    const match = trimmed.match(/^(\d+)\s*[Xx]\s+(.+)$/i)
    if (!match) continue

    const quantity = parseInt(match[1], 10)
    if (!quantity || quantity <= 0) continue

    const itemName = match[2].trim().toUpperCase()
    if (!itemName) continue

    results.push({ sourceRow: rowNumber, account, customerName, itemName, quantity })
  }

  return results
}

/**
 * Parse a bracket row's material cell into individual bracket components.
 * Example input: "2X S WHITE, 2X S BLACK BRACKETS"
 * → [{ itemName: "S WHITE", quantity: 2 }, { itemName: "S BLACK", quantity: 2 }]
 */
function parseBracketRow(
  rowNumber: number,
  account: string,
  customerName: string,
  materialRaw: string,
  fallbackColour: string = ""
): ParsedBracketComponent[] {
  const results: ParsedBracketComponent[] = []

  const parts = materialRaw.split(",")

  for (const part of parts) {
    const trimmed = part.trim()
    const match = trimmed.match(/^(\d+)\s*[Xx]\s+(.+)$/i)
    if (!match) continue

    const quantity = parseInt(match[1], 10)
    if (!quantity || quantity <= 0) continue

    // Strip any word starting with "BRACK" at the end.
    // Handles BRACKET, BRACKETS, and typos like BRACKTES.
    const rawName = match[2].trim().replace(/\s+BRACK\w*\s*$/i, "").trim()
    if (!rawName) continue

    const upperName = rawName.toUpperCase()

    // Combo brackets already carry a descriptive product name (e.g. "LHS SLIMLINE COMBOS BLACK")
    // so appending "BRACKET" would be redundant. Standard colour-only brackets
    // (e.g. "S WHITE") need the suffix to stay distinct from other colour-named items.
    // Names that already contain "BRACKET/BRACKETS" anywhere (e.g. "EXTENDED BRACKETS WHITE")
    // also don't need the suffix appended again.
    const isCombo = /COMBO/i.test(rawName)
    const alreadyHasBracket = /BRACK/i.test(rawName)

    let itemName: string
    if (isCombo) {
      // If the combo name ends with "COMBO" or "COMBOS" (no colour appended by the admin),
      // derive the colour from the last seen componentry colour on a blind row.
      // "S WHITE" → strip leading "S " → "WHITE"; "S BLACK" → "BLACK"; "WHITE" → "WHITE"
      const lastWord = upperName.split(/\s+/).pop() ?? ""
      const missingColour = /^COMBOS?$/.test(lastWord)
      if (missingColour && fallbackColour) {
        const colourOnly = fallbackColour.trim().replace(/^S\s+/i, "").toUpperCase()
        itemName = `${upperName} ${colourOnly}`
      } else {
        itemName = upperName
      }
    } else if (alreadyHasBracket) {
      // Name already contains BRACKET/BRACKETS — use as-is
      itemName = upperName
    } else {
      itemName = `${upperName} BRACKET`
    }

    results.push({
      sourceRow: rowNumber,
      account,
      customerName,
      itemName,
      quantity,
    })
  }

  return results
}

function extractOrderSheetNo(rows: unknown[][]): number | null {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] ?? []

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cell = normalizeHeader(row[colIndex])

      // Accept both "ORDER SHEET NO" and "ORDER SHEET NO."
      if (
        cell === "ORDER SHEET NO" ||
        cell === "ORDER SHEET NO."
      ) {
        // 1) Try the cell to the right
        const rightValue = row[colIndex + 1]
        const rightNumber = toNumber(rightValue)
        if (rightNumber !== null) {
          return rightNumber
        }

        // 2) Try the cell directly below
        const nextRow = rows[rowIndex + 1] ?? []
        const belowValue = nextRow[colIndex]
        const belowNumber = toNumber(belowValue)
        if (belowNumber !== null) {
          return belowNumber
        }

        // 3) Optional fallback: try below-right
        const belowRightValue = nextRow[colIndex + 1]
        const belowRightNumber = toNumber(belowRightValue)
        if (belowRightNumber !== null) {
          return belowRightNumber
        }
      }
    }
  }

  return null
}


export function parseRecentOrderSheet(buffer: Buffer): ParsedOrderSheetResult {
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]

  // Get all rows as arrays
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  })

  // Based on your uploaded file:
  // row index 4 => Excel row 5
  // row index 5 => Excel row 6
  // row index 6 => Excel row 7 (first data row)
  const headerRow1 = rows[4] ?? []
  const headerRow2 = rows[5] ?? []
  const dataRows = rows.slice(6)

  const headers = buildHeadersFromTwoRows(headerRow1, headerRow2)

  console.log("🧾 Combined headers:", headers)

  const normalizedRows: RawRow[] = dataRows.map((row) => {
    const record: RawRow = {}

    headers.forEach((header, index) => {
      record[header] = row[index] ?? ""
    })

    return record
  })

  console.log("🧾 First normalized row:", normalizedRows[0])

  const parsedRows: ParsedOrderRow[] = []
  const bracketComponents: ParsedBracketComponent[] = []
  const motorComponents: ParsedMotorComponent[] = []

  // Track the most recent componentry colour seen on a blind row.
  // Used as fallback when a bracket/combo row has no colour in its material text.
  let lastComponentryColour = ""

  normalizedRows.forEach((row, index) => {
    const account = toText(getValueByAliases(row, columnAliases.account))
    const customerName = toText(
      getValueByAliases(row, columnAliases.customerName)
    )

    const blindNo = toText(getValueByAliases(row, columnAliases.blindNo))

    /**
     * Reads the small blank column next to BLIND NO.
     * Example values: "43", "43A"
     */
    const tubeOverrideRaw = toText(
      getValueByAliases(row, columnAliases.tubeOverride)
    )
    const tubeOverride = tubeOverrideRaw || null

    const materialRange = toText(
      getValueByAliases(row, columnAliases.material)
    )

    // Detect continuation rows: no blind number, but material cell has an "NxX ..." pattern
    if (!blindNo && /\d+\s*[Xx]\s+/i.test(materialRange)) {
      const rowNumber = index + 7
      if (MOTOR_KEYWORDS.test(materialRange)) {
        motorComponents.push(
          ...parseMotorRow(rowNumber, account, customerName, materialRange)
        )
      } else {
        bracketComponents.push(
          ...parseBracketRow(rowNumber, account, customerName, materialRange, lastComponentryColour)
        )
      }
      return
    }
    const materialColour = toText(
      getValueByAliases(row, columnAliases.materialColour)
    )
    const finish = toText(getValueByAliases(row, columnAliases.finish))
    const componentryColour = toText(
      getValueByAliases(row, columnAliases.componentryColour)
    )
    // Keep track of the latest componentry colour for bracket fallback
    if (componentryColour) lastComponentryColour = componentryColour

    const chainTypeRaw = toText(getValueByAliases(row, columnAliases.chainType))
    const operationRaw = toText(
      getValueByAliases(row, columnAliases.operationRaw)
    )
    const sideWdr = toText(getValueByAliases(row, columnAliases.sideWdr))
    const roll = toText(getValueByAliases(row, columnAliases.roll))
    const width = toNumber(getValueByAliases(row, columnAliases.width))
    const drop = toNumber(getValueByAliases(row, columnAliases.drop))
    const qtyRaw = toNumber(getValueByAliases(row, columnAliases.qty))

    // combine material range + colour into one material name
    const material = [materialRange, materialColour]
      .filter(Boolean)
      .join(" ")
      .trim()

    // map chain shorthand if needed
    const chainType = normalizeChainType(chainTypeRaw)

    const hasMeaningfulOrderData =
      material ||
      finish ||
      componentryColour ||
      chainType ||
      operationRaw ||
      blindNo ||
      tubeOverride ||
      width !== null ||
      drop !== null ||
      qtyRaw !== null

    if (!hasMeaningfulOrderData) return

    parsedRows.push({
      rowNumber: index + 7, // since data starts at Excel row 7
      account,
      customerName,
      width,
      drop,
      material,
      finish,
      componentryColour,
      chainType,
      operationRaw,
      sideWdr,
      roll,
      qty: qtyRaw && qtyRaw > 0 ? qtyRaw : 1,
      tubeOverride,
    })
  })

  console.log("🧾 Parsed order rows:", parsedRows)

  // return parsedRows
  const orderSheetNo = extractOrderSheetNo(rows)
  console.log("🧾 Extracted orderSheetNo:", orderSheetNo)
const accountName = parsedRows[0]?.account ?? ""
const totalItems = parsedRows.reduce((sum, row) => sum + row.qty, 0)

return {
  orderSheetNo,
  accountName,
  totalItems,
  rows: parsedRows,
  bracketComponents,
  motorComponents,
}



}