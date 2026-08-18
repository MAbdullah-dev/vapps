const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  PREFIX,
  isEncryptedSecret,
  encryptTenantSecret,
  decryptTenantSecret,
  revealTenantConnectionString,
} = require("./tenant-secrets");

const PLAINTEXT =
  "postgresql://tenant_user:s3cret-pass@db.example.com:5432/tenant_db";

const KEY_ENV_VARS = [
  "TENANT_SECRETS_ENCRYPTION_KEY",
  "TWO_FACTOR_ENCRYPTION_KEY",
  "NEXTAUTH_SECRET",
  "AUTH_SECRET",
];

describe("scripts/lib/tenant-secrets", () => {
  const originalEnv = {};

  beforeEach(() => {
    for (const key of KEY_ENV_VARS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of KEY_ENV_VARS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  test("returns legacy plaintext connection strings unchanged", () => {
    process.env.TENANT_SECRETS_ENCRYPTION_KEY = "unit-test-key";
    assert.equal(decryptTenantSecret(PLAINTEXT), PLAINTEXT);
    assert.equal(revealTenantConnectionString(PLAINTEXT), PLAINTEXT);
    assert.equal(isEncryptedSecret(PLAINTEXT), false);
  });

  test("round-trips enc:v1 AES-256-GCM secrets", () => {
    process.env.TENANT_SECRETS_ENCRYPTION_KEY = "unit-test-key";
    const encrypted = encryptTenantSecret(PLAINTEXT);
    assert.equal(encrypted.startsWith(PREFIX), true);
    assert.equal(isEncryptedSecret(encrypted), true);
    assert.equal(decryptTenantSecret(encrypted), PLAINTEXT);
    assert.equal(revealTenantConnectionString(encrypted), PLAINTEXT);
  });

  test("does not re-encrypt already encrypted values", () => {
    process.env.TENANT_SECRETS_ENCRYPTION_KEY = "unit-test-key";
    const encrypted = encryptTenantSecret(PLAINTEXT);
    assert.equal(encryptTenantSecret(encrypted), encrypted);
  });

  test("uses TENANT_SECRETS_ENCRYPTION_KEY before other fallbacks", () => {
    process.env.AUTH_SECRET = "auth-secret-key";
    process.env.NEXTAUTH_SECRET = "nextauth-secret-key";
    process.env.TWO_FACTOR_ENCRYPTION_KEY = "two-factor-key";
    process.env.TENANT_SECRETS_ENCRYPTION_KEY = "tenant-secrets-key";

    const encrypted = encryptTenantSecret(PLAINTEXT);
    assert.equal(decryptTenantSecret(encrypted), PLAINTEXT);

    delete process.env.TENANT_SECRETS_ENCRYPTION_KEY;
    assert.throws(() => decryptTenantSecret(encrypted));
  });

  test("falls back through TWO_FACTOR, NEXTAUTH_SECRET, then AUTH_SECRET", () => {
    process.env.AUTH_SECRET = "auth-secret-key";
    const authEncrypted = encryptTenantSecret("from-auth");
    delete process.env.AUTH_SECRET;

    process.env.NEXTAUTH_SECRET = "nextauth-secret-key";
    const nextAuthEncrypted = encryptTenantSecret("from-nextauth");
    delete process.env.NEXTAUTH_SECRET;

    process.env.TWO_FACTOR_ENCRYPTION_KEY = "two-factor-key";
    const twoFactorEncrypted = encryptTenantSecret("from-2fa");
    delete process.env.TWO_FACTOR_ENCRYPTION_KEY;

    process.env.TWO_FACTOR_ENCRYPTION_KEY = "two-factor-key";
    assert.equal(decryptTenantSecret(twoFactorEncrypted), "from-2fa");
    delete process.env.TWO_FACTOR_ENCRYPTION_KEY;

    process.env.NEXTAUTH_SECRET = "nextauth-secret-key";
    assert.equal(decryptTenantSecret(nextAuthEncrypted), "from-nextauth");
    delete process.env.NEXTAUTH_SECRET;

    process.env.AUTH_SECRET = "auth-secret-key";
    assert.equal(decryptTenantSecret(authEncrypted), "from-auth");
  });

  test("throws when no encryption key is configured for encrypted values", () => {
    process.env.TENANT_SECRETS_ENCRYPTION_KEY = "unit-test-key";
    const encrypted = encryptTenantSecret(PLAINTEXT);
    delete process.env.TENANT_SECRETS_ENCRYPTION_KEY;

    assert.throws(
      () => decryptTenantSecret(encrypted),
      /TENANT_SECRETS_ENCRYPTION_KEY/
    );
  });

  test("passes through empty values", () => {
    assert.equal(decryptTenantSecret(""), "");
    assert.equal(revealTenantConnectionString(""), "");
  });
});
