/** Inline avatars (S3-off fallback) — do not broadcast in team/member APIs. */
export function isInlineAvatarData(image: string | null | undefined): boolean {
  return typeof image === "string" && image.startsWith("data:image/");
}

/** Safe `avatar` field for public member lists: omits heavy inline data URLs. */
export function teamMemberAvatarReference(image: string | null | undefined): string | undefined {
  if (!image || isInlineAvatarData(image)) return undefined;
  return image;
}
