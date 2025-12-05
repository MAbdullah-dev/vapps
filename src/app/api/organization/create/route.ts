import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";
import { createTenantDatabase, runTenantMigrations } from "@/lib/db-creator";
import { storeTenantData } from "@/lib/store-tenant-data";
import { OnboardingData } from "@/store/onboardingStore";
import { z } from "zod";

/**
 * Validation schema for organization creation
 */
const createOrganizationSchema = z.object({
  step1: z.object({
    companyName: z.string().min(1, "Company name is required"),
    registrationId: z.string().optional(),
    address: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    industry: z.string().optional(),
  }),
  step2: z.object({
    sites: z.array(
      z.object({
        siteName: z.string(),
        siteCode: z.string().optional(), // Auto-generated if not provided
        location: z.string(),
        processes: z.array(z.string()).optional(),
      })
    ).optional().default([]),
  }),
  step3: z.object({
    leaders: z.array(
      z.object({
        name: z.string(),
        role: z.string(),
        level: z.string(),
        email: z.string().email().optional(),
      })
    ).optional().default([]),
  }),
  step4: z.object({
    teamMembers: z.array(
      z.object({
        fullName: z.string(),
        email: z.string().email(),
        role: z.string(),
        ssoMethod: z.string().optional(),
      })
    ).optional().default([]),
  }),
  step5: z.object({
    baseCurrency: z.string().optional(),
    fiscalYearStart: z.string().optional(),
    defaultTaxRate: z.string().optional(),
    paymentTerms: z.string().optional(),
    chartOfAccountsTemplate: z.string().optional(),
    defaultAssetAccount: z.string().optional(),
    defaultRevenueAccount: z.string().optional(),
    defaultExpenseAccount: z.string().optional(),
  }),
  step6: z.object({
    products: z.array(
      z.object({
        sku: z.string().optional(),
        name: z.string(),
        category: z.string().optional(),
        unit: z.string().optional(),
        cost: z.string().optional(),
        reorder: z.string().optional(),
      })
    ).optional().default([]),
  }),
  step7: z.object({
    activeTab: z.enum(["customers", "vendors"]).optional(),
    customers: z.array(
      z.object({
        name: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
      })
    ).optional().default([]),
    vendors: z.array(
      z.object({
        name: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
      })
    ).optional().default([]),
  }),
  step8: z.object({
    multiLevelApprovals: z.boolean().optional(),
    automaticTaskAssignment: z.boolean().optional(),
    criticalSLA: z.string().optional(),
    highPrioritySLA: z.string().optional(),
    mediumPrioritySLA: z.string().optional(),
    lowPrioritySLA: z.string().optional(),
    emailNotifications: z.boolean().optional(),
    inAppNotifications: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
    escalationRules: z.string().optional(),
  }),
  step9: z.object({
    widgets: z.object({
      tasksCompleted: z.boolean().optional(),
      complianceScore: z.boolean().optional(),
      workloadByUser: z.boolean().optional(),
      overdueTasks: z.boolean().optional(),
      issueDistribution: z.boolean().optional(),
      auditTrend: z.boolean().optional(),
      projectProgress: z.boolean().optional(),
      documentVersion: z.boolean().optional(),
    }),
    reportFrequency: z.string().optional(),
  }),
  step10: z.object({
    require2FA: z.boolean().optional(),
    ipWhitelisting: z.boolean().optional(),
    sessionTimeout: z.boolean().optional(),
    passwordPolicy: z.string().optional(),
    sessionDuration: z.string().optional(),
    logAllActions: z.boolean().optional(),
    logRetention: z.string().optional(),
    backupFrequency: z.string().optional(),
    backupRetention: z.string().optional(),
  }),
});

/**
 * POST /api/organization/create
 * Creates a new organization with tenant database
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to create an organization." },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    let body: OnboardingData;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate data structure
    const validationResult = createOrganizationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid organization data",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 3. Validate required fields
    if (!data.step1.companyName || data.step1.companyName.trim().length === 0) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    // 4. Check if user already owns an organization (limit: 1 org per user)
    const existingOrg = await prisma.organization.findFirst({
      where: {
        ownerId: user.id,
      },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "You can only create one organization. You already own an organization." },
        { status: 409 }
      );
    }

    // 5. Create organization in master database (transaction)
    let organization;
    let dbInstance;

    try {
      // Start transaction: Create organization and database instance
      organization = await prisma.organization.create({
        data: {
          name: data.step1.companyName.trim(),
          ownerId: user.id,
        },
      });

      // 6. Create tenant database
      let tenantDb;
      try {
        tenantDb = await createTenantDatabase(organization.id);
      } catch (dbError: any) {
        // If database creation fails, delete the organization
        try {
          await prisma.organization.delete({
            where: { id: organization.id },
          });
        } catch (deleteError: any) {
          // Organization might not exist or already deleted, log and continue
          console.warn("Could not delete organization during cleanup:", deleteError);
        }
        throw new Error(`Failed to create tenant database: ${dbError.message}`);
      }

      // 7. Store database instance information in master DB
      dbInstance = await prisma.orgDatabaseInstance.create({
        data: {
          organizationId: organization.id,
          dbHost: tenantDb.dbHost,
          dbPort: tenantDb.dbPort,
          dbUser: tenantDb.dbUser,
          dbPassword: tenantDb.dbPassword,
          dbName: tenantDb.dbName,
          connectionString: tenantDb.connectionString,
        },
      });

      // 8. Create UserOrganization relationship (owner is automatically a member)
      await prisma.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "owner",
        },
      });

      // 9. Run migrations on tenant database to create tables
      try {
        await runTenantMigrations(tenantDb.connectionString);
      } catch (migrationError: any) {
        // If migrations fail, log but don't fail the entire operation
        // The database is created, migrations can be run manually later
        console.error("Warning: Failed to run tenant migrations:", migrationError);
        // Continue - we can still store data if tables exist
      }

      // 10. Store onboarding data in tenant database
      try {
        await storeTenantData(
          tenantDb.connectionString,
          organization.name,
          data as OnboardingData
        );
      } catch (dataError: any) {
        // If data storage fails, log but don't fail the entire operation
        // Organization and database are created, data can be added later
        console.error("Warning: Failed to store tenant data:", dataError);
        // Continue - organization is still created successfully
      }

    } catch (error: any) {
      console.error("Error creating organization:", error);

      // Cleanup: If organization was created but something else failed
      if (organization && !dbInstance) {
        try {
          // Check if organization still exists before trying to delete
          const orgExists = await prisma.organization.findUnique({
            where: { id: organization.id },
          });
          
          if (orgExists) {
            await prisma.organization.delete({
              where: { id: organization.id },
            });
          }
        } catch (cleanupError: any) {
          // Log but don't throw - cleanup errors shouldn't mask original error
          console.warn("Error during cleanup (non-critical):", cleanupError.message);
        }
      }

      return NextResponse.json(
        {
          error: "Failed to create organization",
          message: error.message || "An unexpected error occurred",
        },
        { status: 500 }
      );
    }

    // 10. Return success response
    return NextResponse.json(
      {
        message: "Organization created successfully",
        organization: {
          id: organization.id,
          name: organization.name,
          createdAt: organization.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Unexpected error in organization creation:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
