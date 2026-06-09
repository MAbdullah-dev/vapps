const LEGACY_MANAGEMENT_STANDARD_LABELS: Record<string, string> = {
  "iso-9001": "ISO 9001",
  "iso-14001": "ISO 14001",
  "iso-45001": "ISO 45001",
  integrated: "Integrated Management System",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolve stored managementStandard (checklist id or legacy slug) to a display title. */
export function resolveManagementStandardLabel(
  value: string | null | undefined,
  nameById?: Readonly<Record<string, string>>
): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed === "-") return "-";

  const fromCatalog = nameById?.[trimmed];
  if (fromCatalog) return fromCatalog;

  const legacy = LEGACY_MANAGEMENT_STANDARD_LABELS[trimmed.toLowerCase()];
  if (legacy) return legacy;

  if (UUID_PATTERN.test(trimmed)) return "-";

  return trimmed;
}

export function buildManagementStandardNameMap(
  checklists: Array<{ id?: string | null; name?: string | null }>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of checklists) {
    const id = String(item.id ?? "").trim();
    const name = String(item.name ?? "").trim();
    if (id && name) map[id] = name;
  }
  return map;
}
