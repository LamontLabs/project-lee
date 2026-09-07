import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveWelcomeBackBoundary,
  shouldAdvanceWelcomeBackCursor,
  welcomeBackStatus,
} from "../src/lib/welcome-back-briefing";

test("a missing cursor never turns all history into a welcome-back window", () => {
  const boundary = resolveWelcomeBackBoundary(undefined, undefined);
  assert.equal(boundary.kind, "baseline_required");
  assert.equal(boundary.lastSessionAt, null);
});

test("a verified clean shutdown is a safe first-session boundary", () => {
  const shutdown = new Date("2026-09-02T20:00:00.000Z");
  const boundary = resolveWelcomeBackBoundary(undefined, shutdown);
  assert.equal(boundary.kind, "clean_shutdown");
  assert.equal(boundary.lastSessionAt, shutdown);
});

test("an existing owner cursor takes precedence over a shutdown marker", () => {
  const cursor = new Date("2026-09-03T08:00:00.000Z");
  const boundary = resolveWelcomeBackBoundary(cursor, new Date("2026-09-02T20:00:00.000Z"));
  assert.equal(boundary.kind, "cursor");
  assert.equal(boundary.lastSessionAt, cursor);
});

test("recovery and unavailable CIL fail closed", () => {
  assert.equal(welcomeBackStatus({ recoveryProtected: true, cilAvailable: true, evidenceCount: 4, health: "PASS" }), "recovery_protected");
  assert.equal(welcomeBackStatus({ recoveryProtected: false, cilAvailable: false, evidenceCount: 4, health: "PASS" }), "unavailable");
  assert.equal(shouldAdvanceWelcomeBackCursor("recovery_protected"), false);
  assert.equal(shouldAdvanceWelcomeBackCursor("unavailable"), false);
});

test("only evidence-backed assembled results advance the cursor", () => {
  assert.equal(welcomeBackStatus({ recoveryProtected: false, cilAvailable: true, evidenceCount: 0, health: "PASS" }), "no_changes");
  assert.equal(welcomeBackStatus({ recoveryProtected: false, cilAvailable: true, evidenceCount: 2, health: "PASS" }), "available");
  assert.equal(welcomeBackStatus({ recoveryProtected: false, cilAvailable: true, evidenceCount: 2, health: "WARN" }), "degraded");
  assert.equal(shouldAdvanceWelcomeBackCursor("no_changes"), true);
  assert.equal(shouldAdvanceWelcomeBackCursor("available"), true);
  assert.equal(shouldAdvanceWelcomeBackCursor("degraded"), true);
});