"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  type LocaleCode,
  DEFAULT_LOCALE,
  LOCALES_BY_CODE,
  isLocaleCode,
  isRtlLocale,
} from "@/i18n/locales";

const COOKIE_LOCALE = "vie-locale";

type TranslationCtx = {
  locale: LocaleCode;
  googleTargetForLocale: () => string;
  setLocale: (code: LocaleCode) => void;
  t: (text: string) => string;
  prefetch: (texts: string[]) => void;
};

const TranslationContext = createContext<TranslationCtx | null>(null);

function readLocaleCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = /(?:^|; )vie-locale=([^;]+)/.exec(document.cookie);
  return m ? decodeURIComponent(m[1]) : null;
}

function persistLocaleCookie(code: LocaleCode) {
  const maxAge = 60 * 60 * 24 * 400;
  document.cookie = `${COOKIE_LOCALE}=${encodeURIComponent(code)};path=/;max-age=${maxAge};SameSite=Lax`;
}

function storageDictKey(locale: LocaleCode): string {
  return `vie-dict:${locale}`;
}

function hydrateFromStorage(locale: LocaleCode): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageDictKey(locale));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === "string" && typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function persistDict(locale: LocaleCode, dict: Record<string, string>) {
  try {
    localStorage.setItem(storageDictKey(locale), JSON.stringify(dict));
  } catch {
    // ignore quota
  }
}

/** Normalize cookie / DB values to a supported `LocaleCode` (legacy codes map to defaults). */
function normalizeLocaleFromStorage(code: string): LocaleCode {
  if (code === "hi") return "ja";
  if (code === "de") return "en";
  if (isLocaleCode(code)) return code;
  return DEFAULT_LOCALE;
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);
  const [dictionary, setDictionary] = useState<Record<string, string>>({});
  const dictionaryRef = useRef<Record<string, string>>({});
  dictionaryRef.current = dictionary;
  const pending = useRef(new Set<string>());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  const googleTargetForLocale = useCallback(
    () => LOCALES_BY_CODE[locale].googleTarget,
    [locale]
  );

  useEffect(() => {
    const fromCookie = readLocaleCookie();
    if (fromCookie) {
      const norm = normalizeLocaleFromStorage(fromCookie);
      if (norm !== fromCookie) persistLocaleCookie(norm);
      setLocaleState(norm);
      return;
    }
    if (status === "authenticated") {
      const pref = (session?.user as { preferredLocale?: string | null } | undefined)
        ?.preferredLocale;
      if (pref) {
        const norm = normalizeLocaleFromStorage(pref);
        setLocaleState(norm);
        persistLocaleCookie(norm);
      }
    }
  }, [status, session?.user]);

  useEffect(() => {
    pending.current.clear();
    if (locale === DEFAULT_LOCALE) {
      setDictionary({});
      return;
    }
    setDictionary(hydrateFromStorage(locale));
  }, [locale]);

  const applyDocLocale = useCallback((code: LocaleCode) => {
    if (typeof document === "undefined") return;
    const meta = LOCALES_BY_CODE[code];
    document.documentElement.lang = meta.googleTarget.replace(/_/g, "-");
    document.documentElement.dir = isRtlLocale(code) ? "rtl" : "ltr";
  }, []);

  useEffect(() => {
    applyDocLocale(locale);
  }, [locale, applyDocLocale]);

  const flushPending = useCallback(async () => {
    if (locale === DEFAULT_LOCALE) {
      pending.current.clear();
      return;
    }
    const batch = Array.from(pending.current);
    pending.current.clear();
    if (batch.length === 0 || inFlight.current) return;

    const snapshot = dictionaryRef.current;
    const need = [...new Set(batch.filter((s) => s && snapshot[s] === undefined))];
    if (need.length === 0) return;

    inFlight.current = true;
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          texts: need,
          targetLang: LOCALES_BY_CODE[locale].googleTarget,
          sourceLang: "en",
        }),
      });

      if (!res.ok) {
        console.warn("[TranslationProvider] /api/translate HTTP error:", res.status);
        return;
      }

      const data = (await res.json()) as {
        translations?: string[];
        googleTranslateConfigured?: boolean;
      };
      const translations = data.translations;
      if (!Array.isArray(translations) || translations.length !== need.length) {
        console.warn("[TranslationProvider] Invalid response shape from /api/translate");
        return;
      }

      if (data.googleTranslateConfigured === false && need.length > 0) {
        try {
          if (!sessionStorage.getItem("vie-translate-apikey-tip")) {
            sessionStorage.setItem("vie-translate-apikey-tip", "1");
            toast.info("Translation API not configured", {
              description:
                "Set GOOGLE_TRANSLATE_API_KEY in your server environment (.env) and restart npm run dev. See .env.example.",
              duration: 14_000,
            });
          }
        } catch {
          /* private mode */
        }
      }

      setDictionary((prev) => {
        const next = { ...prev };
        need.forEach((src, i) => {
          next[src] = translations[i] ?? src;
        });
        persistDict(locale, next);
        return next;
      });
    } catch (e) {
      console.warn("[TranslationProvider] /api/translate network error:", e);
    } finally {
      inFlight.current = false;
    }
  }, [locale]);

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => {
      flushTimer.current = null;
      void flushPending();
    }, 80);
  }, [flushPending]);

  const t = useCallback(
    (text: string): string => {
      if (!text) return "";
      if (locale === DEFAULT_LOCALE) return text;
      const hit = dictionary[text];
      if (hit !== undefined) return hit;
      pending.current.add(text);
      scheduleFlush();
      return text;
    },
    [locale, dictionary, scheduleFlush]
  );

  const prefetch = useCallback(
    (texts: string[]) => {
      if (locale === DEFAULT_LOCALE) return;
      const snap = dictionaryRef.current;
      for (const s of texts) {
        if (s && snap[s] === undefined) pending.current.add(s);
      }
      scheduleFlush();
    },
    [locale, scheduleFlush]
  );

  const setLocale = useCallback(
    async (code: LocaleCode) => {
      setLocaleState(code);
      persistLocaleCookie(code);
      applyDocLocale(code);
      try {
        localStorage.setItem("vie-locale-active", code);
      } catch {
        /* ignore */
      }

      if (status === "authenticated") {
        try {
          await fetch("/api/user/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ preferredLocale: code }),
          });
        } catch {
          /* ignore */
        }
      }
    },
    [status, applyDocLocale]
  );

  const value = useMemo<TranslationCtx>(
    () => ({
      locale,
      googleTargetForLocale,
      setLocale,
      t,
      prefetch,
    }),
    [locale, googleTargetForLocale, setLocale, t, prefetch]
  );

  return (
    <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>
  );
}

export function useTranslate(): TranslationCtx {
  const ctx = useContext(TranslationContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      googleTargetForLocale: () => "en",
      setLocale: () => {},
      t: (s) => s,
      prefetch: () => {},
    };
  }
  return ctx;
}
