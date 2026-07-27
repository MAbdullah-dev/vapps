-- Global audit checklists in master DB (platform admin managed, shared by all tenants).

CREATE TABLE "audit_checklists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_checklists_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_checklists_name_idx" ON "audit_checklists"("name");

CREATE TABLE "audit_checklist_questions" (
    "id" TEXT NOT NULL,
    "audit_checklist_id" TEXT NOT NULL,
    "clause" TEXT NOT NULL DEFAULT '',
    "subclause" TEXT NOT NULL DEFAULT '',
    "requirement" TEXT NOT NULL DEFAULT '',
    "question" TEXT NOT NULL DEFAULT '',
    "evidence_example" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_checklist_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_checklist_questions_audit_checklist_id_idx" ON "audit_checklist_questions"("audit_checklist_id");

ALTER TABLE "audit_checklist_questions" ADD CONSTRAINT "audit_checklist_questions_audit_checklist_id_fkey" FOREIGN KEY ("audit_checklist_id") REFERENCES "audit_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
