import { createHash } from "crypto";

export function translationSourceHash(parts: {
  sourceLang: string;
  targetLang: string;
  text: string;
}): string {
  const normalized = parts.text.replace(/\r\n/g, "\n").trimEnd();
  return createHash("sha256")
    .update(`${parts.sourceLang}\0${parts.targetLang}\0${normalized}`, "utf8")
    .digest("hex");
}
