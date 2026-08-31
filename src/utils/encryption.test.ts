import test from "node:test";
import assert from "node:assert/strict";
import { encrypt, verify } from "./encryption";

test("encrypt produces a salted bcrypt hash", () => {
  const a = encrypt("Str0ngPass");
  const b = encrypt("Str0ngPass");
  assert.match(a, /^\$2[aby]\$/); // bcrypt identifier
  assert.notEqual(a, b); // random salt -> same password, different hash
});

test("verify accepts the right password and rejects the wrong one", () => {
  const hash = encrypt("Str0ngPass");
  assert.equal(verify("Str0ngPass", hash), true);
  assert.equal(verify("wrong", hash), false);
});

test("verify returns false (no throw) for a legacy non-bcrypt hash", () => {
  // old pbkdf2 hashes were plain hex — must fail cleanly, not error
  assert.equal(verify("anything", "5f4dcc3b5aa765d61d8327deb882cf99"), false);
});
