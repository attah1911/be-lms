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
