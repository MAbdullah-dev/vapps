import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { translatePlainTexts, isGoogleTranslateConfigured } from "@/lib/google-translate";
import { translationSourceHash } from "@/lib/translation-hash";

const DEFAULT_SOURCE_LANG = "en";

const MAX_STRINGS_PER_REQUEST = 80;
const MAX_TOTAL_CHARS = 40_000;

type BodyShape = {
  texts?: unknown;
  targetLang?: unknown;
  sourceLang?: unknown;
};

/**
 * Batch-translate plaintext with Prisma-backed cache + Google Translate REST v2 (API key).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BodyShape;
    const targetLang =
      typeof body.targetLang === "string" ? body.targetLang.trim().toLowerCase() : "";
    const sourceLang =
      typeof body.sourceLang === "string" && body.sourceLang.trim()
        ? body.sourceLang.trim().toLowerCase()
        : DEFAULT_SOURCE_LANG;

    if (!targetLang) {
      return NextResponse.json({ error: "targetLang is required" }, { status: 400 });
    }

    const raw = body.texts;
    if (!Array.isArray(raw)) {
      return NextResponse.json({ error: "texts must be an array of strings" }, { status: 400 });
    }

    const texts = raw
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.replace(/\r\n/g, "\n"));

    if (texts.length === 0) {
      return NextResponse.json({
        translations: [],
        googleTranslateConfigured: isGoogleTranslateConfigured(),
      });
    }

    if (targetLang === sourceLang) {
      return NextResponse.json({
        translations: texts,
        googleTranslateConfigured: isGoogleTranslateConfigured(),
      });
    }

    if (texts.length > MAX_STRINGS_PER_REQUEST) {
      return NextResponse.json(
        { error: `At most ${MAX_STRINGS_PER_REQUEST} strings per request` },
        { status: 400 }
      );
    }

    const totalChars = texts.reduce((n, s) => n + s.length, 0);
    if (totalChars > MAX_TOTAL_CHARS) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const hashes = texts.map((text) =>
      translationSourceHash({ sourceLang, targetLang, text })
    );

    let cached: Awaited<ReturnType<typeof prisma.translationCache.findMany>> = [];
    try {
      cached = await prisma.translationCache.findMany({
        where: {
          targetLang,
          sourceLang,
          sourceHash: { in: hashes },
        },
      });
    } catch (err) {
      console.warn(
        "[api/translate] TranslationCache read skipped — apply DB migrations?",
        err instanceof Error ? err.message : err
      );
    }

    const byHash = new Map(cached.map((c) => [c.sourceHash, c.translated]));

    const toTranslate: { index: number; text: string; hash: string }[] = [];
    texts.forEach((text, index) => {
      const h = hashes[index]!;
      if (!byHash.has(h)) {
        toTranslate.push({ index, text, hash: h });
      }
    });

    if (toTranslate.length > 0 && !isGoogleTranslateConfigured()) {
      toTranslate.forEach(({ index, text }) => {
        byHash.set(hashes[index]!, text);
      });
    } else if (toTranslate.length > 0) {
      const apiTranslated = await translatePlainTexts({
        texts: toTranslate.map((x) => x.text),
        targetLang,
        sourceLang,
      });

      const rows = toTranslate.map((item, i) => ({
        sourceHash: item.hash,
        targetLang,
        sourceLang,
        sourceText: item.text,
        translated: apiTranslated[i] ?? item.text,
      }));

      for (const row of rows) {
        byHash.set(row.sourceHash, row.translated);
      }

      try {
        const uniqRows = [...new Map(rows.map((row) => [row.sourceHash, row])).values()];
        await prisma.$transaction(
          uniqRows.map((row) =>
            prisma.translationCache.upsert({
              where: {
                sourceHash_targetLang: {
                  sourceHash: row.sourceHash,
                  targetLang: row.targetLang,
                },
              },
              create: row,
              update: { translated: row.translated, sourceText: row.sourceText },
            })
          )
        );
      } catch (e) {
        console.error("[api/translate] cache upsert failed:", e);
      }
    }

    const translations = texts.map((text, i) => byHash.get(hashes[i]!) ?? text);

    return NextResponse.json({
      translations,
      googleTranslateConfigured: isGoogleTranslateConfigured(),
    });
  } catch (e) {
    console.error("[api/translate]", e);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
