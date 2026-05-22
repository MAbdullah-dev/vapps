export type StoredSelectedSite = {
  id: string;
  name?: string;
  code?: string;
  location?: string;
  processes?: Array<{ id: string; name: string; createdAt: string }>;
};

/**
 * Reads the site selected for the dashboard from localStorage.
 * Key must match `Sidebar.tsx` (`selectedSite_${orgId}`).
 */
function readStoredSite(orgId: string, legacySlug?: string): StoredSelectedSite | null {
  if (typeof window === "undefined") return null;

  const keys = [`selectedSite_${orgId}`];
  if (legacySlug && legacySlug !== orgId) {
    keys.push(`selectedSite_${legacySlug}`);
  }

  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as StoredSelectedSite;
      if (!parsed?.id) continue;
      const canonicalKey = `selectedSite_${orgId}`;
      if (key !== canonicalKey) {
        localStorage.setItem(canonicalKey, raw);
        localStorage.removeItem(key);
      }
      return parsed;
    } catch {
      // try next key
    }
  }
  return null;
}

export function getSelectedSiteIdFromStorage(
  orgId: string,
  legacySlug?: string
): string | null {
  return readStoredSite(orgId, legacySlug)?.id ?? null;
}

export function getSelectedSiteFromStorage(
  orgId: string,
  legacySlug?: string
): StoredSelectedSite | null {
  return readStoredSite(orgId, legacySlug);
}

/** Persist active site and notify listeners (sidebar, processes list, issues, etc.). */
export function setSelectedSiteInStorage(
  orgId: string,
  site: StoredSelectedSite,
  legacySlug?: string
) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(site);
  localStorage.setItem(`selectedSite_${orgId}`, payload);
  if (legacySlug && legacySlug !== orgId) {
    localStorage.removeItem(`selectedSite_${legacySlug}`);
  }
  window.dispatchEvent(
    new CustomEvent("siteChanged", {
      detail: { siteId: site.id, orgId, site },
    })
  );
}

export type SiteChangedDetail = {
  orgId: string;
  siteId: string;
  site?: StoredSelectedSite;
};
