import bcrypt from "bcryptjs";

// bcrypt: per-hash random salt, adaptive cost. Replaces the old pbkdf2 with a
// static salt (JWT_SECRET), which produced a deterministic, rainbow-tableable hash.
const COST = 10; // ~10ms/hash; bump if you want more margin

// ponytail: sync API keeps every call site unchanged and is fine at this scale
// (one login at a time). Switch to bcrypt.hash/.compare if auth throughput matters.
export const encrypt = (password: string): string => bcrypt.hashSync(password, COST);

export const verify = (password: string, hash: string): boolean =>
  bcrypt.compareSync(password, hash);

// self-check: npx tsx src/utils/encryption.ts
if (require.main === module) {
  const check = (label: string, ok: boolean) => {
    if (!ok) throw new Error(`FAIL: ${label}`);
    console.log(`ok: ${label}`);
  };
  const h = encrypt("Str0ngPass");
  check("bcrypt hash format", h.startsWith("$2"));
  check("per-hash salt, not deterministic", h !== encrypt("Str0ngPass"));
  check("correct password verifies", verify("Str0ngPass", h) === true);
  check("wrong password rejected", verify("wrong", h) === false);
  check("legacy pbkdf2 hash fails cleanly", verify("x", "legacy_pbkdf2_hex") === false);
  console.log("encryption self-check ok");
}
