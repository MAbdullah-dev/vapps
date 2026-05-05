/**
 * Reads the site selected in the dashboard sidebar from localStorage.
 * Key must match `Sidebar.tsx` (`selectedSite_${orgId}`).
 */
export function getSelectedSiteIdFromStorage(orgId: string): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`selectedSite_${orgId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { id?: string };
    return parsed?.id ?? null;
  } catch {
    return null;
  }
}
