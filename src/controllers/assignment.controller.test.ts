import test from "node:test";
import assert from "node:assert/strict";
import { isOutOfScope, listAssignmentInclude } from "./assignment.controller";

// Guards the assignment read scoping: a guru/murid may only reach assignments
// belonging to the mata pelajaran they own / are enrolled in. `null` is admin.

test("admin (null scope) reaches every mata pelajaran", () => {
  assert.equal(isOutOfScope(null, "any-id"), false);
});

test("a mata pelajaran inside the scope is reachable", () => {
  assert.equal(isOutOfScope(["a", "b"], "b"), false);
});

test("a mata pelajaran outside the scope is blocked", () => {
  assert.equal(isOutOfScope(["a", "b"], "c"), true);
});

test("an empty scope blocks everything — never falls open", () => {
  assert.equal(isOutOfScope([], "a"), true);
});

// Guards what `GET /assignments` joins. A murid must never receive other
// students' submissions, nor a count that reveals how many classmates submitted.

test("list view gives guru/admin a submission count", () => {
  const include = listAssignmentInclude(null, false) as any;
  assert.equal(include._count.select.submissions, true);
  assert.equal(include.submissions, undefined);
});

test("list view gives a murid no count and no submissions", () => {
  const include = listAssignmentInclude("student-1", false) as any;
  assert.equal(include._count, undefined);
  assert.equal(include.submissions, undefined);
});

test("withSubmissions still scopes a murid to their own submissions", () => {
  const include = listAssignmentInclude("student-1", true) as any;
  assert.deepEqual(include.submissions.where, { studentId: "student-1" });
  assert.equal(include._count, undefined);
});

test("withSubmissions is unfiltered for guru/admin", () => {
  const include = listAssignmentInclude(null, true) as any;
  assert.equal(include.submissions.where, undefined);
});
