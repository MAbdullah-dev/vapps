import { prisma } from "@/lib/prisma";

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

export async function listGlobalAuditChecklists(): Promise<GlobalChecklistSummary[]> {
  const rows = await prisma.auditChecklist.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { questions: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    questionCount: c._count.questions,
    createdAt: c.createdAt.toISOString(),
  }));
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
  const rows = await prisma.auditChecklistQuestion.findMany({
    where: { auditChecklistId: checklistId },
    orderBy: [{ sortOrder: "asc" }, { clause: "asc" }, { subclause: "asc" }],
  });
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
