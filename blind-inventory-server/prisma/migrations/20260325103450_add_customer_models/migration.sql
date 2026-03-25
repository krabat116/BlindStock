-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "companyName" TEXT,
    "address" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomerOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT,
    "orderNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerOrderId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItem_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_companyName_idx" ON "Customer"("companyName");

-- CreateIndex
CREATE INDEX "CustomerOrder_customerId_idx" ON "CustomerOrder"("customerId");

-- CreateIndex
CREATE INDEX "CustomerOrder_orderDate_idx" ON "CustomerOrder"("orderDate");

-- CreateIndex
CREATE INDEX "OrderItem_customerOrderId_idx" ON "OrderItem"("customerOrderId");
