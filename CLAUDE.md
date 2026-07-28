## Claude에게

이 파일은 살아있는 문서입니다.
작업 중 아래 상황이 발생하면 자율적으로 업데이트하세요:

- 기능 완료 시 → 완료 목록 갱신
- 기술 결정 시 → 결정사항 기록
- 새 패턴/컨벤션 발견 시 → 추가
  사용자에게 묻지 말고 바로 업데이트할 것.

# BlindStock — Claude 컨텍스트 파일

BlindStock는 블라인드 제조 공장을 위한 재고·발주 관리 풀스택 시스템이다.
Excel 기반 수기 관리를 대체하여 재고 불일치를 방지하고, 발주서를 자동 파싱·부품 차감한다.

---

## 프로젝트 구조

```
BlindStock/
├── blind-inventory-server/     # Express + TypeScript 백엔드
│   ├── prisma/schema.prisma    # 데이터베이스 스키마
│   └── src/
│       ├── index.ts            # Express 앱 진입점
│       ├── routes/             # API 라우트
│       ├── services/           # 비즈니스 로직
│       ├── middleware/         # 인증 미들웨어
│       ├── utils/              # 유틸리티 (normalize 등)
│       ├── fabricPacking.ts    # 원단 면적 계산 (FFDH 알고리즘)
│       ├── orderMapping.ts     # 발주서 → 부품 매핑
│       └── parseRecentOrderSheet.ts  # Excel 파싱
├── blind-inventory-client/     # React 19 + TypeScript 프론트엔드
│   └── src/
│       ├── components/         # UI 컴포넌트
│       ├── pages/              # 페이지 컴포넌트
│       ├── types/              # TypeScript 타입 정의
│       ├── utils/              # 헬퍼 함수
│       ├── contexts/           # React 컨텍스트 (AuthContext)
│       └── lib/api.ts          # JWT 포함 중앙 집중 API fetch
└── docs/                       # 세션별 개발 노트
```

---

## 기술 스택

| 영역       | 기술                                |
| ---------- | ----------------------------------- |
| 백엔드     | Express 5, TypeScript, tsx          |
| ORM        | Prisma + PostgreSQL                 |
| 인증       | JWT + bcryptjs (ADMIN / STAFF 역할) |
| 파일 처리  | multer (업로드), xlsx (Excel 파싱)  |
| 프론트엔드 | React 19, TypeScript, Vite          |
| 스타일링   | Tailwind CSS 4                      |
| 라우팅     | React Router 7                      |
| 차트       | Recharts                            |

---

## 핵심 도메인 개념

### StockType — 세 가지 재고 유형

| StockType | 추적 단위 | 내부 저장                 | UI 표시     | 대상 품목             |
| --------- | --------- | ------------------------- | ----------- | --------------------- |
| `COUNT`   | 개수      | `quantity` (Int)          | 숫자 + unit | 핀, 브래킷, 캡 등     |
| `LENGTH`  | 길이      | `totalLengthMm` (Int, mm) | mm          | 알루미늄 튜브, 피니시 |
| `AREA`    | 면적      | `totalAreaMm2` (Int, mm²) | m²          | 원단(패브릭)          |

**AREA 단위 변환 규칙 (반드시 준수):**

```typescript
// 사용자 입력 m² → 내부 mm²
const mm2 = Math.round(m2 * 1_000_000)
// 표시 시 역변환
`${(mm2 / 1_000_000).toFixed(2)} m²`
```

**bulkCreateMissingItems 카테고리 감지:**

```typescript
const isLength =
  normalizedCategory === 'ALUMINIUM TUBES' || normalizedCategory === 'FINISH'
const isArea = normalizedCategory === 'MATERIAL'
// 나머지 → COUNT
```

### 발주 처리 파이프라인 (2단계)

1. **Preview** — Excel 파싱 → 부품 추출 → 재고 매칭 → 누락/부족 플래그
2. **Confirm** — 매칭된 부품 차감 → Transaction 기록

### 인증

- JWT 기반, 모든 `/auth/login`·`/auth/setup` 외 라우트는 `requireAuth` 미들웨어 필요
- 관리자 전용 기능은 `requireAdmin` 미들웨어 추가

---

## 주요 API 라우트

| 파일                   | 주요 엔드포인트                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `authRoutes.ts`        | POST /auth/login, GET /auth/me, GET/POST /auth/users                                                                    |
| `itemRoutes.ts`        | GET /items, PATCH /items/:id/stock, PATCH /items/:id/adjust, PATCH /items/:id/settings, POST /items/bulk-create-missing |
| `orderRoutes.ts`       | GET /orders/stats, POST /orders/preview, POST /orders/confirm-deduction (multipart/form-data)                           |
| `workOrderRoutes.ts`   | GET /work-orders/groups, GET /work-orders/groups/:id, POST /work-orders/activities, DELETE /work-orders/activities/:id  |
| `categoryRoutes.ts`    | 카테고리 CRUD                                                                                                           |
| `customerRoutes.ts`    | 고객 관리                                                                                                               |
| `transactionRoutes.ts` | 거래 이력                                                                                                               |

---

## 주요 서비스 파일

| 파일                       | 역할                                                     |
| -------------------------- | -------------------------------------------------------- |
| `itemService.ts`           | 재고 조회·추가·차감·설정, COUNT/LENGTH/AREA 전 분기 처리 |
| `orderService.ts`          | 발주서 미리보기·확정 차감·통계 (confirm은 서버 재파싱)   |
| `workOrderService.ts`      | 작업 지시서 저장·조회·활동 토글·삭제                    |
| `authService.ts`           | JWT 인증, 사용자 관리                                    |
| `customerService.ts`       | 고객 CRUD, 발주 이력                                     |
| `fabricPacking.ts`         | 원단 면적 계산 (FFDH strip-packing 알고리즘)             |
| `orderMapping.ts`          | 발주 행 → 부품 요구사항 변환                             |
| `parseRecentOrderSheet.ts` | Excel 파싱 (유연한 컬럼 alias 매칭)                      |

---

## 주요 클라이언트 파일

### Pages

- `pages/inventory/InventoryPage.tsx` — 메인 대시보드 (재고 테이블, 발주 업로드, 통계)
- `pages/customers/CustomersPage.tsx` — 고객 목록
- `pages/customers/CustomerDetailPage.tsx` — 고객 상세 + 발주 이력
- `pages/auth/LoginPage.tsx` — 로그인
- `pages/settings/SettingsPage.tsx` — 관리자 전용 사용자 관리
- `pages/workorders/WorkOrdersPage.tsx` — 작업 지시서 (그룹 목록 + 행별 작업 활동 토글)

### Components

- `components/InventoryTable.tsx` — 재고 테이블
- `components/StockStatusBadge.tsx` — 재고 상태 배지 (ok/low/out)
- `components/OrderUploadPanel.tsx` — 단일 파일 업로드 + 미리보기
- `components/BatchUploadPanel.tsx` — 다중 파일 일괄 업로드
- `components/ManageItemsModal.tsx` — 아이템 생성·편집
- `components/AddStockModal.tsx` — 재고 추가 (COUNT/LENGTH/AREA 각 UI)
- `components/AdjustStockModal.tsx` — 수동 재고 조정 (차감/정정)
- `components/TransactionList.tsx` — 거래 이력
- `components/EditCategoriesModal.tsx` — 카테고리 관리

### Types

- `types/inventory.tsx` — `InventoryItem`, `StockStatus`
- `types/createItemPayload.ts` — `CreateItemPayload` (COUNT/LENGTH/AREA 유니온)
- `types/orderPreview.ts` — `OrderPreviewItem`, `OrderPreviewResponse`
- `types/workOrder.ts` — `WorkType`, `WorkActivity`, `WorkOrderRow`, `WorkOrderGroup`, `WorkOrderGroupDetail`, `ToggleActivityResult`

### Utils

- `utils/getStockStatus.ts` — `InventoryItem` → `"ok" | "low" | "out"`
- `lib/api.ts` — JWT 헤더 자동 주입 fetch 래퍼

---

## 구현 완료 이력

### 2026-07-28 — 디지털 작업 지시서 기능 전체 스택 구현

Excel 발주서 업로드 확정 시 WorkOrderGroup + WorkOrderRow 자동 생성, 공장 직원이 작업 유형별 활동을 클릭으로 기록하는 기능 추가.

**설계 결정사항:**
- `confirmOrderDeduction`은 서버에서 Excel을 재파싱 (클라이언트 previewItems 신뢰 안 함)
- 모든 DB 쓰기(CustomerOrder, 재고 차감, Transaction, WorkOrderSheet, WorkOrderGroups, WorkOrderRows)를 단일 `prisma.$transaction()`으로 원자적 처리
- 중복 방지: fileHash + orderYear+orderSheetNo 두 가지 사전 검사 (트랜잭션 외부)
- WorkActivity 토글: 본인 기록 → 삭제, 타인 기록 → 409 conflict, Admin → 강제 삭제 가능
- `@@unique([workOrderRowId, workType])` 제약으로 한 행에 하나의 작업 유형당 하나의 담당자
- `prisma generate` 필요: 스키마 변경 후 반드시 실행

**추가된 Prisma 모델:** `UploadedWorkOrderSheet`, `WorkOrderGroup`, `WorkOrderRow`, `WorkActivity`, `WorkType` enum

**변경 파일:**
- 서버 스키마: `prisma/schema.prisma` + migration `20260728115149_add_work_orders`
- 서버: `services/orderService.ts` (전면 재작성), `services/workOrderService.ts` (신규), `routes/orderRoutes.ts` (multer 추가), `routes/workOrderRoutes.ts` (신규), `index.ts` (라우트 등록)
- 파서: `parseRecentOrderSheet.ts` (accessoryRows, raw fields 추가), `orderMapping.ts` (raw fields)
- 클라이언트: `types/workOrder.ts` (신규), `pages/workorders/WorkOrdersPage.tsx` (신규), `App.tsx` (라우트 추가), `Sidebar.tsx` (Work Orders 링크), `InventoryPage.tsx` (confirm/batch → FormData)

---

### 2026-05-17 — AREA StockType 전체 스택 구현

원단(패브릭) 면적 기반 재고 추적 기능 추가. 상세 내용: [docs/session-2026-05-17-area-stocktype.md](docs/session-2026-05-17-area-stocktype.md)

**변경 파일:**

- 서버: `itemService.ts` (adjustItemStock·bulkCreateMissingItems AREA 분기)
- 클라이언트 타입: `inventory.tsx`, `createItemPayload.ts`, `orderPreview.ts`
- 클라이언트 유틸: `getStockStatus.ts`
- 클라이언트 컴포넌트: `OrderUploadPanel.tsx`, `AdjustStockModal.tsx`, `AddStockModal.tsx`, `InventoryTable.tsx`, `InventoryPage.tsx`

---

## 미완료 / 후속 작업

- **ManageItemsModal AREA 항목 수동 생성·편집**: 현재 AREA 항목은 발주 업로드(`bulkCreateMissingItems`)를 통해서만 자동 생성됨. UI에서 직접 생성·편집 미구현.

---

## Excel 발주서 컬럼 형식

파서가 기대하는 주요 컬럼 (유연한 alias 매칭 적용):
`ACCOUNT`, `CUSTOMER NAME`, `BLIND NO`, `WIDTH`, `DROP`, `MATERIAL`, `FINISH`, `COMPONENTRY COLOUR`, `CHAIN TYPE`, `OPERATION`, `SIDE WDR`, `ROLL`, `QTY`

---

## 개발 규칙

- 새 StockType 분기 추가 시: 서버 서비스 + 클라이언트 타입 + 모든 UI 컴포넌트 동시 수정 필요
- AREA 값은 항상 mm² 단위로 API 전송, UI에서만 m² 변환
- 파일 편집 전 반드시 Read 먼저 수행
- 서버 `tsc --noEmit` 시 `prisma/seed.ts`의 TS6059는 기존 문제이므로 무시
