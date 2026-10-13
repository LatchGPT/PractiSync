CREATE TABLE "outcome_decisions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "placement_id" TEXT NOT NULL,
    "coordinator_id" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "rubric_version" INTEGER NOT NULL DEFAULT 1,
    "calculated_score" DOUBLE PRECISION,
    "calculated_status" TEXT NOT NULL,

    CONSTRAINT "outcome_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outcome_decisions_placement" ON "outcome_decisions"("tenant_id", "placement_id");
CREATE INDEX "outcome_decisions_coordinator" ON "outcome_decisions"("tenant_id", "coordinator_id");

CREATE TABLE "industry_feedback" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "placement_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "supervisor_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "academic_period" TEXT NOT NULL,
    "framework_version" INTEGER NOT NULL DEFAULT 1,
    "workplace_readiness" INTEGER NOT NULL,
    "competency_relevance" INTEGER NOT NULL,
    "supervision_support" INTEGER NOT NULL,
    "curriculum_alignment" INTEGER NOT NULL,
    "technical_gaps" TEXT,
    "soft_skill_gaps" TEXT,
    "recommendations" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',

    CONSTRAINT "industry_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "industry_feedback_placement" ON "industry_feedback"("tenant_id", "placement_id");
CREATE INDEX "industry_feedback_course_period" ON "industry_feedback"("tenant_id", "course_id", "academic_period");
CREATE INDEX "industry_feedback_company" ON "industry_feedback"("tenant_id", "company_id");
