import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { CRITERIA_TO_CHECKLIST_KEY, PROGRAM_CRITERIA_TO_CHECKLIST_KEY } from "@/lib/audit-checklists";
import iso9001Questions from "@/lib/audit-checklists/iso-9001.json";
import iso14001Questions from "@/lib/audit-checklists/iso-14001.json";

type ChecklistItem = {
  clause: string;
  subclause: string;
  requirement: string;
  question: string;
  evidenceExample: string;
};

const CHECKLIST_BY_KEY: Record<string, ChecklistItem[]> = {
  "iso-9001": iso9001Questions as ChecklistItem[],
  "iso-14001": iso14001Questions as ChecklistItem[],
};

/**
 * GET /api/organization/[orgId]/audit/checklist-questions
 * Query: ?criteria=ISO%209001%20QUALITY  OR  ?programCriteria=iso
 * Returns predefined checklist questions based on the audit criteria selected in Step 2.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const criteria = searchParams.get("criteria")?.trim();
    const programCriteria = searchParams.get("programCriteria")?.trim();

    let checklistKey: string | null = null;
    if (criteria) {
      checklistKey = CRITERIA_TO_CHECKLIST_KEY[criteria] ?? null;
    }
    if (!checklistKey && programCriteria) {
      checklistKey = PROGRAM_CRITERIA_TO_CHECKLIST_KEY[programCriteria] ?? null;
    }

    if (!checklistKey) {
      return NextResponse.json({
        questions: [],
        criteria: criteria ?? programCriteria ?? null,
        checklistKey: null,
        message: criteria || programCriteria ? "No predefined questions for this criteria." : "Provide criteria or programCriteria query param.",
      });
    }

    const questions = CHECKLIST_BY_KEY[checklistKey] ?? [];

    return NextResponse.json({
      questions,
      criteria: criteria ?? programCriteria,
      checklistKey,
    });
  } catch (error) {
    console.error("Error fetching checklist questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist questions" },
      { status: 500 }
    );
  }
}
