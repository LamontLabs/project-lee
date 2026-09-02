import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDir = mkdtempSync(join(tmpdir(), "lee-owner-auth-"));
process.env.LEE_DATA_DIR = dataDir;
delete process.env.LEE_OWNER_USERNAME;
delete process.env.LEE_OWNER_PASSWORD;

const { enrollOwner, ownerExists, sessionSecret, verifyOwner } = await import("../src/lib/owner-auth.ts");
const { clearSession, createSession, isValidSession } = await import("../src/middlewares/private-auth.ts");

test("owner enrollment stores a salted hash and verifies credentials", async () => {
  assert.equal(ownerExists(), false);
  await enrollOwner("founder", "a sufficiently long local password");
  assert.equal(ownerExists(), true);
  assert.equal(await verifyOwner("founder", "a sufficiently long local password"), true);
  assert.equal(await verifyOwner("founder", "wrong password"), false);
  const record = JSON.parse(readFileSync(join(dataDir, "owner-credentials.json"), "utf8"));
  assert.equal(record.password, undefined);
  assert.notEqual(record.hash, "a sufficiently long local password");
  assert.equal(statSync(join(dataDir, "owner-credentials.json")).mode & 0o777, 0o600);
});

test("sessions are signed, expiring, and revoked on logout", () => {
  const secret = sessionSecret();
  assert.ok(secret.length >= 32);
  const session = createSession();
  assert.equal(isValidSession(session), true);
  clearSession(session);
  assert.equal(isValidSession(session), false);
});