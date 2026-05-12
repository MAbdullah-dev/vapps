import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getTenantClient } from "@/lib/db/tenant-pool";
import crypto from "crypto";
import type { PoolClient } from "pg";

/** Keeps older tenant DBs compatible with the profile UI (matches 025 migration). */
async function ensureOrganizationInfoProfileColumns(client: PoolClient) {
  const stmts = [
    `ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "legalName" TEXT`,
    `ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "taxId" TEXT`,
    `ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "companySize" TEXT`,
    `ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "foundedDate" TEXT`,
    `ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "supportEmail" TEXT`,
    `ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "fax" TEXT`,
    `ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "brandColor" TEXT`,
    `ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "brandFont" TEXT`,
    `ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "logo" TEXT`,
  ];
  for (const sql of stmts) {
    await client.query(sql);
  }
}

/**
 * GET /api/organization/[orgId]/organization-info
 * Get organization info from tenant database
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use tenant pool instead of new Client()
    const client = await getTenantClient(orgId);

    try {
      // Get organization info
      const result = await client.query(
        `SELECT * FROM organization_info ORDER BY "createdAt" DESC LIMIT 1`
      );

      client.release();

      if (result.rows.length === 0) {
        return NextResponse.json({
          organizationInfo: null,
        });
      }

      return NextResponse.json({
        organizationInfo: result.rows[0],
      });
    } catch (dbError: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to fetch organization info", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching organization info:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organization/[orgId]/organization-info
 * Update organization info in tenant database
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const body = await req.json();

    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use tenant pool instead of new Client()
    const client = await getTenantClient(orgId);

    try {
      await ensureOrganizationInfoProfileColumns(client);

      // Check if organization info exists
      const existingResult = await client.query(
        `SELECT id FROM organization_info ORDER BY "createdAt" DESC LIMIT 1`
      );

      const b = body as Record<string, unknown>;
      const contactEmailVal =
        (b.contactEmail as string | undefined) ?? (b.primaryEmail as string | undefined);

      const {
        name,
        legalName,
        registrationId,
        taxId,
        address,
        contactName,
        contactEmail,
        phone,
        fax,
        website,
        industry,
        companySize,
        foundedDate,
        supportEmail,
        brandColor,
        brandFont,
        logo,
      } = b as {
        name?: string;
        legalName?: string;
        registrationId?: string;
        taxId?: string;
        address?: string;
        contactName?: string;
        contactEmail?: string;
        phone?: string;
        fax?: string;
        website?: string;
        industry?: string;
        companySize?: string;
        foundedDate?: string;
        supportEmail?: string;
        brandColor?: string;
        brandFont?: string;
        logo?: string | null;
      };

      const emailForRow = contactEmail !== undefined ? contactEmail : contactEmailVal;

      const nullIfEmpty = (v: unknown) => {
        if (v === undefined || v === null) return null;
        if (typeof v === "string" && v.trim() === "") return null;
        return v;
      };

      if (existingResult.rows.length === 0) {
        const id = crypto.randomUUID();
        await client.query(
          `INSERT INTO organization_info (
            id, name, "legalName", "registrationId", "taxId", address, "contactName",
            "contactEmail", phone, fax, website, industry, "companySize", "foundedDate",
            "supportEmail", "brandColor", "brandFont", logo,
            "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
          )`,
          [
            id,
            (name as string) || "Organization",
            nullIfEmpty(legalName),
            nullIfEmpty(registrationId),
            nullIfEmpty(taxId),
            nullIfEmpty(address),
            nullIfEmpty(contactName),
            nullIfEmpty(emailForRow),
            nullIfEmpty(phone),
            nullIfEmpty(fax),
            nullIfEmpty(website),
            nullIfEmpty(industry),
            nullIfEmpty(companySize),
            nullIfEmpty(foundedDate),
            nullIfEmpty(supportEmail),
            nullIfEmpty(brandColor),
            nullIfEmpty(brandFont),
            logo === null || logo === "" ? null : (logo as string) ?? null,
          ]
        );
      } else {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        const add = (colSql: string, val: unknown) => {
          updates.push(`${colSql} = $${paramIndex++}`);
          values.push(val);
        };

        if (name !== undefined) add("name", name || "Organization");
        if (legalName !== undefined) add(`"legalName"`, nullIfEmpty(legalName));
        if (registrationId !== undefined) add(`"registrationId"`, nullIfEmpty(registrationId));
        if (taxId !== undefined) add(`"taxId"`, nullIfEmpty(taxId));
        if (address !== undefined) add("address", nullIfEmpty(address));
        if (contactName !== undefined) add(`"contactName"`, nullIfEmpty(contactName));
        if (contactEmail !== undefined || b.primaryEmail !== undefined) {
          add(`"contactEmail"`, nullIfEmpty(emailForRow));
        }
        if (phone !== undefined) add("phone", nullIfEmpty(phone));
        if (fax !== undefined) add("fax", nullIfEmpty(fax));
        if (website !== undefined) add("website", nullIfEmpty(website));
        if (industry !== undefined) add("industry", nullIfEmpty(industry));
        if (companySize !== undefined) add(`"companySize"`, nullIfEmpty(companySize));
        if (foundedDate !== undefined) add(`"foundedDate"`, nullIfEmpty(foundedDate));
        if (supportEmail !== undefined) add(`"supportEmail"`, nullIfEmpty(supportEmail));
        if (brandColor !== undefined) add(`"brandColor"`, nullIfEmpty(brandColor));
        if (brandFont !== undefined) add(`"brandFont"`, nullIfEmpty(brandFont));
        if (logo !== undefined) {
          add("logo", logo === null || logo === "" ? null : logo);
        }

        if (updates.length > 0) {
          updates.push(`"updatedAt" = NOW()`);
          values.push(existingResult.rows[0].id);

          await client.query(
            `UPDATE organization_info SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
            values
          );
        }
      }

      // Fetch updated organization info
      const updatedResult = await client.query(
        `SELECT * FROM organization_info ORDER BY "createdAt" DESC LIMIT 1`
      );

      client.release();

      return NextResponse.json({
        message: "Organization info updated successfully",
        organizationInfo: updatedResult.rows[0],
      });
    } catch (dbError: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to update organization info", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error updating organization info:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
