import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Case-insensitive trim match for document workflow roles (name-only assignment). */
export function documentActorNameMatches(
  a: string | undefined | null,
  b: string | undefined | null
): boolean {
  const x = String(a ?? "").trim().toLowerCase();
  const y = String(b ?? "").trim().toLowerCase();
  return x.length > 0 && y.length > 0 && x === y;
}

/**
 * Prefer matching designated user id to current user id (reliable when display names differ).
 * Falls back to name match when designated id was not stored (older records).
 */
export function documentActorMatches(
  currentUserId: string | undefined | null,
  currentUserName: string | undefined | null,
  designatedUserId: string | undefined | null,
  designatedName: string | undefined | null
): boolean {
  const cid = String(currentUserId ?? "").trim();
  const did = String(designatedUserId ?? "").trim();
  if (cid.length > 0 && did.length > 0 && cid === did) return true;
  return documentActorNameMatches(currentUserName, designatedName);
}
