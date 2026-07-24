import * as XLSX from "xlsx"
import type { ParsedOrderRow } from "./orderMapping"
import { normalizeItemName } from "./utils/normalize"

type RawRow = Record<string, unknown>

export type ParsedContinuationComponent = {
  sourceRow: number
  account: string
  customerName: string
  itemName: string
  quantity: number
  category: string
}

export type ParsedOrderSheetResult = {
  orderSheetNo: number | null
  accountName: string
  totalItems: number
  rows: ParsedOrderRow[]
  continuationComponents: ParsedContinuationComponent[]
}

const columnAliases = {
  account: ["ACCOUNT"],
  customerName: ["CUSTOMER NAME"],
  blindNo: ["BLIND NO", "ORDER NO.", "ORDER NO"],  // 2016: "ORDER NO."
  /**
   * The small blank column next to BLIND NO usually becomes COLUMN_3
   * after the two-row header build.
   * We also keep a few fallback names in case the Excel format changes later.
   */
  tubeOverride: ["COLUMN_3", "TUBE OVERRIDE", "OVERRIDE"],
  width: ["WIDTH"],
  drop: ["DROP"],
  material: ["MATERIAL RANGE", "MATERIAL"],
  materialColour: ["MATERIAL COLOUR", "COLOUR", "COLOR"],
  finish: ["FINISH"],
  componentryColour: ["COMPONENTRY COLOUR", "ACCESSORIES"],  // 2016: "ACCESSORIES"
  chainType: ["CHN", "CHAIN", "MET CHN"],                   // 2016: "MET CHN"
  operationRaw: ["CHAIN SIZE/ OPERATION", "OPERATION", "CHAIN SIZE"],
  sideWdr: ["SIDE WDR", "SIDE WDR.", "WDR", "SIDE"],
  roll: ["ROLL", "ROL."],                                    // 2016: "ROL."
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
 * Resolve the category for a continuation row.
 * Iterates over user-defined rules; returns the first matching categoryName.
 * Falls back to "Bracket" if no rule matches.
 */
function matchCategory(
  materialRaw: string,
  rules: Array<{ keyword: string; categoryName: string }>
): string {
  const upper = materialRaw.toUpperCase()
  for (const rule of rules) {
    if (upper.includes(rule.keyword.toUpperCase())) return rule.categoryName
  }
  return "Bracket"
}

/**
 * Parse a continuation row's material cell into individual components.
 * Input pattern: "NX ITEM NAME", "NX ITEM NAME, NX ITEM NAME, ..."
 *
 * When category is "Bracket":
 *   - Strips trailing BRACK* word
 *   - Appends "BRACKET" suffix unless the name already contains BRACK* or is a COMBO
 *   - Handles COMBO items with fallback colour
 * For all other categories:
 *   - Uses item name as-is (uppercased)
 */
function parseContinuationRow(
  rowNumber: number,
  account: string,
  customerName: string,
  materialRaw: string,
  category: string,
  fallbackColour: string = ""
): ParsedContinuationComponent[] {
  const results: ParsedContinuationComponent[] = []
  const isBracket = category.toUpperCase() === "BRACKET"

  for (const part of materialRaw.split(",")) {
    const trimmed = part.trim()
    const match = trimmed.match(/^(\d+)\s*[Xx]\s+(.+)$/i)
    if (!match) continue

    const quantity = parseInt(match[1], 10)
    if (!quantity || quantity <= 0) continue

    const rawName = match[2].trim()
    if (!rawName) continue

    let itemName: string

    if (isBracket) {
      // Strip any trailing BRACK* word
      const strippedName = rawName.replace(/\s+BRACK\w*\s*$/i, "").trim()
      if (!strippedName) continue

      const upperName = strippedName.toUpperCase()
      const isCombo = /COMBO/i.test(upperName)
      const alreadyHasBracket = /BRACK/i.test(upperName)

      if (isCombo) {
        const lastWord = upperName.split(/\s+/).pop() ?? ""
        const missingColour = /^COMBOS?$/.test(lastWord)
        if (missingColour && fallbackColour) {
          const colourOnly = fallbackColour.trim().replace(/^S\s+/i, "").toUpperCase()
          itemName = `${upperName} ${colourOnly}`
        } else {
          itemName = upperName
        }
      } else if (alreadyHasBracket) {
        itemName = upperName
      } else {
        itemName = `${upperName} BRACKET`
      }
    } else {
      // Non-bracket items: normalize abbreviations and plural forms
      itemName = normalizeItemName(rawName)
    }

    results.push({ sourceRow: rowNumber, account, customerName, itemName, quantity, category })
  }

  return results
}

/**
 * 헤더 행 자동 감지.
 * "WIDTH"와 "DROP"이 모두 포함된 행을 headerRow2로 간주하고,
 * 그 직전 행을 headerRow1로 사용한다.
 * 최대 25행까지 스캔하며, 찾지 못하면 기존 기본값(index 4/5)을 반환한다.
 */
function detectHeaderRowIndices(rows: unknown[][]): { idx1: number; idx2: number } {
  const KEY_COLS = ["WIDTH", "DROP"]
  for (let i = 1; i < Math.min(rows.length, 25); i++) {
    const normalized = (rows[i] ?? []).map((v) => normalizeHeader(v))
    const hasAll = KEY_COLS.every((key) => normalized.some((h) => h === key))
    if (hasAll) return { idx1: Math.max(0, i - 1), idx2: i }
  }
  // 감지 실패 시 기존 기본값
  return { idx1: 4, idx2: 5 }
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


export function parseRecentOrderSheet(
  buffer: Buffer,
  rules: Array<{ keyword: string; categoryName: string }> = []
): ParsedOrderSheetResult {
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]

  // Get all rows as arrays
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  })

  // 헤더 행 자동 감지 (WIDTH + DROP 키워드 기준)
  const { idx1, idx2 } = detectHeaderRowIndices(rows)
  const headerRow1 = rows[idx1] ?? []
  const headerRow2 = rows[idx2] ?? []
  const dataStartIdx = idx2 + 1
  const dataRows = rows.slice(dataStartIdx)

  const headers = buildHeadersFromTwoRows(headerRow1, headerRow2)

  const normalizedRows: RawRow[] = dataRows.map((row) => {
    const record: RawRow = {}

    headers.forEach((header, index) => {
      record[header] = row[index] ?? ""
    })

    return record
  })

  const parsedRows: ParsedOrderRow[] = []
  const continuationComponents: ParsedContinuationComponent[] = []

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
      const rowNumber = index + dataStartIdx + 1 // 1-based Excel row number
      const category = matchCategory(materialRange, rules)
      // "IGNORE" is a reserved category name — skip this row entirely
      if (category.toUpperCase() === "IGNORE") return
      continuationComponents.push(
        ...parseContinuationRow(rowNumber, account, customerName, materialRange, category, lastComponentryColour)
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

    const isReskin = /RESKIN/i.test(blindNo)

    parsedRows.push({
      rowNumber: index + dataStartIdx + 1, // 1-based Excel row number
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
      isReskin,
    })
  })

  const orderSheetNo = extractOrderSheetNo(rows)
  const accountName = parsedRows[0]?.account ?? ""
  const totalItems = parsedRows.reduce((sum, row) => sum + row.qty, 0)

  return {
    orderSheetNo,
    accountName,
    totalItems,
    rows: parsedRows,
    continuationComponents,
  }
}
