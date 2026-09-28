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
const { clearSession, cookieName, createSession, isValidSession, privateAuth } = await import("../src/middlewares/private-auth.ts");
const { openJson, sealJson } = await import("../src/lib/secret-box.ts");

function checkPrivateAuth(path: string, cookie?: string) {
  return new Promise<{ next: boolean; status: number | null }>((resolve) => {
    let status: number | null = null;
    const req = { path, headers: { cookie } } as any;
    const res = {
      status(code: number) { status = code; return this; },
      json(_body: unknown) { resolve({ next: false, status }); return this; },
    } as any;
    privateAuth(true)(req, res, () => resolve({ next: true, status }));
  });
}

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

test("only the one-time Android claim exchange is public", async () => {
  assert.deepEqual(await checkPrivateAuth("/api/android/pairing-invites/claim"), { next: true, status: null });
  assert.deepEqual(await checkPrivateAuth("/api/android/pairing-invites"), { next: false, status: 401 });
  assert.deepEqual(await checkPrivateAuth("/api/android/pairings"), { next: false, status: 401 });

  const session = createSession();
  try {
    assert.deepEqual(
      await checkPrivateAuth("/api/android/pairing-invites", `${cookieName}=${session}`),
      { next: true, status: null },
    );
  } finally {
    clearSession(session);
  }
});

test("encrypted pairing credentials are private and authenticated", () => {
  const plaintext = "android-pairing-token-for-test";
  const encrypted = sealJson(plaintext);
  assert.equal(encrypted.includes(plaintext), false);
  assert.equal(openJson(encrypted), plaintext);

  const [iv, tag, ciphertext] = encrypted.split(".");
  const changedCiphertext = `${ciphertext?.startsWith("A") ? "B" : "A"}${ciphertext?.slice(1) ?? ""}`;
  assert.throws(() => openJson(`${iv}.${tag}.${changedCiphertext}`));
});