import { prisma } from "@/lib/prisma";
import {
  getDefaultChecklistQuestionsById,
  listDefaultAuditChecklistSummaries,
  seedDefaultAuditChecklists,
} from "@/lib/seed-default-audit-checklists";

export type GlobalChecklistSummary = {
  id: string;
  name: string;
  questionCount: number;
  createdAt: string;
};

export type GlobalChecklistQuestion = {
  id: string;
  clause: string;
  subclause: string;
  requirement: string;
  question: string;
  evidenceExample: string;
  sortOrder: number;
};

function fallbackChecklistSummaries(): GlobalChecklistSummary[] {
  const now = new Date().toISOString();
  return listDefaultAuditChecklistSummaries().map((c) => ({
    id: c.id,
    name: c.name,
    questionCount: 0,
    createdAt: now,
  }));
}

export async function listGlobalAuditChecklists(): Promise<GlobalChecklistSummary[]> {
  try {
    let rows = await prisma.auditChecklist.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { questions: true } } },
    });
    if (rows.length === 0) {
      await seedDefaultAuditChecklists(prisma);
      rows = await prisma.auditChecklist.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { questions: true } } },
      });
    }
    if (rows.length === 0) return fallbackChecklistSummaries();
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      questionCount: c._count.questions,
      createdAt: c.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Error listing global audit checklists:", error);
    return fallbackChecklistSummaries();
  }
}

export async function getGlobalAuditChecklist(checklistId: string) {
  const row = await prisma.auditChecklist.findUnique({
    where: { id: checklistId },
    include: {
      questions: {
        orderBy: [{ sortOrder: "asc" }, { clause: "asc" }, { subclause: "asc" }],
      },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    questions: row.questions.map((q) => ({
      id: q.id,
      clause: q.clause,
      subclause: q.subclause,
      requirement: q.requirement,
      question: q.question,
      evidenceExample: q.evidenceExample,
      sortOrder: q.sortOrder,
    })),
  };
}

export async function getGlobalChecklistQuestionsByChecklistId(
  checklistId: string
): Promise<GlobalChecklistQuestion[]> {
  try {
    const rows = await prisma.auditChecklistQuestion.findMany({
      where: { auditChecklistId: checklistId },
      orderBy: [{ sortOrder: "asc" }, { clause: "asc" }, { subclause: "asc" }],
    });
    if (rows.length > 0) {
      return rows.map((q) => ({
        id: q.id,
        clause: q.clause,
        subclause: q.subclause,
        requirement: q.requirement,
        question: q.question,
        evidenceExample: q.evidenceExample,
        sortOrder: q.sortOrder,
      }));
    }
  } catch (error) {
    console.error("Error loading checklist questions:", error);
  }

  const fallback = getDefaultChecklistQuestionsById(checklistId);
  if (!fallback) return [];
  return fallback.map((q, index) => ({
    id: `${checklistId}-${index}`,
    clause: q.clause,
    subclause: q.subclause,
    requirement: q.requirement,
    question: q.question,
    evidenceExample: q.evidenceExample,
    sortOrder: index,
  }));
}
