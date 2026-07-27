import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { listGlobalAuditChecklists } from "@/lib/global-audit-checklists";

export async function GET(req: NextRequest) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const checklists = await listGlobalAuditChecklists();
    return NextResponse.json({ checklists });
  } catch (error) {
    console.error("Admin: error listing global audit checklists:", error);
    return NextResponse.json({ error: "Failed to list audit checklists" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const name = (body.name ?? body.title ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const checklist = await prisma.auditChecklist.create({
      data: { name },
      select: { id: true, name: true },
    });

    return NextResponse.json({ checklist });
  } catch (error) {
    console.error("Admin: error creating global audit checklist:", error);
    return NextResponse.json({ error: "Failed to create audit checklist" }, { status: 500 });
  }
}
