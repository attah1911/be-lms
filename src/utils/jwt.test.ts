import test from "node:test";
import assert from "node:assert/strict";

// jwt.ts reads SECRET from env at import time — set it before importing.
process.env.SECRET ||= "test-secret-for-jwt";

test("a generated token round-trips back to its payload", async () => {
  const { generateToken, getUserData } = await import("./jwt");
  const token = generateToken({ id: "user-1", role: "admin" as never });
  const decoded = getUserData(token);
  assert.equal(decoded?.id, "user-1");
  assert.equal(decoded?.role, "admin");
});

test("getUserData returns null for a malformed or empty token", async () => {
  const { getUserData } = await import("./jwt");
  assert.equal(getUserData("not-a-jwt"), null);
  assert.equal(getUserData(""), null);
});

test("getUserData returns null for a token signed with a different secret", async () => {
  const jwt = (await import("jsonwebtoken")).default;
  const { getUserData } = await import("./jwt");
  const forged = jwt.sign({ id: "x", role: "admin" }, "some-other-secret");
  assert.equal(getUserData(forged), null);
});
