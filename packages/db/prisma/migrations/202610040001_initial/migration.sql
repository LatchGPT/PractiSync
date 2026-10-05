-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DeploymentMode" AS ENUM ('DEMO', 'INSTITUTIONAL');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'COORDINATOR', 'SUPERVISOR', 'STUDENT');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED', 'INVITED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PlacementStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('CONFIRMED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('QUARANTINED', 'CLEAN', 'REJECTED');

-- CreateEnum
CREATE TYPE "EvaluationKind" AS ENUM ('BASELINE', 'FINAL');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AudienceScope" AS ENUM ('UNIVERSITY', 'DEPARTMENT', 'CLASS');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Manila',
    "mode" "DeploymentMode" NOT NULL DEFAULT 'INSTITUTIONAL',
    "allowedGoogleDomains" TEXT[],
    "settingsVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicPeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AcademicPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisorProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verificationStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,

    CONSTRAINT "SupervisorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "address" TEXT,
    "verificationStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "canPost" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,

    CONSTRAINT "CompanyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursePolicyScope" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "supervisorId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,

    CONSTRAINT "CoursePolicyScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HoursPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL,
    "requiredMinutes" INTEGER NOT NULL,
    "isFictional" BOOLEAN NOT NULL DEFAULT false,
    "courseId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "HoursPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSpace" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "coordinatorId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,

    CONSTRAINT "ClassSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JoinCode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "maxEnrollments" INTEGER,
    "classId" TEXT NOT NULL,

    CONSTRAINT "JoinCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Placement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "PlacementStatus" NOT NULL DEFAULT 'ACTIVE',
    "requiredMinutes" INTEGER,
    "policyVersion" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "studentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "policyId" TEXT,

    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementSupervisor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "placementId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,

    CONSTRAINT "PlacementSupervisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyMigration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "oldMinutes" INTEGER,
    "newMinutes" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "PolicyMigration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "date" DATE NOT NULL,
    "narrative" VARCHAR(8000) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "placementId" TEXT NOT NULL,

    CONSTRAINT "DailyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeInterval" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "elapsedMinutes" INTEGER NOT NULL,
    "entryId" TEXT NOT NULL,

    CONSTRAINT "TimeInterval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryRevision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL,
    "oldNarrative" TEXT NOT NULL,
    "newNarrative" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "EntryRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntervalRevision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "oldStart" TIMESTAMP(3) NOT NULL,
    "oldEnd" TIMESTAMP(3) NOT NULL,
    "oldBreakMinutes" INTEGER NOT NULL,
    "newStart" TIMESTAMP(3) NOT NULL,
    "newEnd" TIMESTAMP(3) NOT NULL,
    "newBreakMinutes" INTEGER NOT NULL,
    "revisionId" TEXT NOT NULL,

    CONSTRAINT "IntervalRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryConfirmation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entryVersion" INTEGER NOT NULL,
    "status" "ConfirmationStatus" NOT NULL,
    "reason" TEXT,
    "invalidatedAt" TIMESTAMP(3),
    "entryId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,

    CONSTRAINT "EntryConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageObject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "objectKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT,
    "scanStatus" "ScanStatus" NOT NULL DEFAULT 'QUARANTINED',
    "verifiedAt" TIMESTAMP(3),
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "StorageObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,

    CONSTRAINT "CompanyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetencyFramework" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "scaleMin" INTEGER NOT NULL,
    "scaleMax" INTEGER NOT NULL,
    "isFictional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CompetencyFramework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competency" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,

    CONSTRAINT "Competency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseFramework" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "courseId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,

    CONSTRAINT "CourseFramework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricDimension" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "competencyId" TEXT NOT NULL,

    CONSTRAINT "RubricDimension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "kind" "EvaluationKind" NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "placementId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationScore" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,

    CONSTRAINT "EvaluationScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationRevision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,

    CONSTRAINT "EvaluationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationScoreRevision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "revisionId" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,

    CONSTRAINT "EvaluationScoreRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "allowedTypes" TEXT[],
    "maxBytes" INTEGER NOT NULL,
    "expiresAfterDays" INTEGER,
    "configured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementSet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isFictional" BOOLEAN NOT NULL DEFAULT false,
    "courseId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,

    CONSTRAINT "RequirementSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequirement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "requirementSetId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,

    CONSTRAINT "DocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSubmission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "placementId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "reviewerId" TEXT,

    CONSTRAINT "DocumentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subject" VARCHAR(160) NOT NULL,
    "narrative" VARCHAR(8000) NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "routingFallback" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "reporterId" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "coordinatorId" TEXT,

    CONSTRAINT "IncidentCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseHandler" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "accessReason" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CaseHandler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "body" VARCHAR(8000) NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "CaseMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,

    CONSTRAINT "CaseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseEscalation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,

    CONSTRAINT "CaseEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensitiveAccess" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "SensitiveAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" VARCHAR(8000) NOT NULL,
    "location" TEXT NOT NULL,
    "openings" INTEGER NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "closesAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "companyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCompetency" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "jobId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,

    CONSTRAINT "JobCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobEligibility" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "jobId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,

    CONSTRAINT "JobEligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "coverLetter" VARCHAR(5000) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "jobId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "placementId" TEXT,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fromStatus" "ApplicationStatus",
    "toStatus" "ApplicationStatus" NOT NULL,
    "reason" TEXT,
    "applicationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "ApplicationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(8000) NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementAudience" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scope" "AudienceScope" NOT NULL,
    "announcementId" TEXT NOT NULL,
    "departmentId" TEXT,
    "classId" TEXT,

    CONSTRAINT "AnnouncementAudience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadReceipt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "website" TEXT,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "companyId" TEXT NOT NULL,

    CONSTRAINT "DirectoryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" VARCHAR(5000) NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "placementId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "CompanyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompletionChecklist" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "configured" BOOLEAN NOT NULL DEFAULT false,
    "courseId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,

    CONSTRAINT "CompletionChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "checklistId" TEXT NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompletionRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "placementId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "decidedById" TEXT,

    CONSTRAINT "CompletionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompletionItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fulfilled" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "completionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "CompletionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "missingItems" TEXT[],
    "placementId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "artifactId" TEXT,

    CONSTRAINT "PortfolioJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "nextAttemptAt" TIMESTAMP(3),

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "key" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "responseId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "reason" TEXT,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "keyHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStartsAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_tenantId_createdAt_idx" ON "User"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_id_key" ON "User"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Account_tenantId_createdAt_idx" ON "Account"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_tenantId_id_key" ON "Account"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_tenantId_createdAt_idx" ON "Session"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tenantId_id_key" ON "Session"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_tenantId_createdAt_idx" ON "VerificationToken"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_tenantId_id_key" ON "VerificationToken"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Membership_tenantId_createdAt_idx" ON "Membership"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_tenantId_userId_key" ON "Membership"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_tenantId_id_key" ON "Membership"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Department_tenantId_createdAt_idx" ON "Department"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Department_tenantId_code_key" ON "Department"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_tenantId_id_key" ON "Department"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Course_tenantId_createdAt_idx" ON "Course"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Course_tenantId_code_key" ON "Course"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Course_tenantId_id_key" ON "Course"("tenantId", "id");

-- CreateIndex
CREATE INDEX "AcademicPeriod_tenantId_createdAt_idx" ON "AcademicPeriod"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicPeriod_tenantId_id_key" ON "AcademicPeriod"("tenantId", "id");

-- CreateIndex
CREATE INDEX "StudentProfile_tenantId_createdAt_idx" ON "StudentProfile"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_tenantId_userId_key" ON "StudentProfile"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_tenantId_studentNumber_key" ON "StudentProfile"("tenantId", "studentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_tenantId_id_key" ON "StudentProfile"("tenantId", "id");

-- CreateIndex
CREATE INDEX "SupervisorProfile_tenantId_createdAt_idx" ON "SupervisorProfile"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorProfile_tenantId_userId_key" ON "SupervisorProfile"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorProfile_tenantId_id_key" ON "SupervisorProfile"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Company_tenantId_createdAt_idx" ON "Company"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Company_tenantId_id_key" ON "Company"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CompanyMembership_tenantId_createdAt_idx" ON "CompanyMembership"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMembership_tenantId_companyId_supervisorId_key" ON "CompanyMembership"("tenantId", "companyId", "supervisorId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMembership_tenantId_id_key" ON "CompanyMembership"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CoursePolicyScope_tenantId_createdAt_idx" ON "CoursePolicyScope"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CoursePolicyScope_tenantId_supervisorId_courseId_key" ON "CoursePolicyScope"("tenantId", "supervisorId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CoursePolicyScope_tenantId_id_key" ON "CoursePolicyScope"("tenantId", "id");

-- CreateIndex
CREATE INDEX "HoursPolicy_tenantId_createdAt_idx" ON "HoursPolicy"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HoursPolicy_tenantId_courseId_periodId_version_key" ON "HoursPolicy"("tenantId", "courseId", "periodId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "HoursPolicy_tenantId_id_key" ON "HoursPolicy"("tenantId", "id");

-- CreateIndex
CREATE INDEX "ClassSpace_tenantId_createdAt_idx" ON "ClassSpace"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSpace_tenantId_id_key" ON "ClassSpace"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "JoinCode_codeHash_key" ON "JoinCode"("codeHash");

-- CreateIndex
CREATE INDEX "JoinCode_tenantId_createdAt_idx" ON "JoinCode"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JoinCode_tenantId_id_key" ON "JoinCode"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Enrollment_tenantId_createdAt_idx" ON "Enrollment"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_tenantId_classId_studentId_key" ON "Enrollment"("tenantId", "classId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_tenantId_id_key" ON "Enrollment"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Placement_tenantId_createdAt_idx" ON "Placement"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Placement_tenantId_id_key" ON "Placement"("tenantId", "id");

-- CreateIndex
CREATE INDEX "PlacementSupervisor_tenantId_createdAt_idx" ON "PlacementSupervisor"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementSupervisor_tenantId_placementId_supervisorId_key" ON "PlacementSupervisor"("tenantId", "placementId", "supervisorId");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementSupervisor_tenantId_id_key" ON "PlacementSupervisor"("tenantId", "id");

-- CreateIndex
CREATE INDEX "PolicyMigration_tenantId_createdAt_idx" ON "PolicyMigration"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyMigration_tenantId_id_key" ON "PolicyMigration"("tenantId", "id");

-- CreateIndex
CREATE INDEX "DailyEntry_tenantId_placementId_date_idx" ON "DailyEntry"("tenantId", "placementId", "date");

-- CreateIndex
CREATE INDEX "DailyEntry_tenantId_createdAt_idx" ON "DailyEntry"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyEntry_tenantId_id_key" ON "DailyEntry"("tenantId", "id");

-- CreateIndex
CREATE INDEX "TimeInterval_tenantId_createdAt_idx" ON "TimeInterval"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TimeInterval_tenantId_id_key" ON "TimeInterval"("tenantId", "id");

-- CreateIndex
CREATE INDEX "EntryRevision_tenantId_createdAt_idx" ON "EntryRevision"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EntryRevision_tenantId_entryId_version_key" ON "EntryRevision"("tenantId", "entryId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "EntryRevision_tenantId_id_key" ON "EntryRevision"("tenantId", "id");

-- CreateIndex
CREATE INDEX "IntervalRevision_tenantId_createdAt_idx" ON "IntervalRevision"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntervalRevision_tenantId_id_key" ON "IntervalRevision"("tenantId", "id");

-- CreateIndex
CREATE INDEX "EntryConfirmation_tenantId_createdAt_idx" ON "EntryConfirmation"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EntryConfirmation_tenantId_entryId_entryVersion_supervisorI_key" ON "EntryConfirmation"("tenantId", "entryId", "entryVersion", "supervisorId");

-- CreateIndex
CREATE UNIQUE INDEX "EntryConfirmation_tenantId_id_key" ON "EntryConfirmation"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "StorageObject_objectKey_key" ON "StorageObject"("objectKey");

-- CreateIndex
CREATE INDEX "StorageObject_tenantId_createdAt_idx" ON "StorageObject"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StorageObject_tenantId_id_key" ON "StorageObject"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CompanyRecord_tenantId_createdAt_idx" ON "CompanyRecord"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyRecord_tenantId_id_key" ON "CompanyRecord"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CompetencyFramework_tenantId_createdAt_idx" ON "CompetencyFramework"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompetencyFramework_tenantId_name_version_key" ON "CompetencyFramework"("tenantId", "name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CompetencyFramework_tenantId_id_key" ON "CompetencyFramework"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Competency_tenantId_createdAt_idx" ON "Competency"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Competency_tenantId_id_key" ON "Competency"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CourseFramework_tenantId_createdAt_idx" ON "CourseFramework"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CourseFramework_tenantId_courseId_frameworkId_key" ON "CourseFramework"("tenantId", "courseId", "frameworkId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseFramework_tenantId_id_key" ON "CourseFramework"("tenantId", "id");

-- CreateIndex
CREATE INDEX "RubricDimension_tenantId_createdAt_idx" ON "RubricDimension"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RubricDimension_tenantId_id_key" ON "RubricDimension"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Evaluation_tenantId_createdAt_idx" ON "Evaluation"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_tenantId_id_key" ON "Evaluation"("tenantId", "id");

-- CreateIndex
CREATE INDEX "EvaluationScore_tenantId_createdAt_idx" ON "EvaluationScore"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationScore_tenantId_evaluationId_dimensionId_key" ON "EvaluationScore"("tenantId", "evaluationId", "dimensionId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationScore_tenantId_id_key" ON "EvaluationScore"("tenantId", "id");

-- CreateIndex
CREATE INDEX "EvaluationRevision_tenantId_createdAt_idx" ON "EvaluationRevision"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationRevision_tenantId_evaluationId_version_key" ON "EvaluationRevision"("tenantId", "evaluationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationRevision_tenantId_id_key" ON "EvaluationRevision"("tenantId", "id");

-- CreateIndex
CREATE INDEX "EvaluationScoreRevision_tenantId_createdAt_idx" ON "EvaluationScoreRevision"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationScoreRevision_tenantId_id_key" ON "EvaluationScoreRevision"("tenantId", "id");

-- CreateIndex
CREATE INDEX "DocumentType_tenantId_createdAt_idx" ON "DocumentType"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_tenantId_id_key" ON "DocumentType"("tenantId", "id");

-- CreateIndex
CREATE INDEX "RequirementSet_tenantId_createdAt_idx" ON "RequirementSet"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementSet_tenantId_id_key" ON "RequirementSet"("tenantId", "id");

-- CreateIndex
CREATE INDEX "DocumentRequirement_tenantId_createdAt_idx" ON "DocumentRequirement"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRequirement_tenantId_requirementSetId_documentTypeI_key" ON "DocumentRequirement"("tenantId", "requirementSetId", "documentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRequirement_tenantId_id_key" ON "DocumentRequirement"("tenantId", "id");

-- CreateIndex
CREATE INDEX "DocumentSubmission_tenantId_createdAt_idx" ON "DocumentSubmission"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSubmission_tenantId_placementId_documentTypeId_vers_key" ON "DocumentSubmission"("tenantId", "placementId", "documentTypeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSubmission_tenantId_id_key" ON "DocumentSubmission"("tenantId", "id");

-- CreateIndex
CREATE INDEX "IncidentCase_tenantId_createdAt_idx" ON "IncidentCase"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentCase_tenantId_id_key" ON "IncidentCase"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CaseHandler_tenantId_createdAt_idx" ON "CaseHandler"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseHandler_tenantId_caseId_userId_key" ON "CaseHandler"("tenantId", "caseId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseHandler_tenantId_id_key" ON "CaseHandler"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CaseMessage_tenantId_createdAt_idx" ON "CaseMessage"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseMessage_tenantId_id_key" ON "CaseMessage"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CaseAttachment_tenantId_createdAt_idx" ON "CaseAttachment"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseAttachment_tenantId_id_key" ON "CaseAttachment"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CaseEscalation_tenantId_createdAt_idx" ON "CaseEscalation"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseEscalation_tenantId_id_key" ON "CaseEscalation"("tenantId", "id");

-- CreateIndex
CREATE INDEX "SensitiveAccess_tenantId_createdAt_idx" ON "SensitiveAccess"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SensitiveAccess_tenantId_id_key" ON "SensitiveAccess"("tenantId", "id");

-- CreateIndex
CREATE INDEX "JobPosting_tenantId_createdAt_idx" ON "JobPosting"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobPosting_tenantId_id_key" ON "JobPosting"("tenantId", "id");

-- CreateIndex
CREATE INDEX "JobCompetency_tenantId_createdAt_idx" ON "JobCompetency"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobCompetency_tenantId_jobId_competencyId_key" ON "JobCompetency"("tenantId", "jobId", "competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "JobCompetency_tenantId_id_key" ON "JobCompetency"("tenantId", "id");

-- CreateIndex
CREATE INDEX "JobEligibility_tenantId_createdAt_idx" ON "JobEligibility"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobEligibility_tenantId_id_key" ON "JobEligibility"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Application_tenantId_createdAt_idx" ON "Application"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_tenantId_id_key" ON "Application"("tenantId", "id");

-- CreateIndex
CREATE INDEX "ApplicationHistory_tenantId_createdAt_idx" ON "ApplicationHistory"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationHistory_tenantId_id_key" ON "ApplicationHistory"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Announcement_tenantId_createdAt_idx" ON "Announcement"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Announcement_tenantId_id_key" ON "Announcement"("tenantId", "id");

-- CreateIndex
CREATE INDEX "AnnouncementAudience_tenantId_createdAt_idx" ON "AnnouncementAudience"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementAudience_tenantId_id_key" ON "AnnouncementAudience"("tenantId", "id");

-- CreateIndex
CREATE INDEX "ReadReceipt_tenantId_createdAt_idx" ON "ReadReceipt"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadReceipt_tenantId_announcementId_userId_key" ON "ReadReceipt"("tenantId", "announcementId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadReceipt_tenantId_id_key" ON "ReadReceipt"("tenantId", "id");

-- CreateIndex
CREATE INDEX "DirectoryProfile_tenantId_createdAt_idx" ON "DirectoryProfile"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryProfile_tenantId_id_key" ON "DirectoryProfile"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CompanyReview_tenantId_createdAt_idx" ON "CompanyReview"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyReview_tenantId_placementId_studentId_key" ON "CompanyReview"("tenantId", "placementId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyReview_tenantId_id_key" ON "CompanyReview"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CompletionChecklist_tenantId_createdAt_idx" ON "CompletionChecklist"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompletionChecklist_tenantId_id_key" ON "CompletionChecklist"("tenantId", "id");

-- CreateIndex
CREATE INDEX "ChecklistItem_tenantId_createdAt_idx" ON "ChecklistItem"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItem_tenantId_id_key" ON "ChecklistItem"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CompletionRecord_tenantId_createdAt_idx" ON "CompletionRecord"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompletionRecord_tenantId_placementId_key" ON "CompletionRecord"("tenantId", "placementId");

-- CreateIndex
CREATE UNIQUE INDEX "CompletionRecord_tenantId_id_key" ON "CompletionRecord"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CompletionItem_tenantId_createdAt_idx" ON "CompletionItem"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompletionItem_tenantId_completionId_itemId_key" ON "CompletionItem"("tenantId", "completionId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "CompletionItem_tenantId_id_key" ON "CompletionItem"("tenantId", "id");

-- CreateIndex
CREATE INDEX "PortfolioJob_tenantId_createdAt_idx" ON "PortfolioJob"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioJob_tenantId_placementId_version_key" ON "PortfolioJob"("tenantId", "placementId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioJob_tenantId_id_key" ON "PortfolioJob"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Notification_tenantId_createdAt_idx" ON "Notification"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_tenantId_id_key" ON "Notification"("tenantId", "id");

-- CreateIndex
CREATE INDEX "OutboxEvent_tenantId_status_nextAttemptAt_idx" ON "OutboxEvent"("tenantId", "status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_tenantId_createdAt_idx" ON "OutboxEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_tenantId_id_key" ON "OutboxEvent"("tenantId", "id");

-- CreateIndex
CREATE INDEX "BackgroundJob_tenantId_status_nextAttemptAt_idx" ON "BackgroundJob"("tenantId", "status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "BackgroundJob_tenantId_createdAt_idx" ON "BackgroundJob"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundJob_tenantId_id_key" ON "BackgroundJob"("tenantId", "id");

-- CreateIndex
CREATE INDEX "IdempotencyKey_tenantId_createdAt_idx" ON "IdempotencyKey"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_tenantId_actorId_action_key_key" ON "IdempotencyKey"("tenantId", "actorId", "action", "key");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_tenantId_id_key" ON "IdempotencyKey"("tenantId", "id");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_createdAt_idx" ON "AuditEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_tenantId_id_key" ON "AuditEvent"("tenantId", "id");

-- CreateIndex
CREATE INDEX "LoginAttempt_tenantId_createdAt_idx" ON "LoginAttempt"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoginAttempt_tenantId_keyHash_key" ON "LoginAttempt"("tenantId", "keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "LoginAttempt_tenantId_id_key" ON "LoginAttempt"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_tenantId_departmentId_fkey" FOREIGN KEY ("tenantId", "departmentId") REFERENCES "Department"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AcademicPeriod" ADD CONSTRAINT "AcademicPeriod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_tenantId_courseId_fkey" FOREIGN KEY ("tenantId", "courseId") REFERENCES "Course"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SupervisorProfile" ADD CONSTRAINT "SupervisorProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorProfile" ADD CONSTRAINT "SupervisorProfile_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_tenantId_companyId_fkey" FOREIGN KEY ("tenantId", "companyId") REFERENCES "Company"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_tenantId_supervisorId_fkey" FOREIGN KEY ("tenantId", "supervisorId") REFERENCES "SupervisorProfile"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CoursePolicyScope" ADD CONSTRAINT "CoursePolicyScope_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePolicyScope" ADD CONSTRAINT "CoursePolicyScope_tenantId_supervisorId_fkey" FOREIGN KEY ("tenantId", "supervisorId") REFERENCES "SupervisorProfile"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CoursePolicyScope" ADD CONSTRAINT "CoursePolicyScope_tenantId_courseId_fkey" FOREIGN KEY ("tenantId", "courseId") REFERENCES "Course"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "HoursPolicy" ADD CONSTRAINT "HoursPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoursPolicy" ADD CONSTRAINT "HoursPolicy_tenantId_courseId_fkey" FOREIGN KEY ("tenantId", "courseId") REFERENCES "Course"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "HoursPolicy" ADD CONSTRAINT "HoursPolicy_tenantId_periodId_fkey" FOREIGN KEY ("tenantId", "periodId") REFERENCES "AcademicPeriod"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "HoursPolicy" ADD CONSTRAINT "HoursPolicy_tenantId_authorId_fkey" FOREIGN KEY ("tenantId", "authorId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ClassSpace" ADD CONSTRAINT "ClassSpace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSpace" ADD CONSTRAINT "ClassSpace_tenantId_coordinatorId_fkey" FOREIGN KEY ("tenantId", "coordinatorId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ClassSpace" ADD CONSTRAINT "ClassSpace_tenantId_courseId_fkey" FOREIGN KEY ("tenantId", "courseId") REFERENCES "Course"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ClassSpace" ADD CONSTRAINT "ClassSpace_tenantId_periodId_fkey" FOREIGN KEY ("tenantId", "periodId") REFERENCES "AcademicPeriod"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "JoinCode" ADD CONSTRAINT "JoinCode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinCode" ADD CONSTRAINT "JoinCode_tenantId_classId_fkey" FOREIGN KEY ("tenantId", "classId") REFERENCES "ClassSpace"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_tenantId_classId_fkey" FOREIGN KEY ("tenantId", "classId") REFERENCES "ClassSpace"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_tenantId_studentId_fkey" FOREIGN KEY ("tenantId", "studentId") REFERENCES "StudentProfile"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_tenantId_studentId_fkey" FOREIGN KEY ("tenantId", "studentId") REFERENCES "StudentProfile"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_tenantId_companyId_fkey" FOREIGN KEY ("tenantId", "companyId") REFERENCES "Company"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_tenantId_periodId_fkey" FOREIGN KEY ("tenantId", "periodId") REFERENCES "AcademicPeriod"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_tenantId_classId_fkey" FOREIGN KEY ("tenantId", "classId") REFERENCES "ClassSpace"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_tenantId_policyId_fkey" FOREIGN KEY ("tenantId", "policyId") REFERENCES "HoursPolicy"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PlacementSupervisor" ADD CONSTRAINT "PlacementSupervisor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementSupervisor" ADD CONSTRAINT "PlacementSupervisor_tenantId_placementId_fkey" FOREIGN KEY ("tenantId", "placementId") REFERENCES "Placement"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PlacementSupervisor" ADD CONSTRAINT "PlacementSupervisor_tenantId_supervisorId_fkey" FOREIGN KEY ("tenantId", "supervisorId") REFERENCES "SupervisorProfile"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PolicyMigration" ADD CONSTRAINT "PolicyMigration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyMigration" ADD CONSTRAINT "PolicyMigration_tenantId_placementId_fkey" FOREIGN KEY ("tenantId", "placementId") REFERENCES "Placement"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PolicyMigration" ADD CONSTRAINT "PolicyMigration_tenantId_policyId_fkey" FOREIGN KEY ("tenantId", "policyId") REFERENCES "HoursPolicy"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PolicyMigration" ADD CONSTRAINT "PolicyMigration_tenantId_actorId_fkey" FOREIGN KEY ("tenantId", "actorId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_tenantId_placementId_fkey" FOREIGN KEY ("tenantId", "placementId") REFERENCES "Placement"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TimeInterval" ADD CONSTRAINT "TimeInterval_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeInterval" ADD CONSTRAINT "TimeInterval_tenantId_entryId_fkey" FOREIGN KEY ("tenantId", "entryId") REFERENCES "DailyEntry"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EntryRevision" ADD CONSTRAINT "EntryRevision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryRevision" ADD CONSTRAINT "EntryRevision_tenantId_entryId_fkey" FOREIGN KEY ("tenantId", "entryId") REFERENCES "DailyEntry"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EntryRevision" ADD CONSTRAINT "EntryRevision_tenantId_actorId_fkey" FOREIGN KEY ("tenantId", "actorId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "IntervalRevision" ADD CONSTRAINT "IntervalRevision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntervalRevision" ADD CONSTRAINT "IntervalRevision_tenantId_revisionId_fkey" FOREIGN KEY ("tenantId", "revisionId") REFERENCES "EntryRevision"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EntryConfirmation" ADD CONSTRAINT "EntryConfirmation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryConfirmation" ADD CONSTRAINT "EntryConfirmation_tenantId_entryId_fkey" FOREIGN KEY ("tenantId", "entryId") REFERENCES "DailyEntry"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EntryConfirmation" ADD CONSTRAINT "EntryConfirmation_tenantId_supervisorId_fkey" FOREIGN KEY ("tenantId", "supervisorId") REFERENCES "SupervisorProfile"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StorageObject" ADD CONSTRAINT "StorageObject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageObject" ADD CONSTRAINT "StorageObject_tenantId_ownerId_fkey" FOREIGN KEY ("tenantId", "ownerId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompanyRecord" ADD CONSTRAINT "CompanyRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRecord" ADD CONSTRAINT "CompanyRecord_tenantId_placementId_fkey" FOREIGN KEY ("tenantId", "placementId") REFERENCES "Placement"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompanyRecord" ADD CONSTRAINT "CompanyRecord_tenantId_objectId_fkey" FOREIGN KEY ("tenantId", "objectId") REFERENCES "StorageObject"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompetencyFramework" ADD CONSTRAINT "CompetencyFramework_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competency" ADD CONSTRAINT "Competency_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competency" ADD CONSTRAINT "Competency_tenantId_frameworkId_fkey" FOREIGN KEY ("tenantId", "frameworkId") REFERENCES "CompetencyFramework"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CourseFramework" ADD CONSTRAINT "CourseFramework_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseFramework" ADD CONSTRAINT "CourseFramework_tenantId_courseId_fkey" FOREIGN KEY ("tenantId", "courseId") REFERENCES "Course"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CourseFramework" ADD CONSTRAINT "CourseFramework_tenantId_frameworkId_fkey" FOREIGN KEY ("tenantId", "frameworkId") REFERENCES "CompetencyFramework"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "RubricDimension" ADD CONSTRAINT "RubricDimension_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricDimension" ADD CONSTRAINT "RubricDimension_tenantId_competencyId_fkey" FOREIGN KEY ("tenantId", "competencyId") REFERENCES "Competency"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_tenantId_placementId_fkey" FOREIGN KEY ("tenantId", "placementId") REFERENCES "Placement"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_tenantId_frameworkId_fkey" FOREIGN KEY ("tenantId", "frameworkId") REFERENCES "CompetencyFramework"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_tenantId_evaluatorId_fkey" FOREIGN KEY ("tenantId", "evaluatorId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EvaluationScore" ADD CONSTRAINT "EvaluationScore_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationScore" ADD CONSTRAINT "EvaluationScore_tenantId_evaluationId_fkey" FOREIGN KEY ("tenantId", "evaluationId") REFERENCES "Evaluation"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EvaluationScore" ADD CONSTRAINT "EvaluationScore_tenantId_dimensionId_fkey" FOREIGN KEY ("tenantId", "dimensionId") REFERENCES "RubricDimension"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EvaluationRevision" ADD CONSTRAINT "EvaluationRevision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationRevision" ADD CONSTRAINT "EvaluationRevision_tenantId_evaluationId_fkey" FOREIGN KEY ("tenantId", "evaluationId") REFERENCES "Evaluation"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EvaluationScoreRevision" ADD CONSTRAINT "EvaluationScoreRevision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationScoreRevision" ADD CONSTRAINT "EvaluationScoreRevision_tenantId_revisionId_fkey" FOREIGN KEY ("tenantId", "revisionId") REFERENCES "EvaluationRevision"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EvaluationScoreRevision" ADD CONSTRAINT "EvaluationScoreRevision_tenantId_dimensionId_fkey" FOREIGN KEY ("tenantId", "dimensionId") REFERENCES "RubricDimension"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DocumentType" ADD CONSTRAINT "DocumentType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementSet" ADD CONSTRAINT "RequirementSet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementSet" ADD CONSTRAINT "RequirementSet_tenantId_courseId_fkey" FOREIGN KEY ("tenantId", "courseId") REFERENCES "Course"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "RequirementSet" ADD CONSTRAINT "RequirementSet_tenantId_periodId_fkey" FOREIGN KEY ("tenantId", "periodId") REFERENCES "AcademicPeriod"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_tenantId_requirementSetId_fkey" FOREIGN KEY ("tenantId", "requirementSetId") REFERENCES "RequirementSet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_tenantId_documentTypeId_fkey" FOREIGN KEY ("tenantId", "documentTypeId") REFERENCES "DocumentType"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DocumentSubmission" ADD CONSTRAINT "DocumentSubmission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSubmission" ADD CONSTRAINT "DocumentSubmission_tenantId_placementId_fkey" FOREIGN KEY ("tenantId", "placementId") REFERENCES "Placement"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DocumentSubmission" ADD CONSTRAINT "DocumentSubmission_tenantId_documentTypeId_fkey" FOREIGN KEY ("tenantId", "documentTypeId") REFERENCES "DocumentType"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DocumentSubmission" ADD CONSTRAINT "DocumentSubmission_tenantId_objectId_fkey" FOREIGN KEY ("tenantId", "objectId") REFERENCES "StorageObject"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DocumentSubmission" ADD CONSTRAINT "DocumentSubmission_tenantId_reviewerId_fkey" FOREIGN KEY ("tenantId", "reviewerId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "IncidentCase" ADD CONSTRAINT "IncidentCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentCase" ADD CONSTRAINT "IncidentCase_tenantId_reporterId_fkey" FOREIGN KEY ("tenantId", "reporterId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "IncidentCase" ADD CONSTRAINT "IncidentCase_tenantId_placementId_fkey" FOREIGN KEY ("tenantId", "placementId") REFERENCES "Placement"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "IncidentCase" ADD CONSTRAINT "IncidentCase_tenantId_classId_fkey" FOREIGN KEY ("tenantId", "classId") REFERENCES "ClassSpace"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "IncidentCase" ADD CONSTRAINT "IncidentCase_tenantId_coordinatorId_fkey" FOREIGN KEY ("tenantId", "coordinatorId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CaseHandler" ADD CONSTRAINT "CaseHandler_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseHandler" ADD CONSTRAINT "CaseHandler_tenantId_caseId_fkey" FOREIGN KEY ("tenantId", "caseId") REFERENCES "IncidentCase"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CaseHandler" ADD CONSTRAINT "CaseHandler_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CaseMessage" ADD CONSTRAINT "CaseMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMessage" ADD CONSTRAINT "CaseMessage_tenantId_caseId_fkey" FOREIGN KEY ("tenantId", "caseId") REFERENCES "IncidentCase"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CaseMessage" ADD CONSTRAINT "CaseMessage_tenantId_authorId_fkey" FOREIGN KEY ("tenantId", "authorId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CaseAttachment" ADD CONSTRAINT "CaseAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAttachment" ADD CONSTRAINT "CaseAttachment_tenantId_caseId_fkey" FOREIGN KEY ("tenantId", "caseId") REFERENCES "IncidentCase"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CaseAttachment" ADD CONSTRAINT "CaseAttachment_tenantId_objectId_fkey" FOREIGN KEY ("tenantId", "objectId") REFERENCES "StorageObject"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CaseEscalation" ADD CONSTRAINT "CaseEscalation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEscalation" ADD CONSTRAINT "CaseEscalation_tenantId_caseId_fkey" FOREIGN KEY ("tenantId", "caseId") REFERENCES "IncidentCase"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CaseEscalation" ADD CONSTRAINT "CaseEscalation_tenantId_actorId_fkey" FOREIGN KEY ("tenantId", "actorId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CaseEscalation" ADD CONSTRAINT "CaseEscalation_tenantId_recipientId_fkey" FOREIGN KEY ("tenantId", "recipientId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SensitiveAccess" ADD CONSTRAINT "SensitiveAccess_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensitiveAccess" ADD CONSTRAINT "SensitiveAccess_tenantId_caseId_fkey" FOREIGN KEY ("tenantId", "caseId") REFERENCES "IncidentCase"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SensitiveAccess" ADD CONSTRAINT "SensitiveAccess_tenantId_actorId_fkey" FOREIGN KEY ("tenantId", "actorId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_tenantId_companyId_fkey" FOREIGN KEY ("tenantId", "companyId") REFERENCES "Company"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_tenantId_authorId_fkey" FOREIGN KEY ("tenantId", "authorId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "JobCompetency" ADD CONSTRAINT "JobCompetency_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCompetency" ADD CONSTRAINT "JobCompetency_tenantId_jobId_fkey" FOREIGN KEY ("tenantId", "jobId") REFERENCES "JobPosting"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "JobCompetency" ADD CONSTRAINT "JobCompetency_tenantId_competencyId_fkey" FOREIGN KEY ("tenantId", "competencyId") REFERENCES "Competency"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "JobEligibility" ADD CONSTRAINT "JobEligibility_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobEligibility" ADD CONSTRAINT "JobEligibility_tenantId_jobId_fkey" FOREIGN KEY ("tenantId", "jobId") REFERENCES "JobPosting"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "JobEligibility" ADD CONSTRAINT "JobEligibility_tenantId_courseId_fkey" FOREIGN KEY ("tenantId", "courseId") REFERENCES "Course"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_tenantId_jobId_fkey" FOREIGN KEY ("tenantId", "jobId") REFERENCES "JobPosting"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_tenantId_studentId_fkey" FOREIGN KEY ("tenantId", "studentId") REFERENCES "StudentProfile"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_tenantId_placementId_fkey" FOREIGN KEY ("tenantId", "placementId") REFERENCES "Placement"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ApplicationHistory" ADD CONSTRAINT "ApplicationHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationHistory" ADD CONSTRAINT "ApplicationHistory_tenantId_applicationId_fkey" FOREIGN KEY ("tenantId", "applicationId") REFERENCES "Application"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ApplicationHistory" ADD CONSTRAINT "ApplicationHistory_tenantId_actorId_fkey" FOREIGN KEY ("tenantId", "actorId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_tenantId_authorId_fkey" FOREIGN KEY ("tenantId", "authorId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AnnouncementAudience" ADD CONSTRAINT "AnnouncementAudience_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementAudience" ADD CONSTRAINT "AnnouncementAudience_tenantId_announcementId_fkey" FOREIGN KEY ("tenantId", "announcementId") REFERENCES "Announcement"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AnnouncementAudience" ADD CONSTRAINT "AnnouncementAudience_tenantId_departmentId_fkey" FOREIGN KEY ("tenantId", "departmentId") REFERENCES "Department"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AnnouncementAudience" ADD CONSTRAINT "AnnouncementAudience_tenantId_classId_fkey" FOREIGN KEY ("tenantId", "classId") REFERENCES "ClassSpace"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ReadReceipt" ADD CONSTRAINT "ReadReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadReceipt" ADD CONSTRAINT "ReadReceipt_tenantId_announcementId_fkey" FOREIGN KEY ("tenantId", "announcementId") REFERENCES "Announcement"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ReadReceipt" ADD CONSTRAINT "ReadReceipt_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DirectoryProfile" ADD CONSTRAINT "DirectoryProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryProfile" ADD CONSTRAINT "DirectoryProfile_tenantId_companyId_fkey" FOREIGN KEY ("tenantId", "companyId") REFERENCES "Company"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompanyReview" ADD CONSTRAINT "CompanyReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyReview" ADD CONSTRAINT "CompanyReview_tenantId_placementId_fkey" FOREIGN KEY ("tenantId", "placementId") REFERENCES "Placement"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompanyReview" ADD CONSTRAINT "CompanyReview_tenantId_companyId_fkey" FOREIGN KEY ("tenantId", "companyId") REFERENCES "Company"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompanyReview" ADD CONSTRAINT "CompanyReview_tenantId_studentId_fkey" FOREIGN KEY ("tenantId", "studentId") REFERENCES "StudentProfile"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompletionChecklist" ADD CONSTRAINT "CompletionChecklist_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletionChecklist" ADD CONSTRAINT "CompletionChecklist_tenantId_courseId_fkey" FOREIGN KEY ("tenantId", "courseId") REFERENCES "Course"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompletionChecklist" ADD CONSTRAINT "CompletionChecklist_tenantId_periodId_fkey" FOREIGN KEY ("tenantId", "periodId") REFERENCES "AcademicPeriod"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_tenantId_checklistId_fkey" FOREIGN KEY ("tenantId", "checklistId") REFERENCES "CompletionChecklist"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompletionRecord" ADD CONSTRAINT "CompletionRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletionRecord" ADD CONSTRAINT "CompletionRecord_tenantId_placementId_fkey" FOREIGN KEY ("tenantId", "placementId") REFERENCES "Placement"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompletionRecord" ADD CONSTRAINT "CompletionRecord_tenantId_checklistId_fkey" FOREIGN KEY ("tenantId", "checklistId") REFERENCES "CompletionChecklist"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompletionRecord" ADD CONSTRAINT "CompletionRecord_tenantId_decidedById_fkey" FOREIGN KEY ("tenantId", "decidedById") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompletionItem" ADD CONSTRAINT "CompletionItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletionItem" ADD CONSTRAINT "CompletionItem_tenantId_completionId_fkey" FOREIGN KEY ("tenantId", "completionId") REFERENCES "CompletionRecord"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompletionItem" ADD CONSTRAINT "CompletionItem_tenantId_itemId_fkey" FOREIGN KEY ("tenantId", "itemId") REFERENCES "ChecklistItem"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PortfolioJob" ADD CONSTRAINT "PortfolioJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioJob" ADD CONSTRAINT "PortfolioJob_tenantId_placementId_fkey" FOREIGN KEY ("tenantId", "placementId") REFERENCES "Placement"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PortfolioJob" ADD CONSTRAINT "PortfolioJob_tenantId_requestedById_fkey" FOREIGN KEY ("tenantId", "requestedById") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PortfolioJob" ADD CONSTRAINT "PortfolioJob_tenantId_artifactId_fkey" FOREIGN KEY ("tenantId", "artifactId") REFERENCES "StorageObject"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_tenantId_actorId_fkey" FOREIGN KEY ("tenantId", "actorId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenantId_actorId_fkey" FOREIGN KEY ("tenantId", "actorId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Additional invariant constraints not expressible in Prisma schema.
ALTER TABLE "HoursPolicy" ADD CONSTRAINT "hours_policy_positive" CHECK ("requiredMinutes" > 0);
ALTER TABLE "Placement" ADD CONSTRAINT "placement_date_order" CHECK ("endsAt" > "startsAt");
ALTER TABLE "TimeInterval" ADD CONSTRAINT "time_interval_valid" CHECK ("endsAt" > "startsAt" AND "breakMinutes" >= 0 AND "elapsedMinutes" > 0);
ALTER TABLE "CompanyReview" ADD CONSTRAINT "review_rating" CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE "JobPosting" ADD CONSTRAINT "job_openings_positive" CHECK (openings > 0);
CREATE UNIQUE INDEX "single_active_placement" ON "Placement" ("tenantId", "studentId", "periodId") WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX "single_active_application" ON "Application" ("tenantId", "jobId", "studentId") WHERE status IN ('SUBMITTED', 'SHORTLISTED', 'ACCEPTED');
ALTER TABLE "AnnouncementAudience" ADD CONSTRAINT "audience_consistency" CHECK ((scope = 'UNIVERSITY' AND "departmentId" IS NULL AND "classId" IS NULL) OR (scope = 'DEPARTMENT' AND "departmentId" IS NOT NULL AND "classId" IS NULL) OR (scope = 'CLASS' AND "classId" IS NOT NULL AND "departmentId" IS NULL));
