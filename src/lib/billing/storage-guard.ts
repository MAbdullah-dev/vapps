import { NextResponse } from "next/server";
import { assertStorageAvailable, billingErrorResponse } from "./guard";
import { addStorageBytes, getStorageBytes } from "./usage";

/** Returns a 402 response when storage is full under enforcement; otherwise null. */
export async function storageGuardResponse(
  organizationId: string,
  orgIdOrSlug: string,
  additionalBytes: number
): Promise<NextResponse | null> {
  try {
    await assertStorageAvailable({
      organizationId,
      currentBytes: await getStorageBytes(organizationId),
      additionalBytes,
    });
    return null;
  } catch (error) {
    const billed = billingErrorResponse(error, orgIdOrSlug);
    if (billed) return billed;
    throw error;
  }
}

export async function recordStorageUpload(
  organizationId: string,
  additionalBytes: number
): Promise<void> {
  try {
    await addStorageBytes(organizationId, additionalBytes);
  } catch (error) {
    console.warn("[billing] storage counter increment failed", error);
  }
}
