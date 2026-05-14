/** Supported UI locales — targets for Google Translate v2 (`target` parameter). */

export type LocaleCode = "en" | "zh" | "es" | "fr" | "ar" | "bn" | "pt" | "ru" | "ur" | "ja";

export type LocaleMeta = {
  code: LocaleCode;
  /** English display name (shown in UI; also used for search). */
  label: string;
  /** Google Cloud Translation API v2 `target` language code. */
  googleTarget: string;
  /** Extra substrings to match in the language search box (optional). */
  searchAliases?: readonly string[];
};

export const LOCALES: readonly LocaleMeta[] = [
  { code: "en", label: "English", googleTarget: "en", searchAliases: ["eng"] },
  { code: "zh", label: "Chinese", googleTarget: "zh-CN", searchAliases: ["中文", "mandarin", "简体"] },
  { code: "es", label: "Spanish", googleTarget: "es", searchAliases: ["español", "espanol"] },
  { code: "fr", label: "French", googleTarget: "fr", searchAliases: ["français", "francais"] },
  { code: "ar", label: "Arabic", googleTarget: "ar", searchAliases: ["عربي"] },
  { code: "bn", label: "Bengali", googleTarget: "bn", searchAliases: ["বাংলা", "bangla"] },
  { code: "pt", label: "Portuguese", googleTarget: "pt", searchAliases: ["português", "portugues", "brazil"] },
  { code: "ru", label: "Russian", googleTarget: "ru", searchAliases: ["русский"] },
  { code: "ur", label: "Urdu", googleTarget: "ur", searchAliases: ["اردو"] },
  { code: "ja", label: "Japanese", googleTarget: "ja", searchAliases: ["日本語", "nihongo"] },
];

export const DEFAULT_LOCALE: LocaleCode = "en";

export const LOCALES_BY_CODE: Record<LocaleCode, LocaleMeta> = LOCALES.reduce(
  (acc, L) => {
    acc[L.code] = L;
    return acc;
  },
  {} as Record<LocaleCode, LocaleMeta>
);

export function isRtlLocale(code: string): boolean {
  return ["ar", "he", "fa", "ur"].includes(code);
}

export function isLocaleCode(s: unknown): s is LocaleCode {
  return typeof s === "string" && s in LOCALES_BY_CODE;
}

/** Match user input against label, code, and optional aliases (lowercase). */
export function localeMatchesQuery(meta: LocaleMeta, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (meta.label.toLowerCase().includes(q)) return true;
  if (meta.code.toLowerCase().includes(q)) return true;
  if (meta.googleTarget.toLowerCase().includes(q)) return true;
  if (meta.searchAliases?.some((a) => a.toLowerCase().includes(q))) return true;
  return false;
}
