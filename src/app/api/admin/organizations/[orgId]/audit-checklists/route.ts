import { NextRequest, NextResponse } from "next/server";
import { withTenantConnection } from "@/lib/db/connection-helper";
import { requireAdminTenantConnection } from "@/lib/admin-tenant-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const access = await requireAdminTenantConnection(req, orgId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const checklists: { id: string; name: string; questionCount: number; createdAt: string }[] = [];

    await withTenantConnection(access.connectionString, async (client) => {
      const tableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_checklists'`
      );
      if (tableCheck.rows.length === 0) return;

      const result = await client.query(
        `SELECT c.id, c.name, c.created_at,
                (SELECT COUNT(*)::int FROM audit_checklist_questions q WHERE q.audit_checklist_id = c.id) as question_count
         FROM audit_checklists c
         ORDER BY c.name`
      );
      for (const row of result.rows) {
        checklists.push({
          id: row.id,
          name: row.name ?? "",
          questionCount: row.question_count ?? 0,
          createdAt: row.created_at ?? new Date().toISOString(),
        });
      }
    });

    return NextResponse.json({ checklists });
  } catch (error) {
    console.error("Admin: error listing audit checklists:", error);
    return NextResponse.json({ error: "Failed to list audit checklists" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const access = await requireAdminTenantConnection(req, orgId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json().catch(() => ({}));
    const name = (body.name ?? body.title ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    let checklist: { id: string; name: string } | null = null;

    await withTenantConnection(access.connectionString, async (client) => {
      await client.query(
        `CREATE TABLE IF NOT EXISTS audit_checklists (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )`
      );
      await client.query(
        `CREATE TABLE IF NOT EXISTS audit_checklist_questions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          audit_checklist_id uuid NOT NULL REFERENCES audit_checklists(id) ON DELETE CASCADE,
          clause text NOT NULL DEFAULT '',
          subclause text NOT NULL DEFAULT '',
          requirement text NOT NULL DEFAULT '',
          question text NOT NULL DEFAULT '',
          evidence_example text NOT NULL DEFAULT '',
          sort_order int NOT NULL DEFAULT 0,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )`
      );
      const insert = await client.query(
        `INSERT INTO audit_checklists (name) VALUES ($1) RETURNING id, name`,
        [name]
      );
      checklist = { id: insert.rows[0].id, name: insert.rows[0].name };
    });

    return NextResponse.json({ checklist });
  } catch (error) {
    console.error("Admin: error creating audit checklist:", error);
    return NextResponse.json({ error: "Failed to create audit checklist" }, { status: 500 });
  }
}
