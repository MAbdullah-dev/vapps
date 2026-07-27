import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ checklistId: string }> }
) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { checklistId } = await params;
    const body = await req.json().catch(() => ({}));
    const clause = (body.clause ?? "").trim();
    const subclause = (body.subclause ?? "").trim();
    const requirement = (body.requirement ?? "").trim();
    const question = (body.question ?? "").trim();
    const evidenceExample = (body.evidenceExample ?? body.evidence_example ?? "").trim();
    const sortOrder =
      typeof body.sortOrder === "number" ? body.sortOrder : (body.sort_order ?? 0);

    const checklist = await prisma.auditChecklist.findUnique({
      where: { id: checklistId },
      select: { id: true },
    });
    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    const created = await prisma.auditChecklistQuestion.create({
      data: {
        auditChecklistId: checklistId,
        clause,
        subclause,
        requirement,
        question,
        evidenceExample,
        sortOrder,
      },
      select: {
        id: true,
        clause: true,
        subclause: true,
        requirement: true,
        question: true,
        evidenceExample: true,
        sortOrder: true,
      },
    });

    return NextResponse.json({ question: created });
  } catch (error) {
    console.error("Admin: error adding global checklist question:", error);
    return NextResponse.json({ error: "Failed to add question" }, { status: 500 });
  }
}
