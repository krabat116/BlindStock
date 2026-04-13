/*
  Warnings:

  - You are about to drop the column `orderDate` on the `CustomerOrder` table. All the data in the column will be lost.
  - You are about to drop the column `orderNumber` on the `CustomerOrder` table. All the data in the column will be lost.
  - Added the required column `accountName` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderMonth` to the `CustomerOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderSheetNo` to the `CustomerOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderYear` to the `CustomerOrder` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountName" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "companyName" TEXT,
    "address" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Customer" ("address", "companyName", "createdAt", "email", "id", "name", "note", "phone", "updatedAt") SELECT "address", "companyName", "createdAt", "email", "id", "name", "note", "phone", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_accountName_key" ON "Customer"("accountName");
CREATE INDEX "Customer_accountName_idx" ON "Customer"("accountName");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX "Customer_email_idx" ON "Customer"("email");
CREATE INDEX "Customer_companyName_idx" ON "Customer"("companyName");
CREATE TABLE "new_CustomerOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "orderYear" INTEGER NOT NULL,
    "orderMonth" INTEGER NOT NULL,
    "orderSheetNo" INTEGER NOT NULL,
    "fileName" TEXT,
    "fileHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomerOrder" ("createdAt", "customerId", "fileName", "id", "note", "status", "updatedAt") SELECT "createdAt", "customerId", "fileName", "id", "note", "status", "updatedAt" FROM "CustomerOrder";
DROP TABLE "CustomerOrder";
ALTER TABLE "new_CustomerOrder" RENAME TO "CustomerOrder";
CREATE INDEX "CustomerOrder_customerId_idx" ON "CustomerOrder"("customerId");
CREATE INDEX "CustomerOrder_orderYear_orderMonth_idx" ON "CustomerOrder"("orderYear", "orderMonth");
CREATE UNIQUE INDEX "CustomerOrder_orderYear_orderSheetNo_key" ON "CustomerOrder"("orderYear", "orderSheetNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
