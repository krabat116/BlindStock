-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('FABRIC_CUTTING', 'TUBE_CUTTING', 'ASSEMBLING', 'PACKING', 'INSPECTING');

-- CreateTable
CREATE TABLE "UploadedWorkOrderSheet" (
    "id" TEXT NOT NULL,
    "customerOrderId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedWorkOrderSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderGroup" (
    "id" TEXT NOT NULL,
    "uploadedWorkOrderSheetId" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderRow" (
    "id" TEXT NOT NULL,
    "workOrderGroupId" TEXT NOT NULL,
    "sourceRowNumber" INTEGER NOT NULL,
    "isAccessoryRow" BOOLEAN NOT NULL DEFAULT false,
    "blindNumber" TEXT,
    "additionalRef" TEXT,
    "room" TEXT,
    "widthMm" INTEGER,
    "dropMm" INTEGER,
    "materialRange" TEXT,
    "materialColour" TEXT,
    "tape" TEXT,
    "roll" TEXT,
    "finish" TEXT,
    "componentryColour" TEXT,
    "chainOperation" TEXT,
    "side" TEXT,
    "chain" TEXT,
    "quantity" INTEGER,
    "accessoriesNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkActivity" (
    "id" TEXT NOT NULL,
    "workOrderRowId" TEXT NOT NULL,
    "workType" "WorkType" NOT NULL,
    "staffUserId" INTEGER NOT NULL,
    "displayValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadedWorkOrderSheet_customerOrderId_key" ON "UploadedWorkOrderSheet"("customerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedWorkOrderSheet_fileHash_key" ON "UploadedWorkOrderSheet"("fileHash");

-- CreateIndex
CREATE INDEX "WorkOrderGroup_uploadedWorkOrderSheetId_idx" ON "WorkOrderGroup"("uploadedWorkOrderSheetId");

-- CreateIndex
CREATE INDEX "WorkOrderGroup_account_customerName_idx" ON "WorkOrderGroup"("account", "customerName");

-- CreateIndex
CREATE INDEX "WorkOrderRow_workOrderGroupId_idx" ON "WorkOrderRow"("workOrderGroupId");

-- CreateIndex
CREATE INDEX "WorkActivity_staffUserId_idx" ON "WorkActivity"("staffUserId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkActivity_workOrderRowId_workType_key" ON "WorkActivity"("workOrderRowId", "workType");

-- AddForeignKey
ALTER TABLE "UploadedWorkOrderSheet" ADD CONSTRAINT "UploadedWorkOrderSheet_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedWorkOrderSheet" ADD CONSTRAINT "UploadedWorkOrderSheet_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderGroup" ADD CONSTRAINT "WorkOrderGroup_uploadedWorkOrderSheetId_fkey" FOREIGN KEY ("uploadedWorkOrderSheetId") REFERENCES "UploadedWorkOrderSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderRow" ADD CONSTRAINT "WorkOrderRow_workOrderGroupId_fkey" FOREIGN KEY ("workOrderGroupId") REFERENCES "WorkOrderGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkActivity" ADD CONSTRAINT "WorkActivity_workOrderRowId_fkey" FOREIGN KEY ("workOrderRowId") REFERENCES "WorkOrderRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkActivity" ADD CONSTRAINT "WorkActivity_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
