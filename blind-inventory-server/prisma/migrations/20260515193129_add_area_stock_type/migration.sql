-- AlterEnum
ALTER TYPE "StockType" ADD VALUE 'AREA';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "minimumAreaMm2" INTEGER,
ADD COLUMN     "totalAreaMm2" INTEGER;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "areaMm2" INTEGER;
