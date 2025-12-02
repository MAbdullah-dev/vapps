import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import NextAuth, { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Apple from "next-auth/providers/apple";
import Atlassian from "next-auth/providers/atlassian";
import bcrypt from "bcryptjs";

// Type for user with password
interface UserWithPassword {
  id: string;
  name: string | null;
  email: string | null;
  password: string | null;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    Google({
      clientId: process.env.GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_SECRET || "",
    }),
    GitHub({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
    Apple({
      clientId: process.env.APPLE_ID || "",
      clientSecret: process.env.APPLE_SECRET || "",
    }),
    Atlassian({
      clientId: process.env.ATLASSIAN_ID || "",
      clientSecret: process.env.ATLASSIAN_SECRET || "",
    }),
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Email and password required");
        }

        // Use plain Prisma query with cast to our type
        const user = (await prisma.user.findUnique({
          where: { email: credentials.email },
        })) as UserWithPassword | null;

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        const match = await bcrypt.compare(credentials.password, user.password);
        if (!match) throw new Error("Invalid email or password");

        // Return user for NextAuth
        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/auth/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },

    async session({ session, token }) {
      if (session.user) session.user.id = token.sub ?? "";
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
