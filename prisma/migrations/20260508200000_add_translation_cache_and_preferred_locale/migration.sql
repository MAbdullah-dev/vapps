-- AlterTable
ALTER TABLE "User" ADD COLUMN "preferredLocale" TEXT;

-- CreateTable
CREATE TABLE "TranslationCache" (
    "id" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL DEFAULT 'en',
    "sourceText" TEXT NOT NULL,
    "translated" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranslationCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TranslationCache_sourceHash_targetLang_idx" ON "TranslationCache"("sourceHash", "targetLang");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationCache_sourceHash_targetLang_key" ON "TranslationCache"("sourceHash", "targetLang");
