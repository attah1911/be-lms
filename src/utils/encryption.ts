import bcrypt from "bcryptjs";

// bcrypt: per-hash random salt, adaptive cost. Replaces the old pbkdf2 with a
// static salt (JWT_SECRET), which produced a deterministic, rainbow-tableable hash.
const COST = 10; // ~10ms/hash; bump if you want more margin

// ponytail: sync API keeps every call site unchanged and is fine at this scale
// (one login at a time). Switch to bcrypt.hash/.compare if auth throughput matters.
export const encrypt = (password: string): string => bcrypt.hashSync(password, COST);

export const verify = (password: string, hash: string): boolean =>
  bcrypt.compareSync(password, hash);
