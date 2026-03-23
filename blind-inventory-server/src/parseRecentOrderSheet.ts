import * as XLSX from "xlsx"
import type { ParsedOrderRow } from "./orderMapping"

type RawRow = Record<string, unknown>

const columnAliases = {
  account: ["ACCOUNT"],
  customerName: ["CUSTOMER NAME"],
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
    M: "METAL CHAIN",
    W: "WHITE CHAIN",
    B: "BLACK CHAIN",
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
    return `COLUMN_${index}`
  })
}

export function parseRecentOrderSheet(buffer: Buffer): ParsedOrderRow[] {
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

  normalizedRows.forEach((row, index) => {
    const account = toText(getValueByAliases(row, columnAliases.account))
    const customerName = toText(
      getValueByAliases(row, columnAliases.customerName)
    )
    const materialRange = toText(
      getValueByAliases(row, columnAliases.material)
    )
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
      width ||
      drop ||
      qtyRaw

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
    })
  })

  console.log("🧾 Parsed order rows:", parsedRows)

  return parsedRows
}