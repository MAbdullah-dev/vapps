import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";

function parseAdminEmails() {
  const raw = process.env.ADMIN_DASHBOARD_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const allowedEmails = parseAdminEmails();
  return allowedEmails.includes(email.toLowerCase());
}

export async function getAdminUser(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user?.email) return null;
  if (!isAdminEmail(user.email)) return null;

  return user;
}
