import type { PrismaClient } from "@prisma/client";
import iso9001 from "@/lib/audit-checklists/iso-9001.json";
import iso14001 from "@/lib/audit-checklists/iso-14001.json";
import iso45001 from "@/lib/audit-checklists/iso-45001.json";
import iso27001 from "@/lib/audit-checklists/iso-27001.json";
import iatf16949 from "@/lib/audit-checklists/iatf-16949.json";

type QuestionSeed = {
  clause: string;
  subclause: string;
  requirement: string;
  question: string;
  evidenceExample: string;
};

/** Stable IDs aligned with tenant migration 018 for existing audit plan links. */
const DEFAULT_CHECKLISTS: { id: string; name: string; questions: QuestionSeed[] }[] = [
  { id: "a1000001-9001-4001-8001-000000000001", name: "ISO 9001 QUALITY", questions: iso9001 as QuestionSeed[] },
  { id: "a1000002-1400-4002-8001-000000000002", name: "ISO 14001 ENVIRONMENT", questions: iso14001 as QuestionSeed[] },
  { id: "a1000003-4500-4003-8001-000000000003", name: "ISO 45001 HEALTH & SAFETY", questions: iso45001 as QuestionSeed[] },
  { id: "a1000004-2700-4004-8001-000000000004", name: "ISO 27001 INFORMATION SECURITY", questions: iso27001 as QuestionSeed[] },
  { id: "a1000005-1694-4005-8001-000000000005", name: "IATF 16949", questions: iatf16949 as QuestionSeed[] },
];

export async function seedDefaultAuditChecklists(db: PrismaClient): Promise<void> {
  for (const checklist of DEFAULT_CHECKLISTS) {
    const existing = await db.auditChecklist.findUnique({
      where: { id: checklist.id },
      include: { _count: { select: { questions: true } } },
    });

    if (!existing) {
      await db.auditChecklist.create({
        data: {
          id: checklist.id,
          name: checklist.name,
          questions: {
            create: checklist.questions.map((q, index) => ({
              clause: q.clause,
              subclause: q.subclause,
              requirement: q.requirement,
              question: q.question,
              evidenceExample: q.evidenceExample,
              sortOrder: index,
            })),
          },
        },
      });
      console.log(`[seed] Created global audit checklist: ${checklist.name}`);
      continue;
    }

    if (existing._count.questions === 0 && checklist.questions.length > 0) {
      await db.auditChecklistQuestion.createMany({
        data: checklist.questions.map((q, index) => ({
          auditChecklistId: checklist.id,
          clause: q.clause,
          subclause: q.subclause,
          requirement: q.requirement,
          question: q.question,
          evidenceExample: q.evidenceExample,
          sortOrder: index,
        })),
      });
      console.log(`[seed] Seeded questions for: ${checklist.name}`);
    }
  }
}
