import test from "node:test";
import assert from "node:assert/strict";
import acl from "./acl.middleware";

const mockRes = () => ({
  statusCode: 0,
  status(code: number) { this.statusCode = code; return this; },
  json() { return this; },
});

test("acl calls next() when the role is allowed", () => {
  const res = mockRes();
  let nextCalled = false;
  acl(["admin", "guru"])({ user: { role: "guru" } } as any, res as any, (() => { nextCalled = true; }) as any);
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 0);
});

test("acl responds 403 and skips next() when the role is not allowed", () => {
  const res = mockRes();
  let nextCalled = false;
  acl(["admin"])({ user: { role: "murid" } } as any, res as any, (() => { nextCalled = true; }) as any);
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("acl responds 403 when there is no authenticated user", () => {
  const res = mockRes();
  let nextCalled = false;
  acl(["admin"])({} as any, res as any, (() => { nextCalled = true; }) as any);
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});
