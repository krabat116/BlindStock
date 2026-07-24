/**
 * BlindStock — 재고 수량 초기화 스크립트
 *
 * 모든 아이템의 재고를 0으로 리셋합니다.
 * 아이템/카테고리/고객/발주 이력/거래 기록은 유지됩니다.
 *
 * 사용법:
 *   npx tsx src/scripts/resetStock.ts
 *   npx tsx src/scripts/resetStock.ts --dry-run   (변경 없이 대상 수량만 확인)
 */

import prisma from "../lib/prisma"

async function main() {
  const isDryRun = process.argv.includes("--dry-run")

  console.log(`\nBlindStock 재고 초기화${isDryRun ? " (DRY-RUN — DB 변경 없음)" : ""}`)
  console.log("대상: 모든 아이템의 quantity / totalLengthMm / totalAreaMm2 → 0")
  console.log("유지: 아이템, 카테고리, 고객, 발주 이력, 거래 기록\n")

  const items = await prisma.item.findMany({
    select: { id: true, name: true, stockType: true, quantity: true, totalLengthMm: true, totalAreaMm2: true },
  })

  const countItems  = items.filter((i) => i.stockType === "COUNT")
  const lengthItems = items.filter((i) => i.stockType === "LENGTH")
  const areaItems   = items.filter((i) => i.stockType === "AREA")

  console.log(`COUNT  아이템: ${countItems.length}개`)
  console.log(`LENGTH 아이템: ${lengthItems.length}개`)
  console.log(`AREA   아이템: ${areaItems.length}개`)
  console.log(`합계:          ${items.length}개\n`)

  if (isDryRun) {
    console.log("[DRY-RUN] 실제 변경 없이 종료합니다.")
    await prisma.$disconnect()
    return
  }

  // COUNT → quantity = 0
  const r1 = await prisma.item.updateMany({
    where: { stockType: "COUNT" },
    data: { quantity: 0 },
  })

  // LENGTH → totalLengthMm = 0
  const r2 = await prisma.item.updateMany({
    where: { stockType: "LENGTH" },
    data: { totalLengthMm: 0 },
  })

  // AREA → totalAreaMm2 = 0
  const r3 = await prisma.item.updateMany({
    where: { stockType: "AREA" },
    data: { totalAreaMm2: 0 },
  })

  console.log(`COUNT  초기화: ${r1.count}개`)
  console.log(`LENGTH 초기화: ${r2.count}개`)
  console.log(`AREA   초기화: ${r3.count}개`)
  console.log("\n재고 초기화 완료.")

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("오류:", err)
  prisma.$disconnect()
  process.exit(1)
})
