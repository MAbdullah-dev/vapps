import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AdminAuditInput = {
  adminUserId: string;
  action: string;
  targetType: "organization" | "user";
  targetId: string;
  organizationId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export async function logAdminAction(input: AdminAuditInput) {
  await prisma.adminActionLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      organizationId: input.organizationId,
      reason: input.reason,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
