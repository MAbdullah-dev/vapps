import { Client } from "pg";
import { OnboardingData } from "@/store/onboardingStore";
import crypto from "crypto";

/**
 * Stores onboarding data in the tenant database
 * @param connectionString - Tenant database connection string
 * @param organizationName - Organization name
 * @param data - Complete onboarding data from all 11 steps
 */
export async function storeTenantData(
  connectionString: string,
  organizationName: string,
  data: Partial<OnboardingData>
): Promise<void> {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();

    // Start transaction
    await client.query("BEGIN");

    try {
      // 1. Store Organization Info (from step1)
      await client.query(
        `INSERT INTO "organization_info" (
          "id", "name", "registrationId", "address", "contactName", 
          "contactEmail", "phone", "website", "industry", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          crypto.randomUUID(),
          organizationName,
          data.step1?.registrationId || null,
          data.step1?.address || null,
          data.step1?.contactName || null,
          data.step1?.contactEmail || null,
          data.step1?.phone || null,
          data.step1?.website || null,
          data.step1?.industry || null,
        ]
      );

      // 2. Store Sites and Processes (from step2)
      if (data.step2?.sites && data.step2.sites.length > 0) {
        for (let index = 0; index < data.step2.sites.length; index++) {
          const site = data.step2.sites[index];
          const siteId = crypto.randomUUID();
          
          // Auto-generate site code if not provided
          const siteCode = site.siteCode && site.siteCode.trim().length > 0 
            ? site.siteCode 
            : `S${String(index + 1).padStart(3, '0')}`;
          
          // Insert site
          await client.query(
            `INSERT INTO "sites" ("id", "name", "code", "location", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, NOW(), NOW())`,
            [siteId, site.siteName, siteCode, site.location]
          );

          // Insert processes for this site
          if (site.processes && site.processes.length > 0) {
            for (const processName of site.processes) {
              await client.query(
                `INSERT INTO "processes" ("id", "name", "siteId", "createdAt", "updatedAt")
                 VALUES ($1, $2, $3, NOW(), NOW())`,
                [crypto.randomUUID(), processName, siteId]
              );
            }
          }
        }
      }

      // 3. Store Leaders (from step3)
      if (data.step3?.leaders && data.step3.leaders.length > 0) {
        for (const leader of data.step3.leaders) {
          await client.query(
            `INSERT INTO "leaders" ("id", "name", "role", "level", "email", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [crypto.randomUUID(), leader.name, leader.role, leader.level, leader.email || null]
          );
        }
      }

      // 4. Store Team Members (from step4)
      if (data.step4?.teamMembers && data.step4.teamMembers.length > 0) {
        for (const member of data.step4.teamMembers) {
          await client.query(
            `INSERT INTO "team_members" ("id", "fullName", "email", "role", "ssoMethod", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             ON CONFLICT ("email") DO UPDATE SET
               "fullName" = EXCLUDED."fullName",
               "role" = EXCLUDED."role",
               "ssoMethod" = EXCLUDED."ssoMethod",
               "updatedAt" = NOW()`,
            [crypto.randomUUID(), member.fullName, member.email, member.role, member.ssoMethod || null]
          );
        }
      }

      // 5. Store Financial Settings (from step5)
      await client.query(
        `INSERT INTO "financial_settings" (
          "id", "baseCurrency", "fiscalYearStart", "defaultTaxRate", "paymentTerms",
          "chartOfAccountsTemplate", "defaultAssetAccount", "defaultRevenueAccount",
          "defaultExpenseAccount", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          crypto.randomUUID(),
          (data.step5?.baseCurrency as string) || null,
          (data.step5?.fiscalYearStart as string) || null,
          (data.step5?.defaultTaxRate as string) || null,
          (data.step5?.paymentTerms as string) || null,
          (data.step5?.chartOfAccountsTemplate as string) || null,
          (data.step5?.defaultAssetAccount as string) || null,
          (data.step5?.defaultRevenueAccount as string) || null,
          (data.step5?.defaultExpenseAccount as string) || null,
        ]
      );

      // 6. Store Products (from step6)
      if (data.step6?.products && data.step6.products.length > 0) {
        for (const product of data.step6.products) {
          await client.query(
            `INSERT INTO "products" (
              "id", "sku", "name", "category", "unit", "cost", "reorder", "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
            [
              crypto.randomUUID(),
              product.sku || null,
              product.name,
              product.category || null,
              product.unit || null,
              product.cost || null,
              product.reorder || null,
            ]
          );
        }
      }

      // 7. Store Customers and Vendors (from step7)
      const step7 = data.step7;
      if (step7?.customers && step7.customers.length > 0) {
        for (const customer of step7.customers) {
          await client.query(
            `INSERT INTO "customers" ("id", "name", "email", "phone", "address", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [
              crypto.randomUUID(),
              customer.name,
              customer.email || null,
              customer.phone || null,
              customer.address || null,
            ]
          );
        }
      }

      if (step7?.vendors && step7.vendors.length > 0) {
        for (const vendor of step7.vendors) {
          await client.query(
            `INSERT INTO "vendors" ("id", "name", "email", "phone", "address", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [
              crypto.randomUUID(),
              vendor.name,
              vendor.email || null,
              vendor.phone || null,
              vendor.address || null,
            ]
          );
        }
      }

      // 8. Store Workflow Settings (from step8)
      const step8 = data.step8;
      await client.query(
        `INSERT INTO "workflow_settings" (
          "id", "multiLevelApprovals", "automaticTaskAssignment", "criticalSLA",
          "highPrioritySLA", "mediumPrioritySLA", "lowPrioritySLA",
          "emailNotifications", "inAppNotifications", "smsNotifications",
          "escalationRules", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          crypto.randomUUID(),
          step8?.multiLevelApprovals || false,
          step8?.automaticTaskAssignment || false,
          step8?.criticalSLA || null,
          step8?.highPrioritySLA || null,
          step8?.mediumPrioritySLA || null,
          step8?.lowPrioritySLA || null,
          step8?.emailNotifications !== false, // default true
          step8?.inAppNotifications !== false, // default true
          step8?.smsNotifications || false,
          step8?.escalationRules || null,
        ]
      );

      // 9. Store Dashboard Widgets (from step9)
      const step9 = data.step9;
      await client.query(
        `INSERT INTO "dashboard_widgets" (
          "id", "tasksCompleted", "complianceScore", "workloadByUser",
          "overdueTasks", "issueDistribution", "auditTrend",
          "projectProgress", "documentVersion", "reportFrequency", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [
          crypto.randomUUID(),
          step9?.widgets?.tasksCompleted || false,
          step9?.widgets?.complianceScore || false,
          step9?.widgets?.workloadByUser || false,
          step9?.widgets?.overdueTasks || false,
          step9?.widgets?.issueDistribution || false,
          step9?.widgets?.auditTrend || false,
          step9?.widgets?.projectProgress || false,
          step9?.widgets?.documentVersion || false,
          step9?.reportFrequency || null,
        ]
      );

      // 10. Store Security Settings (from step10)
      const step10 = data.step10;
      await client.query(
        `INSERT INTO "security_settings" (
          "id", "require2FA", "ipWhitelisting", "sessionTimeout",
          "passwordPolicy", "sessionDuration", "logAllActions",
          "logRetention", "backupFrequency", "backupRetention", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [
          crypto.randomUUID(),
          step10?.require2FA || false,
          step10?.ipWhitelisting || false,
          step10?.sessionTimeout || false,
          step10?.passwordPolicy || null,
          step10?.sessionDuration || null,
          step10?.logAllActions || false,
          step10?.logRetention || null,
          step10?.backupFrequency || null,
          step10?.backupRetention || null,
        ]
      );

      // Commit transaction
      await client.query("COMMIT");
    } catch (error) {
      // Rollback on error
      await client.query("ROLLBACK");
      throw error;
    }
  } catch (error: any) {
    console.error("Error storing tenant data:", error);
    throw new Error(`Failed to store tenant data: ${error.message}`);
  } finally {
    await client.end();
  }
}
