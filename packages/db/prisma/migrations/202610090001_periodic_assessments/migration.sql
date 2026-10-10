-- CreateEnum
CREATE TYPE "AssessmentCadence" AS ENUM ('WEEKLY', 'MONTHLY', 'BOTH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EvaluationKind" ADD VALUE 'WEEKLY';
ALTER TYPE "EvaluationKind" ADD VALUE 'MONTHLY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubmissionStatus" ADD VALUE 'APPROVED';
ALTER TYPE "SubmissionStatus" ADD VALUE 'REVISION_REQUESTED';

-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN     "periodEnd" DATE,
ADD COLUMN     "periodStart" DATE,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- CreateTable
CREATE TABLE "AssessmentSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "courseId" TEXT NOT NULL,
    "cadence" "AssessmentCadence" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "configuredById" TEXT,

    CONSTRAINT "AssessmentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentSchedule_tenantId_createdAt_idx" ON "AssessmentSchedule"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSchedule_tenantId_courseId_key" ON "AssessmentSchedule"("tenantId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSchedule_tenantId_id_key" ON "AssessmentSchedule"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_tenantId_placementId_kind_periodStart_key" ON "Evaluation"("tenantId", "placementId", "kind", "periodStart");

-- AddForeignKey
ALTER TABLE "AssessmentSchedule" ADD CONSTRAINT "AssessmentSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSchedule" ADD CONSTRAINT "AssessmentSchedule_tenantId_courseId_fkey" FOREIGN KEY ("tenantId", "courseId") REFERENCES "Course"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AssessmentSchedule" ADD CONSTRAINT "AssessmentSchedule_tenantId_configuredById_fkey" FOREIGN KEY ("tenantId", "configuredById") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_tenantId_reviewedById_fkey" FOREIGN KEY ("tenantId", "reviewedById") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
