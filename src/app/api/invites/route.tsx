import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-server-session";
import { withTenantConnection } from "@/lib/db/connection-helper";
import { logger } from "@/lib/logger";
import { normalizeRole } from "@/lib/roles";
import { sendInvitationEmail } from "@/helpers/mailer";

export async function POST(req: NextRequest) {
  let bodyData: { orgId?: string; email?: string } = {};
  
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    bodyData = body; // Store for error logging
    const { orgId, siteId, processId, email, fullName, role = "member", jobTitle } = body;
    
    // Log jobTitle for debugging
    logger.info("Creating invitation with jobTitle", {
      email,
      jobTitle: jobTitle || "null/undefined",
      jobTitleType: typeof jobTitle,
    });

    // Validation: orgId and email always required
    if (!orgId || !email) {
      return NextResponse.json(
        { error: "orgId and email are required" },
        { status: 400 }
      );
    }

    // Top Leadership (admin): siteId/processId optional. Operational/Support: siteId required.
    const normalizedRoleForValidation = normalizeRole(role);
    const isTopLeadership = normalizedRoleForValidation === "admin" || normalizedRoleForValidation === "owner";
    if (!isTopLeadership && !siteId) {
      return NextResponse.json(
        { error: "siteId is required for Operational and Support leadership" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate org exists and get database connection
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { database: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (!org.database) {
      return NextResponse.json(
        { error: "Tenant database not found" },
        { status: 404 }
      );
    }

    // Normalize role
    const normalizedRole = normalizeRole(role);

    // Check for existing pending invite for same org + email
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        organizationId: orgId,
        email,
        status: "pending",
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "A pending invitation already exists for this email in this organization" },
        { status: 409 }
      );
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

    // Create new invitation in master DB
    // Ensure jobTitle is a string or null (not undefined or empty string)
    const jobTitleValue = jobTitle && typeof jobTitle === "string" && jobTitle.trim() !== "" 
      ? jobTitle.trim() 
      : null;
    
    // Ensure name is a string or null
    const nameValue = fullName && typeof fullName === "string" && fullName.trim() !== ""
      ? fullName.trim()
      : null;
    
    const masterInvite = await prisma.invitation.create({
      data: {
        token,
        organizationId: orgId,
        email,
        name: nameValue, // Store user's name in invitation
        role: normalizedRole, // Store role in master DB for easier listing
        jobTitle: jobTitleValue, // Store jobTitle in master DB
        siteId: siteId ?? null, // Store siteId in master DB
        processId: processId ?? null, // Store processId in master DB
        status: "pending",
        expiresAt,
        invitedBy: user.id,
      },
    });
    
    logger.info("Invitation created with jobTitle", {
      inviteId: masterInvite.id,
      email,
      jobTitle: masterInvite.jobTitle || "null",
    });

    // Store tenant-specific invitation
    // Note: jobTitle is stored in master DB only, read from masterInvite when accepting
    await withTenantConnection(org.database.connectionString, async (client) => {
      await client.query(
        `
        INSERT INTO invitations
        (email, site_id, process_id, role, token, invited_by, expires_at, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
        `,
        [
          email,
          siteId ?? null,
          processId ?? null,
          normalizedRole,
          token,
          user.id,
          expiresAt,
        ]
      );
    });

    // Send invitation email
    try {
      await sendInvitationEmail({
        email,
        token,
        organizationName: org.name,
        inviterName: user.name || undefined,
        role: normalizedRole,
      });
      logger.info("Invitation email sent", {
        inviteId: masterInvite.id,
        email,
      });
    } catch (emailError) {
      // Log email error but don't fail the request
      // The invitation is already created in the database
      logger.error("Failed to send invitation email", emailError, {
        inviteId: masterInvite.id,
        email,
      });
    }

    logger.info("Invitation created", {
      inviteId: masterInvite.id,
      orgId,
      email,
      role: normalizedRole,
      invitedBy: user.id,
    });

    return NextResponse.json({
      success: true,
      inviteLink: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/invite?token=${token}`,
    });
  } catch (err) {
    logger.error("Failed to create invitation", err, {
      orgId: bodyData.orgId,
      email: bodyData.email,
    });

    // Handle duplicate token (should be extremely rare)
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Token collision occurred. Please try again." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}
