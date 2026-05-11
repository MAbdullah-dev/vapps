/** Supported UI locales — targets for Google Translate v2 (`target` parameter). */

export type LocaleCode = "en" | "es" | "fr" | "de" | "ja";

export type LocaleMeta = {
  code: LocaleCode;
  label: string;
  googleTarget: string;
};

export const LOCALES: readonly LocaleMeta[] = [
  { code: "en", label: "English", googleTarget: "en" },
  { code: "es", label: "Spanish", googleTarget: "es" },
  { code: "fr", label: "French", googleTarget: "fr" },
  { code: "de", label: "German", googleTarget: "de" },
  { code: "ja", label: "Japanese", googleTarget: "ja" },
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
