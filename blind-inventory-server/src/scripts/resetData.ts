/**
 * BlindStock — 데이터 초기화 스크립트
 *
 * 삭제 대상:
 *   - Transaction (재고 거래 이력)
 *   - OrderItem (발주 아이템)
 *   - CustomerOrder (고객 발주)
 *   - Customer (고객)
 *   - Item (재고 아이템)
 *   - Category (카테고리)
 *
 * 유지 대상:
 *   - User (로그인 계정)
 *   - ContinuationRowRule (파싱 규칙)
 *
 * 사용법:
 *   npx tsx src/scripts/resetData.ts
 */

import prisma from "../lib/prisma"

async function main() {
  console.log("⚠️  BlindStock 데이터 초기화")
  console.log("삭제 대상: 재고 아이템, 카테고리, 고객, 발주 이력, 거래 기록")
  console.log("유지 대상: 유저 계정, 파싱 규칙\n")

  // 외래키 제약 순서에 맞게 삭제
  const t1 = await prisma.transaction.deleteMany()
  console.log(`Transaction 삭제: ${t1.count}개`)

  const t2 = await prisma.orderItem.deleteMany()
  console.log(`OrderItem 삭제: ${t2.count}개`)

  const t3 = await prisma.customerOrder.deleteMany()
  console.log(`CustomerOrder 삭제: ${t3.count}개`)

  const t4 = await prisma.customer.deleteMany()
  console.log(`Customer 삭제: ${t4.count}개`)

  const t5 = await prisma.item.deleteMany()
  console.log(`Item 삭제: ${t5.count}개`)

  const t6 = await prisma.category.deleteMany()
  console.log(`Category 삭제: ${t6.count}개`)

  console.log("\n초기화 완료.")
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("오류:", err)
  prisma.$disconnect()
  process.exit(1)
})
