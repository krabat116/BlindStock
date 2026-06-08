-- CreateTable
CREATE TABLE "ContinuationRowRule" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContinuationRowRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContinuationRowRule_keyword_key" ON "ContinuationRowRule"("keyword");
