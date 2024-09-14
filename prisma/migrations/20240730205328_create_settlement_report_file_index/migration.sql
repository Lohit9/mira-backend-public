-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('DONE', 'CANCELLED', 'FATAL', 'IN_PROGRESS', 'IN_QUEUE');

-- CreateTable
CREATE TABLE "sp_api_report_documents" (
    "report_document_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "processing_Status" "ProcessingStatus" NOT NULL,
    "marketplace_ids" TEXT[],
    "processing_end_time" TIMESTAMP(3) NOT NULL,
    "data_end_time" TIMESTAMP(3) NOT NULL,
    "created_time" TIMESTAMP(3) NOT NULL,
    "processing_start_time" TIMESTAMP(3) NOT NULL,
    "data_start_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sp_api_report_documents_pkey" PRIMARY KEY ("report_document_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sp_api_report_documents_report_id_key" ON "sp_api_report_documents"("report_id");
