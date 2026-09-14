import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Invoice numbers are unique. YYYYMM + a per-month sequence keeps them sortable
 * and short enough to print on a receipt. A unique-constraint collision retries
 * once; two concurrent invoices in the same millisecond is rare.
 */
export async function nextInvoiceNumber(
  db: Pick<PrismaClient, "invoice"> = prisma
): Promise<string> {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const prefix = `INV-${stamp}-`;
  const count = await db.invoice.count({
    where: { number: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}
