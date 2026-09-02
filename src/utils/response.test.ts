import test from "node:test";
import assert from "node:assert/strict";
import response from "./response";

const mockRes = () => ({
  body: null as any,
  status() { return this; },
  json(payload: any) { this.body = payload; return this; },
});

test("success() mirrors string id -> _id, recursively through objects and arrays", () => {
  const res = mockRes();
  response.success(res as any, {
    id: "a",
    teacher: { id: "t1" },
    items: [{ id: "i1" }, { id: "i2" }],
  }, "ok");

  const d = res.body.data;
  assert.equal(d._id, "a");
  assert.equal(d.teacher._id, "t1");
  assert.equal(d.items[0]._id, "i1");
  assert.equal(d.items[1]._id, "i2");
});

test("success() keeps an existing _id and ignores non-string ids", () => {
  const res = mockRes();
  response.success(res as any, { id: "real", _id: "kept", nested: { id: 3 } }, "ok");
  const d = res.body.data;
  assert.equal(d._id, "kept");
  assert.equal(d.nested._id, undefined);
});

test("success() wraps the payload in the { meta, data } envelope", () => {
  const res = mockRes();
  response.success(res as any, { id: "a" }, "done");
  assert.deepEqual(res.body.meta, { status: 200, message: "done" });
});

// --- status codes -----------------------------------------------------------
// 401 vs 403 is load-bearing: the frontend signs the user out on 401 and only
// on 401. Mixing them up either strands a user or logs them out mid-session.

const mockResWithStatus = () => ({
  code: 0,
  body: null as any,
  status(c: number) { this.code = c; return this; },
  json(payload: any) { this.body = payload; return this; },
});

test("unauthenticated() is 401 — a missing/invalid session", () => {
  const res = mockResWithStatus();
  response.unauthenticated(res as any, "sesi habis");
  assert.equal(res.code, 401);
  assert.equal(res.body.meta.status, 401);
  assert.equal(res.body.meta.message, "sesi habis");
});

test("unauthorized() is 403 — signed in but not allowed", () => {
  const res = mockResWithStatus();
  response.unauthorized(res as any, "bukan milik Anda");
  assert.equal(res.code, 403);
  assert.equal(res.body.meta.status, 403);
});

test("notFound() is 404", () => {
  const res = mockResWithStatus();
  response.notFound(res as any, "tidak ditemukan");
  assert.equal(res.code, 404);
  assert.equal(res.body.meta.status, 404);
});

test("badRequest() is 400", () => {
  const res = mockResWithStatus();
  response.badRequest(res as any, "tidak valid");
  assert.equal(res.code, 400);
  assert.equal(res.body.meta.status, 400);
});

test("error() stays 500 — reserved for genuine server faults", () => {
  const res = mockResWithStatus();
  response.error(res as any, new Error("boom"), "gagal");
  assert.equal(res.code, 500);
  assert.equal(res.body.meta.status, 500);
});
