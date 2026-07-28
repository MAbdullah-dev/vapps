/**
 * Normalize emails for storage and lookup.
 * Prevents duplicate accounts from case variants (Victim@Gmail.com vs victim@gmail.com).
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
