import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ checklistId: string; questionId: string }> }
) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { checklistId, questionId } = await params;
    const body = await req.json().catch(() => ({}));
    const data: {
      clause?: string;
      subclause?: string;
      requirement?: string;
      question?: string;
      evidenceExample?: string;
      sortOrder?: number;
    } = {};

    if (body.clause !== undefined) data.clause = (body.clause ?? "").trim();
    if (body.subclause !== undefined) data.subclause = (body.subclause ?? "").trim();
    if (body.requirement !== undefined) data.requirement = (body.requirement ?? "").trim();
    if (body.question !== undefined) data.question = (body.question ?? "").trim();
    if (body.evidenceExample !== undefined) data.evidenceExample = (body.evidenceExample ?? "").trim();
    if (body.evidence_example !== undefined) data.evidenceExample = (body.evidence_example ?? "").trim();
    if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
    if (typeof body.sort_order === "number") data.sortOrder = body.sort_order;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    try {
      await prisma.auditChecklistQuestion.update({
        where: { id: questionId, auditChecklistId: checklistId },
        data,
      });
    } catch {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin: error updating global checklist question:", error);
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ checklistId: string; questionId: string }> }
) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { checklistId, questionId } = await params;

    try {
      await prisma.auditChecklistQuestion.delete({
        where: { id: questionId, auditChecklistId: checklistId },
      });
    } catch {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin: error deleting global checklist question:", error);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}
