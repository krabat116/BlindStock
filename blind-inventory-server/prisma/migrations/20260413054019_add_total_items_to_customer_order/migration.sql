-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomerOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "orderYear" INTEGER NOT NULL,
    "orderMonth" INTEGER NOT NULL,
    "orderSheetNo" INTEGER NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "fileName" TEXT,
    "fileHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomerOrder" ("createdAt", "customerId", "fileHash", "fileName", "id", "note", "orderMonth", "orderSheetNo", "orderYear", "status", "updatedAt") SELECT "createdAt", "customerId", "fileHash", "fileName", "id", "note", "orderMonth", "orderSheetNo", "orderYear", "status", "updatedAt" FROM "CustomerOrder";
DROP TABLE "CustomerOrder";
ALTER TABLE "new_CustomerOrder" RENAME TO "CustomerOrder";
CREATE INDEX "CustomerOrder_customerId_idx" ON "CustomerOrder"("customerId");
CREATE INDEX "CustomerOrder_orderYear_orderMonth_idx" ON "CustomerOrder"("orderYear", "orderMonth");
CREATE UNIQUE INDEX "CustomerOrder_orderYear_orderSheetNo_key" ON "CustomerOrder"("orderYear", "orderSheetNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
