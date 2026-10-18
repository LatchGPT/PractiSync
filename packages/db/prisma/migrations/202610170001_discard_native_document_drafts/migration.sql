ALTER TABLE "native_generated_documents" ALTER COLUMN "draft_id" DROP NOT NULL;

ALTER TABLE "native_generated_documents"
  DROP CONSTRAINT IF EXISTS "native_generated_documents_draft_id_fkey";

ALTER TABLE "native_generated_documents"
  ADD CONSTRAINT "native_generated_documents_draft_id_fkey"
  FOREIGN KEY ("draft_id") REFERENCES "native_document_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
