# AREA StockType 구현 세션 요약

**날짜:** 2026-05-17
**브랜치:** main
**작업 범위:** AREA 재고 유형 전체 스택 구현 (서버 + 클라이언트)

---

## 개요

원단(패브릭) 등 면적 기반 재고 추적을 위한 `AREA` StockType을 기존 `COUNT`, `LENGTH`에 이어 세 번째 재고 유형으로 추가 구현했다. 서버부터 클라이언트 UI까지 end-to-end 완성.

---

## 핵심 기술 개념

### AREA StockType 규칙
- 내부 저장 단위: **mm²** (`totalAreaMm2`, `minimumAreaMm2` — Prisma `Int?`)
- UI 표시 단위: **m²** (사용자 입력값)
- 변환식: `mm² = m² × 1,000,000`
- Transaction 기록 컬럼: `areaMm2 Int?`

### 단위 변환 패턴 (일관적으로 적용)
```typescript
// AdjustStockModal: 사용자 입력(m²) → 내부(mm²)
const parsedValueInternal = isArea ? Math.round(parsedValue * 1_000_000) : parsedValue

// AddStockModal: useMemo로 mm² 계산
const addedAreaMm2 = useMemo(() => {
  if (!isArea) return 0
  const m2 = Number(quantity)
  if (!Number.isFinite(m2) || m2 < 0) return 0
  return Math.round(m2 * 1_000_000)
}, [isArea, quantity])

// 표시 시 역변환
`${(totalAreaMm2 / 1_000_000).toFixed(2)} m²`
```

### Strip Packing (FFDH)
- First Fit Decreasing Height 알고리즘 (`fabricPacking.ts`)
- 발주서 처리 시 원단 면적 계산에 사용

### bulkCreateMissingItems 카테고리 감지 로직
```typescript
const isLength = normalizedCategory === "ALUMINIUM TUBES" || normalizedCategory === "FINISH"
const isArea = normalizedCategory === "MATERIAL"
// 나머지는 COUNT
```

---

## 변경 파일 목록

### 서버

#### `blind-inventory-server/src/services/itemService.ts`
- `updateItemStock` 및 `adjustItemStock` payload 타입에 `totalAreaMm2?: number` 추가
- `adjustItemStock`에 AREA 분기 추가:
  - Prisma 트랜잭션 처리
  - 과다 차감(over-deduct) 유효성 검사
  - `areaMm2` 필드로 Transaction 기록 생성
- 모든 반환 shape(LENGTH, AREA, COUNT)에 `totalAreaMm2`, `minimumAreaMm2` 포함하도록 수정
- `bulkCreateMissingItems`에 AREA 분기 추가:
  ```typescript
  await prisma.item.create({
    data: {
      name: itemName,
      categoryId: dbCategory.id,
      stockType: isArea ? "AREA" : isLength ? "LENGTH" : "COUNT",
      ...(isArea
        ? { totalAreaMm2: 0, minimumAreaMm2: 0, unit: "m²" }
        : isLength
          ? { totalLengthMm: 0, minimumLengthMm: 0 }
          : { quantity: 0, minimumStock: 0, unit: "pcs" }),
    },
  })
  ```

### 클라이언트

#### `blind-inventory-client/src/types/inventory.tsx`
```typescript
export type InventoryItem = {
  id: number
  name: string
  category: string
  stockType: "COUNT" | "LENGTH" | "AREA"  // "AREA" 추가
  defaultLengthMm: number | null
  totalLengthMm: number | null
  minimumLengthMm: number | null
  cutoffLengthMm: number | null
  totalAreaMm2: number | null       // 추가
  minimumAreaMm2: number | null     // 추가
  quantity: number
  minimumStock: number
  unit: string
}
```

#### `blind-inventory-client/src/types/createItemPayload.ts`
- AREA 유니온 변형 추가:
```typescript
| {
    name: string
    categoryId: number
    stockType: "AREA"
    totalAreaMm2: number
    minimumAreaMm2: number
    quantity?: null
    minimumStock?: null
    unit?: null
    defaultLengthMm?: null
    totalLengthMm?: null
    minimumLengthMm?: null
  }
```

#### `blind-inventory-client/src/types/orderPreview.ts`
```typescript
export type OrderPreviewItem = {
  // ...기존 필드...
  areaMm2: number | null         // AREA 타입: 차감할 총 면적(mm²)
  stockType: "COUNT" | "LENGTH" | "AREA"
  currentAreaMm2: number | null  // AREA 타입의 현재 재고(mm²)
}
```

#### `blind-inventory-client/src/utils/getStockStatus.ts`
```typescript
if (item.stockType === "AREA") {
  const total = item.totalAreaMm2 ?? 0
  const minimum = item.minimumAreaMm2 ?? 0
  if (total <= 0) return "out"
  if (total <= minimum) return "low"
  return "ok"
}
```

#### `blind-inventory-client/src/components/OrderUploadPanel.tsx`
- `getPreviewStatus`: AREA 분기 (`currentAreaMm2` vs `areaMm2` 비교)
- `hasInsufficientStock`: AREA 분기
- 테이블 행: `isArea` 플래그, `formatArea(mm2)` 헬퍼
- Required / In Stock / Remaining 모두 AREA 처리
- 아이템명 옆 보라색 "Area" 배지 표시

#### `blind-inventory-client/src/components/AdjustStockModal.tsx`
주요 패턴:
```typescript
const isArea = item?.stockType === "AREA"
const parsedValueInternal = isArea ? Math.round(parsedValue * 1_000_000) : parsedValue
const currentStock = isArea
  ? (item.totalAreaMm2 ?? 0)
  : isLength ? (item.totalLengthMm ?? 0) : (item.quantity ?? 0)

function formatStock(val: number) {
  if (isArea) return `${(val / 1_000_000).toFixed(2)} m²`
  return isLength ? `${val.toLocaleString()} mm` : `${val} ${item!.unit ?? ""}`
}
```
- 레이블: "Deduct (m²)" / "Set total to (m²)"
- Min threshold 정보: AREA 항목은 m² 표시

#### `blind-inventory-client/src/components/AddStockModal.tsx`
- `isArea = item?.stockType === "AREA"`
- `addedAreaMm2` useMemo (m² → mm²)
- AREA UI 섹션: 현재 총량, 최소 임계값, m² 입력, 새 총량 표시
- Submit: AREA 분기로 mm² 값 `onSave`에 전달

#### `blind-inventory-client/src/components/InventoryTable.tsx`
- Stock 컬럼 및 Min stock 컬럼: AREA 분기
```typescript
item.stockType === "AREA"
  ? item.totalAreaMm2 != null ? `${(item.totalAreaMm2 / 1_000_000).toFixed(2)} m²` : "—"
  : ...
```

#### `blind-inventory-client/src/pages/inventory/InventoryPage.tsx`
- `lowStockCount`: AREA 분기
- `handleSaveStock`: AREA → `{ totalAreaMm2: value, note }`
- `handleAdjustStock`: AREA → `{ type, totalAreaMm2: value, note }`
- `handleFillInsufficientStock`: AREA 분기 (`currentAreaMm2 < areaMm2`, `{ totalAreaMm2: deficit }` 전송)
- `handleConfirmDeduction`: payload에 `areaMm2` 추가
- `handleUpdateItemSettings`: `totalAreaMm2?`, `minimumAreaMm2?` 옵션 추가

---

## 발생했던 문제 및 해결

| 문제 | 해결 |
|------|------|
| 서버 `tsc --noEmit` TS6059 오류 (`prisma/seed.ts`) | 기존 문제 (rootDir 범위 밖). AREA 변경과 무관, 무시 |
| 클라이언트 `tsc --noEmit` | 완전히 클린 (exit 0) |
| Edit 툴 "File has not been read yet" 오류 | 편집 전 반드시 Read 먼저 실행하도록 절차 수정 |

---

## 완료 상태

- [x] 서버 `itemService.ts` AREA 분기 (adjustItemStock, bulkCreateMissingItems)
- [x] 클라이언트 타입 (inventory, createItemPayload, orderPreview)
- [x] getStockStatus AREA 분기
- [x] OrderUploadPanel AREA 지원
- [x] AdjustStockModal AREA 지원
- [x] AddStockModal AREA 지원
- [x] InventoryTable AREA 표시
- [x] InventoryPage 핸들러 AREA 분기

---

## 잠재적 후속 작업 (미요청)

- **ManageItemsModal에서 AREA 항목 수동 생성/편집 지원**
  현재 AREA 항목은 발주서 업로드의 `bulkCreateMissingItems`를 통해서만 자동 생성 가능. UI에서 직접 AREA 항목을 생성·편집하는 기능은 아직 없음.

---

## 관련 커밋

```
f119b0d Widen inventory page and fix table column alignment
8ef3a99 Derive missing combo colour from last seen componentry colour
7ae23d6 Omit BRACKET suffix for combo brackets
cac8b0e Shorten chain item names and add category filter to ManageItemsModal
1c67a75 Fix chain & winder parsing to include size and type
```
