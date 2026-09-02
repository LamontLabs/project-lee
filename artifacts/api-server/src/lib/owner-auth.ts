import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, chmodSync, existsSync, openSync, writeSync, closeSync } from "node:fs";
import { join } from "node:path";
const fileName = "owner-credentials.json";
const sessionSecretFileName = "session-secret";
const params = { N: 16384, r: 8, p: 1, keylen: 64 };

type OwnerRecord = { username: string; salt: string; hash: string; N: number; r: number; p: number; keylen: number };
function derive(password: string, salt: Buffer, keylen: number, N: number, r: number, p: number) {
  return new Promise<Buffer>((resolve, reject) => scryptCallback(password, salt, keylen, { N, r, p }, (error, result) => error ? reject(error) : resolve(result as Buffer)));
}
function dataDirectory() { return process.env.LEE_DATA_DIR ?? ".lee-data"; }
function path() { return join(dataDirectory(), fileName); }
function sessionSecretPath() { return join(dataDirectory(), sessionSecretFileName); }
function valid(value: unknown) { return typeof value === "string" && value.trim().length >= 1 && value.length <= 256; }
export function ownerExists() { return Boolean(process.env.LEE_OWNER_USERNAME && process.env.LEE_OWNER_PASSWORD) || existsSync(path()); }
function readRecord(): OwnerRecord | null {
  try {
    const record = JSON.parse(readFileSync(path(), "utf8")) as Partial<OwnerRecord>;
    if (!valid(record.username) || typeof record.salt !== "string" || !/^[a-f0-9]{32}$/i.test(record.salt) || typeof record.hash !== "string" || !/^[a-f0-9]{128}$/i.test(record.hash) || record.N !== params.N || record.r !== params.r || record.p !== params.p || record.keylen !== params.keylen) return null;
    return record as OwnerRecord;
  } catch { return null; }
}
export async function verifyOwner(username: unknown, password: unknown) {
  if (!valid(username) || typeof password !== "string") return false;
  if (process.env.LEE_OWNER_USERNAME && process.env.LEE_OWNER_PASSWORD) {
    return username === process.env.LEE_OWNER_USERNAME && password === process.env.LEE_OWNER_PASSWORD;
  }
  try {
    const record = readRecord();
    if (!record || record.username !== username) return false;
    const derived = await derive(password, Buffer.from(record.salt, "hex"), record.keylen, record.N, record.r, record.p);
    const expected = Buffer.from(record.hash, "hex");
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}
export async function enrollOwner(username: unknown, password: unknown) {
  if (!valid(username) || typeof password !== "string" || password.length < 12 || password.length > 512) {
    throw new Error("Owner name is required and the password must be at least 12 characters.");
  }
  if (ownerExists()) throw new Error("Owner enrollment has already been completed.");
  const salt = randomBytes(16);
  const hash = await derive(password, salt, params.keylen, params.N, params.r, params.p);
  const dir = dataDirectory();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { chmodSync(dir, 0o700); } catch { /* Windows ACLs are inherited. */ }
  const target = path();
  const contents = JSON.stringify({ username: String(username).trim(), salt: salt.toString("hex"), hash: hash.toString("hex"), ...params }) + "\n";
  let descriptor: number;
  try { descriptor = openSync(target, "wx", 0o600); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error("Owner enrollment has already been completed.");
    throw error;
  }
  try { writeSync(descriptor, contents, undefined, "utf8"); } finally { closeSync(descriptor); }
  try { chmodSync(target, 0o600); } catch { /* Windows ACLs are inherited. */ }
}

export function sessionSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured) return configured;
  const fallback = "development-session-secret";
  if (!process.env.LEE_DATA_DIR) return fallback;
  const dir = dataDirectory();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { chmodSync(dir, 0o700); } catch { /* Windows ACLs are inherited. */ }
  try {
    const existing = readFileSync(sessionSecretPath(), "utf8").trim();
    if (existing.length >= 32) return existing;
  } catch { /* Create the per-install secret below. */ }
  const generated = randomBytes(32).toString("hex");
  let descriptor: number;
  try { descriptor = openSync(sessionSecretPath(), "wx", 0o600); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return readFileSync(sessionSecretPath(), "utf8").trim();
    throw error;
  }
  try { writeSync(descriptor, `${generated}\n`, undefined, "utf8"); } finally { closeSync(descriptor); }
  try { chmodSync(sessionSecretPath(), 0o600); } catch { /* Windows ACLs are inherited. */ }
  return generated;
}