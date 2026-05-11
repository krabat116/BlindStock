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

export type ParsedOrderSheetResult = {
  orderSheetNo: number | null
  accountName: string
  totalItems: number
  rows: ParsedOrderRow[]
  bracketComponents: ParsedBracketComponent[]
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
 * Parse a bracket row's material cell into individual bracket components.
 * Example input: "2X S WHITE, 2X S BLACK BRACKETS"
 * → [{ itemName: "S WHITE", quantity: 2 }, { itemName: "S BLACK", quantity: 2 }]
 */
function parseBracketRow(
  rowNumber: number,
  account: string,
  customerName: string,
  materialRaw: string
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

    // Always append BRACKET so names are consistent whether the Excel
    // suffix was present, absent, or misspelled.
    results.push({
      sourceRow: rowNumber,
      account,
      customerName,
      itemName: `${rawName.toUpperCase()} BRACKET`,
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

    // Detect bracket rows: no blind number, but material cell has an "NxX ..." pattern
    if (!blindNo && /\d+\s*[Xx]\s+/i.test(materialRange)) {
      const rowNumber = index + 7
      bracketComponents.push(
        ...parseBracketRow(rowNumber, account, customerName, materialRange)
      )
      return
    }
    const materialColour = toText(
      getValueByAliases(row, columnAliases.materialColour)
    )
    const finish = toText(getValueByAliases(row, columnAliases.finish))
    const componentryColour = toText(
      getValueByAliases(row, columnAliases.componentryColour)
    )
    const chainTypeRaw = toText(getValueByAliases(row, columnAliases.chainType))
    const operationRaw = toText(
      getValueByAliases(row, columnAliases.operationRaw)
    )
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
}



}