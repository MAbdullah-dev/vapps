/**
 * Google Cloud Translation REST API **v2** (API key).
 * @see https://cloud.google.com/translate/docs/reference/rest/v2/translate
 */

const TRANSLATE_V2_ENDPOINT = "https://translation.googleapis.com/language/translate/v2";

type TranslateV2Success = {
  data?: {
    translations?: Array<{ translatedText?: string }>;
  };
};

type TranslateV2ErrorEnvelope = {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ domain?: string; reason?: string; message?: string }>;
    status?: string;
  };
};

export function getGoogleTranslateApiKey(): string | undefined {
  const k = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
  return k || undefined;
}

export function isGoogleTranslateConfigured(): boolean {
  return !!getGoogleTranslateApiKey();
}

function classifyHttpFailure(status: number): string {
  if (status === 429) return "quota_exceeded_or_rate_limited";
  if (status === 401 || status === 403) return "invalid_or_restricted_api_key";
  if (status >= 500 && status <= 599) return "google_server_error";
  if (status === 400) return "bad_request";
  return `http_${status}`;
}

function logFailure(context: string, detail: Record<string, unknown>): void {
  console.error(`[google-translate] ${context}`, detail);
}

/**
 * Translates plaintext strings via Cloud Translation API **v2** + API key.
 * On any failure returns the original texts (caller may still cache/pass through).
 */
export async function translatePlainTexts(options: {
  texts: string[];
  targetLang: string;
  sourceLang?: string;
}): Promise<string[]> {
  const { texts, targetLang, sourceLang = "en" } = options;
  if (texts.length === 0) return [];

  if (targetLang === sourceLang) return [...texts];

  const apiKey = getGoogleTranslateApiKey();
  if (!apiKey) {
    logFailure("skipped", { reason: "missing_GOOGLE_TRANSLATE_API_KEY" });
    return [...texts];
  }

  const url = `${TRANSLATE_V2_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;

  const payload: Record<string, unknown> = {
    q: texts,
    target: targetLang,
    format: "text",
  };
  if (sourceLang && sourceLang !== "auto") {
    payload.source = sourceLang;
  }

  const controller = new AbortController();
  const timeoutMs = Number(process.env.GOOGLE_TRANSLATE_FETCH_TIMEOUT_MS) || 30_000;
  const tid = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : "unknown";
      const message = err instanceof Error ? err.message : String(err);
      const aborted = err instanceof Error && err.name === "AbortError";
      logFailure("network_failure", {
        kind: aborted ? "timeout_or_abort" : "fetch_error",
        name,
        message,
      });
      return [...texts];
    }

    const rawBody = await res.text();
    let json: TranslateV2Success & TranslateV2ErrorEnvelope | null = null;
    try {
      json = JSON.parse(rawBody) as TranslateV2Success & TranslateV2ErrorEnvelope;
    } catch {
      json = null;
    }

    if (!res.ok) {
      const gErr = json?.error;
      const category = classifyHttpFailure(res.status);
      logFailure("api_error_response", {
        httpStatus: res.status,
        category,
        googleCode: gErr?.code,
        googleStatus: gErr?.status,
        message: gErr?.message ?? rawBody.slice(0, 500),
      });
      return [...texts];
    }

    const items = json?.data?.translations;
    if (!Array.isArray(items) || items.length !== texts.length) {
      logFailure("unexpected_success_shape", {
        expectedLen: texts.length,
        receivedLen: Array.isArray(items) ? items.length : null,
        bodyPreview: rawBody.slice(0, 400),
      });
      return [...texts];
    }

    return texts.map((original, i) => {
      const line = items[i]?.translatedText;
      return typeof line === "string" && line.length > 0 ? line : original;
    });
  } finally {
    clearTimeout(tid);
  }
}
