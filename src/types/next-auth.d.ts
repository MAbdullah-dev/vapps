import type { DefaultSession } from "next-auth";

declare module "next-auth" {  interface Session {
    user: {
      id: string;
      /** True when master DB marks user blocked (computed in session callback). */
      isBlocked?: boolean;
      emailVerified?: Date | null;
      /** App UI language (`src/i18n/locales.ts`). Synced via TranslationProvider PATCH /api/user/profile. */
      preferredLocale?: string | null;
      /** Platform role: user | super_admin (admin dashboard access). */
      platformRole?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    emailVerified?: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    platformRole?: string;
  }
}
