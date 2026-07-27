/**
 * One-time (or re-runnable) migration: encrypt plaintext tenant DB credentials
 * stored in OrgDatabaseInstance. Safe to re-run — already-encrypted values are skipped.
 *
 * Usage: node --import tsx scripts/encrypt-tenant-secrets.ts
 * Or: npx tsx scripts/encrypt-tenant-secrets.ts
 *
 * Requires DATABASE_URL and TENANT_SECRETS_ENCRYPTION_KEY (or NEXTAUTH_SECRET).
 */

const { PrismaClient } = require("@prisma/client");
const {
  createCipheriv,
  createHash,
  randomBytes,
} = require("crypto");

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;

function getKey() {
  const raw =
    process.env.TENANT_SECRETS_ENCRYPTION_KEY ||
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET;
  if (!raw) {
    throw new Error("TENANT_SECRETS_ENCRYPTION_KEY or NEXTAUTH_SECRET is required");
  }
  const base64 = Buffer.from(raw, "base64");
  if (base64.length === KEY_LENGTH) return base64;
  const utf8 = Buffer.from(raw);
  if (utf8.length === KEY_LENGTH) return utf8;
  return createHash("sha256").update(raw).digest();
}

function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

function encrypt(plaintext) {
  if (!plaintext || isEncrypted(plaintext)) return plaintext;
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, authTag, encrypted]).toString("base64")}`;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.orgDatabaseInstance.findMany({
      select: {
        id: true,
        organizationId: true,
        dbPassword: true,
        connectionString: true,
      },
    });

    let updated = 0;
    for (const row of rows) {
      const nextPassword = encrypt(row.dbPassword);
      const nextConn = encrypt(row.connectionString);
      if (nextPassword === row.dbPassword && nextConn === row.connectionString) {
        continue;
      }
      await prisma.orgDatabaseInstance.update({
        where: { id: row.id },
        data: {
          dbPassword: nextPassword,
          connectionString: nextConn,
        },
      });
      updated += 1;
      console.log(`Encrypted credentials for org ${row.organizationId}`);
    }

    console.log(`Done. Updated ${updated} of ${rows.length} tenant database records.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
