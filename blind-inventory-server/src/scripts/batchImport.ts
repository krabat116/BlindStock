/**
 * BlindStock — Historical Batch Import Script
 *
 * 폴더 구조 (예시):
 *   <rootDir>/2019/Past Month/January/order1.xlsx
 *   <rootDir>/2019/Past Month/February/order2.xlsx
 *   <rootDir>/2020/Past Month/January/...
 *
 * 사용법 (blind-inventory-server/ 디렉터리에서):
 *   npx tsx src/scripts/batchImport.ts /절대경로/엑셀폴더
 *   npx tsx src/scripts/batchImport.ts /절대경로/엑셀폴더 --dry-run
 *
 * 동작:
 *   - 폴더에서 연도·월을 자동 추출
 *   - continuationRules / dbItems를 시작 시 한 번만 로드 (파일마다 재조회 X)
 *   - 미싱 아이템 자동 생성 (dry-run 모드에서는 생성 안 함)
 *   - 재고 부족 무시하고 강제 차감 (이력 데이터)
 *   - 중복 발주서는 스킵
 *   - 완료 후 처리 결과 요약 출력
 */

import fs from "fs"
import path from "path"
import prisma from "../lib/prisma"
import { parseRecentOrderSheet } from "../parseRecentOrderSheet"
import { mapOrderRowToComponents } from "../orderMapping"
import { computeFabricAreaMm2, ROLL_WIDTH_MM } from "../fabricPacking"
import { normalizeCategoryName, normalizeItemName } from "../utils/normalize"
import { bulkCreateMissingItems } from "../services/itemService"

// ── 월 이름 → 숫자 매핑 ────────────────────────────────────────────────────
const MONTH_MAP: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

// ORDER SHEET NO 가 Excel에서 추출되지 않을 때 사용하는 음수 카운터
let nullSheetNoCounter = -1

// ── 타입 정의 ──────────────────────────────────────────────────────────────
interface FileEntry {
  filePath: string
  year: number
  month: number
}

type ProcessStatus = "success" | "skipped" | "duplicate" | "error" | "dry-run"

interface ProcessResult extends FileEntry {
  fileName: string
  status: ProcessStatus
  reason?: string
  accountName?: string
  orderSheetNo?: number
  parsedRows?: number
  totalItems?: number
  createdItems?: number
  deductedComponents?: number
}

interface PreviewItem {
  category: string
  itemName: string
  quantity: number
  lengthMm: number | null
  areaMm2: number | null
  sourceRows: number[]
  matched: boolean
  stockType: string
  itemId: number | null
}

// DB 아이템 캐시 타입 (category 관계 포함)
type DbItem = Awaited<ReturnType<typeof prisma.item.findMany<{ include: { category: true } }>>>[number]

// ── 폴더 탐색 ──────────────────────────────────────────────────────────────
function discoverFiles(rootDir: string): FileEntry[] {
  const entries: FileEntry[] = []

  if (!fs.existsSync(rootDir)) {
    throw new Error(`rootDir가 존재하지 않습니다: ${rootDir}`)
  }

  const yearDirs = fs.readdirSync(rootDir, { withFileTypes: true }).filter((d) => d.isDirectory())

  for (const yearDir of yearDirs) {
    const year = parseInt(yearDir.name, 10)
    if (isNaN(year) || year < 2000 || year > 2100) continue

    // "Past Month" 또는 "Past Months" 둘 다 허용
    const pastMonthPath =
      fs.existsSync(path.join(rootDir, yearDir.name, "Past Months"))
        ? path.join(rootDir, yearDir.name, "Past Months")
        : path.join(rootDir, yearDir.name, "Past Month")
    if (!fs.existsSync(pastMonthPath)) continue

    const monthDirs = fs.readdirSync(pastMonthPath, { withFileTypes: true }).filter((d) => d.isDirectory())

    for (const monthDir of monthDirs) {
      const month = MONTH_MAP[monthDir.name.toLowerCase()]
      if (!month) {
        console.warn(`[WARN] 인식되지 않는 월 폴더: ${monthDir.name} (무시)`)
        continue
      }

      const monthPath = path.join(pastMonthPath, monthDir.name)
      const files = fs
        .readdirSync(monthPath)
        .filter(
          (f) =>
            f.toLowerCase().endsWith(".xlsx") &&
            !f.startsWith("~$") &&
            !f.startsWith("._") // macOS 리소스 포크 파일 제외
        )

      for (const file of files) {
        entries.push({ filePath: path.join(monthPath, file), year, month })
      }
    }
  }

  entries.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    if (a.month !== b.month) return a.month - b.month
    return path.basename(a.filePath).localeCompare(path.basename(b.filePath), undefined, { numeric: true })
  })

  return entries
}

// ── 미리보기 빌드 ──────────────────────────────────────────────────────────
/**
 * dbItems를 외부에서 받아 매칭한다 (파일마다 DB 재조회 없음).
 */
function buildPreview(
  parsed: Awaited<ReturnType<typeof parseRecentOrderSheet>>,
  dbItems: DbItem[]
): PreviewItem[] {
  const flatComponents = parsed.rows.flatMap(mapOrderRowToComponents)
  const continuationComponents = parsed.continuationComponents.map((cc) => ({
    sourceRow: cc.sourceRow,
    category: cc.category,
    itemName: cc.itemName,
    quantity: cc.quantity,
    lengthMm: undefined as number | undefined,
    areaMm2: undefined as number | undefined,
  }))

  const allComponents = [...flatComponents, ...continuationComponents]

  // 카테고리::아이템명으로 집계
  const aggregatedMap = new Map<
    string,
    { category: string; itemName: string; quantity: number; totalLengthMm: number; sourceRows: number[] }
  >()

  for (const comp of allComponents) {
    const key = `${comp.category}::${comp.itemName}`
    if (!aggregatedMap.has(key)) {
      aggregatedMap.set(key, { category: comp.category, itemName: comp.itemName, quantity: 0, totalLengthMm: 0, sourceRows: [] })
    }
    const agg = aggregatedMap.get(key)!
    agg.quantity += comp.quantity
    agg.totalLengthMm += comp.lengthMm ?? 0
    agg.sourceRows.push(comp.sourceRow)
  }

  const aggregated = Array.from(aggregatedMap.values())

  // 원단(Fabric) — FFDH strip-packing으로 면적 계산
  const materialGroupMap = new Map<
    string,
    { blinds: Array<{ widthMm: number; dropMm: number }>; sourceRows: number[] }
  >()

  for (const row of parsed.rows) {
    if (!row.material || row.width === null || row.drop === null) continue
    const materialName = row.material.trim().toUpperCase()
    if (!materialName) continue
    if (!materialGroupMap.has(materialName)) {
      materialGroupMap.set(materialName, { blinds: [], sourceRows: [] })
    }
    const group = materialGroupMap.get(materialName)!
    group.sourceRows.push(row.rowNumber)
    const qty = row.qty > 0 ? row.qty : 1
    for (let i = 0; i < qty; i++) {
      group.blinds.push({ widthMm: row.width!, dropMm: row.drop! })
    }
  }

  const LENGTH_CATEGORIES = new Set(["Finish", "Tube"])
  const AREA_CATEGORIES = new Set(["Fabric"])

  const regularItems: PreviewItem[] = aggregated.map((comp) => {
    const matched = dbItems.find(
      (item) =>
        normalizeItemName(item.name) === normalizeItemName(comp.itemName) &&
        normalizeCategoryName(item.category.name) === normalizeCategoryName(comp.category)
    )
    const inferredType = LENGTH_CATEGORIES.has(comp.category) ? "LENGTH" : "COUNT"
    return {
      category: comp.category,
      itemName: comp.itemName,
      quantity: comp.quantity,
      lengthMm: comp.totalLengthMm > 0 ? comp.totalLengthMm : null,
      areaMm2: null,
      sourceRows: comp.sourceRows,
      matched: Boolean(matched),
      stockType: matched?.stockType ?? inferredType,
      itemId: matched?.id ?? null,
    }
  })

  const fabricItems: PreviewItem[] = Array.from(materialGroupMap.entries()).map(
    ([materialName, { blinds, sourceRows }]) => {
      const matched = dbItems.find(
        (item) =>
          normalizeItemName(item.name) === normalizeItemName(materialName) &&
          normalizeCategoryName(item.category.name) === "FABRIC"
      )
      const rollWidthMm = matched?.rollWidthMm ?? ROLL_WIDTH_MM
      const inferredType = AREA_CATEGORIES.has("Fabric") ? "AREA" : "COUNT"
      return {
        category: "Fabric",
        itemName: materialName,
        quantity: blinds.length,
        lengthMm: null,
        areaMm2: computeFabricAreaMm2(blinds, rollWidthMm),
        sourceRows,
        matched: Boolean(matched),
        stockType: matched?.stockType ?? inferredType,
        itemId: matched?.id ?? null,
      }
    }
  )

  return [...regularItems, ...fabricItems]
}

// ── 강제 재고 차감 ─────────────────────────────────────────────────────────
async function forceDeductOrder(params: {
  year: number
  month: number
  fileName: string
  accountName: string
  orderSheetNo: number
  totalItems: number
  previewItems: Array<{
    itemId: number
    itemName: string
    category: string
    quantity: number
    lengthMm: number | null
    areaMm2: number | null
    sourceRows: number[]
    stockType: string
  }>
}): Promise<{ status: "success" | "duplicate" }> {
  const { year, month, fileName, accountName, orderSheetNo, totalItems, previewItems } = params

  return await prisma.$transaction(
    async (tx) => {
      const existing = await tx.customerOrder.findUnique({
        where: { orderYear_orderSheetNo: { orderYear: year, orderSheetNo } },
      })
      if (existing) return { status: "duplicate" as const }

      let customer = await tx.customer.findUnique({ where: { accountName } })
      if (!customer) {
        customer = await tx.customer.create({ data: { accountName } })
      }

      await tx.customerOrder.create({
        data: {
          customerId: customer.id,
          orderYear: year,
          orderMonth: month,
          orderSheetNo,
          totalItems,
          fileName,
          status: "COMPLETED",
        },
      })

      const source = `${year}/${String(month).padStart(2, "0")} · #${orderSheetNo}`

      // 모든 아이템 업데이트 + 거래 기록을 병렬로 처리 (순서 의존성 없음)
      await Promise.all(
        previewItems.map(async (item) => {
          const note = `Historical import (rows: ${item.sourceRows.join(", ")})`

          if (item.stockType === "LENGTH" && item.lengthMm) {
            await Promise.all([
              tx.item.update({ where: { id: item.itemId }, data: { totalLengthMm: { decrement: item.lengthMm } } }),
              tx.transaction.create({ data: { itemId: item.itemId, type: "out", lengthMm: item.lengthMm, source, note } }),
            ])
          } else if (item.stockType === "AREA" && item.areaMm2) {
            await Promise.all([
              tx.item.update({ where: { id: item.itemId }, data: { totalAreaMm2: { decrement: item.areaMm2 } } }),
              tx.transaction.create({ data: { itemId: item.itemId, type: "out", areaMm2: item.areaMm2, source, note } }),
            ])
          } else {
            await Promise.all([
              tx.item.update({ where: { id: item.itemId }, data: { quantity: { decrement: item.quantity } } }),
              tx.transaction.create({ data: { itemId: item.itemId, type: "out", quantity: item.quantity, source, note } }),
            ])
          }
        })
      )

      return { status: "success" as const }
    },
    { timeout: 120000 }  // 30s → 120s: 대형 발주서 대응
  )
}

// ── 파일 1개 처리 ──────────────────────────────────────────────────────────
/**
 * dbItems 배열은 참조(reference)로 전달된다.
 * 미싱 아이템이 생성되면 새 아이템만 DB에서 조회해 배열에 push하여 캐시를 증분 갱신한다.
 * → 전체 재로드 없이 즉시 재매칭 가능.
 */
async function processFile(
  entry: FileEntry,
  isDryRun: boolean,
  rules: Awaited<ReturnType<typeof prisma.continuationRowRule.findMany>>,
  dbItems: DbItem[]
): Promise<ProcessResult> {
  const { filePath, year, month } = entry
  const fileName = path.basename(filePath)
  const base: Omit<ProcessResult, "status"> = { filePath, fileName, year, month }

  try {
    const buffer = fs.readFileSync(filePath)
    const parsed = parseRecentOrderSheet(buffer, rules)

    if (parsed.rows.length === 0 && parsed.continuationComponents.length === 0) {
      return { ...base, status: "skipped", reason: "파싱된 행 없음" }
    }

    // 대소문자 혼용 방지: "Bayview" / "BAYVIEW" → 동일 고객으로 처리
    const accountName = (parsed.accountName || `[파일명: ${fileName}]`).trim().toUpperCase()

    // 미리보기 빌드 (캐시된 dbItems 사용)
    let preview = buildPreview(parsed, dbItems)

    // 미싱 아이템 처리
    const missing = preview.filter((p) => !p.matched)

    if (missing.length > 0 && !isDryRun) {
      // 실제 실행 모드: 미싱 아이템 생성
      await bulkCreateMissingItems(missing.map((m) => ({ category: m.category, itemName: m.itemName })))

      // 전체 재로드 대신, 새로 생성된 아이템만 부분 로드하여 캐시에 추가
      const existingIds = new Set(dbItems.map((i) => i.id))
      const newItems = await prisma.item.findMany({
        where: {
          OR: missing.map((m) => ({
            name: m.itemName,
            category: { name: normalizeCategoryName(m.category) },
          })),
        },
        include: { category: true },
      })
      for (const item of newItems) {
        if (!existingIds.has(item.id)) {
          dbItems.push(item)   // 참조 배열 직접 갱신 → main()의 캐시에도 반영됨
          existingIds.add(item.id)
        }
      }

      // 새 아이템이 추가됐으므로 preview 재빌드
      preview = buildPreview(parsed, dbItems)
    }

    // dry-run: DB 변경 없이 예상 결과만 반환
    if (isDryRun) {
      const orderSheetNo = parsed.orderSheetNo ?? nullSheetNoCounter--
      return {
        ...base,
        status: "dry-run",
        accountName,
        orderSheetNo,
        parsedRows: parsed.rows.length,
        totalItems: parsed.totalItems,
        createdItems: missing.length,
        deductedComponents: preview.filter((p) => p.matched).length,
      }
    }

    const deductionItems = preview
      .filter((p) => p.matched && p.itemId !== null)
      .map((p) => ({
        itemId: p.itemId!,
        itemName: p.itemName,
        category: p.category,
        quantity: p.quantity,
        lengthMm: p.lengthMm,
        areaMm2: p.areaMm2,
        sourceRows: p.sourceRows,
        stockType: p.stockType,
      }))

    if (deductionItems.length === 0) {
      return { ...base, status: "skipped", reason: "매칭된 아이템 없음", accountName, parsedRows: parsed.rows.length, totalItems: parsed.totalItems }
    }

    const orderSheetNo = parsed.orderSheetNo ?? (nullSheetNoCounter--)

    const deductResult = await forceDeductOrder({
      year, month, fileName, accountName,
      orderSheetNo,
      totalItems: parsed.totalItems,
      previewItems: deductionItems,
    })

    if (deductResult.status === "duplicate") {
      return { ...base, status: "duplicate", reason: `year=${year} orderSheetNo=${orderSheetNo} 중복`, accountName, orderSheetNo }
    }

    return {
      ...base,
      status: "success",
      accountName,
      orderSheetNo,
      parsedRows: parsed.rows.length,
      totalItems: parsed.totalItems,
      createdItems: missing.length,
      deductedComponents: deductionItems.length,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ...base, status: "error", reason: message }
  }
}

// ── 요약 출력 ──────────────────────────────────────────────────────────────
function printSummary(results: ProcessResult[]) {
  const success = results.filter((r) => r.status === "success")
  const dryRun = results.filter((r) => r.status === "dry-run")
  const skipped = results.filter((r) => r.status === "skipped")
  const duplicate = results.filter((r) => r.status === "duplicate")
  const errors = results.filter((r) => r.status === "error")

  console.log("\n" + "=".repeat(70))
  console.log("BlindStock 일괄 임포트 결과")
  console.log("=".repeat(70))
  console.log(`총 파일:       ${results.length}개`)
  console.log(`성공:          ${success.length}개`)
  if (dryRun.length > 0) console.log(`Dry-run:       ${dryRun.length}개`)
  console.log(`스킵:          ${skipped.length}개`)
  console.log(`중복 (스킵):   ${duplicate.length}개`)
  console.log(`오류:          ${errors.length}개`)

  const target = success.length > 0 ? success : dryRun
  if (target.length > 0) {
    const totalDeducted = target.reduce((s, r) => s + (r.deductedComponents ?? 0), 0)
    const totalCreated = target.reduce((s, r) => s + (r.createdItems ?? 0), 0)
    console.log(`차감 항목:     ${totalDeducted}개`)
    if (totalCreated > 0) console.log(`신규 생성 예정: ${totalCreated}개 아이템`)
  }

  if (errors.length > 0) {
    console.log("\n[오류 목록]")
    for (const r of errors) {
      console.log(`  ${r.year}/${String(r.month).padStart(2, "0")} ${r.fileName}`)
      console.log(`    → ${r.reason}`)
    }
  }

  if (skipped.length > 0) {
    console.log("\n[스킵 목록]")
    for (const r of skipped) {
      console.log(`  ${r.year}/${String(r.month).padStart(2, "0")} ${r.fileName} — ${r.reason}`)
    }
  }

  if (duplicate.length > 0) {
    console.log("\n[중복 목록]")
    for (const r of duplicate) {
      console.log(`  ${r.year}/${String(r.month).padStart(2, "0")} ${r.fileName} — ${r.reason}`)
    }
  }

  console.log("=".repeat(70))
}

// ── 진입점 ─────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes("--dry-run")
  const rootDir = args.find((a) => !a.startsWith("--"))

  // --from-year=2017  또는  --from-year 2017
  const fromYearArg = args.find((a) => a.startsWith("--from-year"))
  let fromYear: number | null = null
  if (fromYearArg) {
    const val = fromYearArg.includes("=") ? fromYearArg.split("=")[1] : args[args.indexOf(fromYearArg) + 1]
    fromYear = parseInt(val, 10)
    if (isNaN(fromYear)) { console.error("--from-year 값이 올바르지 않습니다."); process.exit(1) }
  }

  // --to-year=2020
  const toYearArg = args.find((a) => a.startsWith("--to-year"))
  let toYear: number | null = null
  if (toYearArg) {
    const val = toYearArg.includes("=") ? toYearArg.split("=")[1] : args[args.indexOf(toYearArg) + 1]
    toYear = parseInt(val, 10)
    if (isNaN(toYear)) { console.error("--to-year 값이 올바르지 않습니다."); process.exit(1) }
  }

  if (!rootDir) {
    console.error("사용법: npx tsx src/scripts/batchImport.ts <엑셀폴더경로> [--dry-run] [--from-year=YYYY] [--to-year=YYYY]")
    process.exit(1)
  }

  console.log(`\nBlindStock 일괄 임포트${isDryRun ? " (DRY-RUN 모드 — DB 변경 없음)" : ""}`)
  console.log(`폴더: ${path.resolve(rootDir)}`)
  if (fromYear) console.log(`연도 필터: ${fromYear}년 이후`)
  if (toYear) console.log(`연도 필터: ${toYear}년 이전`)
  console.log()

  let files: FileEntry[]
  try {
    files = discoverFiles(path.resolve(rootDir))
    if (fromYear) files = files.filter((f) => f.year >= fromYear!)
    if (toYear)   files = files.filter((f) => f.year <= toYear!)
  } catch (err) {
    console.error(`폴더 탐색 오류: ${err instanceof Error ? err.message : err}`)
    process.exit(1)
  }

  if (files.length === 0) {
    console.log("처리할 xlsx 파일이 없습니다.")
    console.log("폴더 구조 예시: <rootDir>/2019/Past Months/January/order.xlsx")
    process.exit(0)
  }

  console.log(`발견된 파일: ${files.length}개`)

  // continuationRules와 dbItems를 시작 시 한 번만 로드
  console.log("DB 아이템 목록 로드 중...")
  let rules = await prisma.continuationRowRule.findMany()
  let dbItems = await prisma.item.findMany({ include: { category: true } })
  console.log(`아이템 ${dbItems.length}개 로드 완료\n`)

  const results: ProcessResult[] = []

  for (let i = 0; i < files.length; i++) {
    const entry = files[i]
    const prefix = `[${String(i + 1).padStart(String(files.length).length, " ")}/${files.length}]`
    const label = `${entry.year}/${String(entry.month).padStart(2, "0")} ${path.basename(entry.filePath)}`
    process.stdout.write(`${prefix} ${label} ... `)

    // processFile이 내부에서 dbItems 배열에 증분 추가하므로 재시도 불필요
    const result = await processFile(entry, isDryRun, rules, dbItems)
    results.push(result)

    const statusLabel: Record<ProcessStatus, string> = {
      success: "완료",
      "dry-run": "dry-run",
      skipped: `스킵 (${result.reason})`,
      duplicate: "중복 스킵",
      error: `오류: ${result.reason}`,
    }
    console.log(statusLabel[result.status])
  }

  printSummary(results)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("치명적 오류:", err)
  prisma.$disconnect()
  process.exit(1)
})
