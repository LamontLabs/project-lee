import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, chmodSync, existsSync, openSync, writeSync, closeSync } from "node:fs";
import { join } from "node:path";
const fileName = "owner-credentials.json";
const params = { N: 16384, r: 8, p: 1, keylen: 64 };

type OwnerRecord = { username: string; salt: string; hash: string; N: number; r: number; p: number; keylen: number };
function derive(password: string, salt: Buffer, keylen: number, N: number, r: number, p: number) {
  return new Promise<Buffer>((resolve, reject) => scryptCallback(password, salt, keylen, { N, r, p }, (error, result) => error ? reject(error) : resolve(result as Buffer)));
}
function path() { return join(process.env.LEE_DATA_DIR ?? ".lee-data", fileName); }
function valid(value: unknown) { return typeof value === "string" && value.trim().length >= 1 && value.length <= 256; }
export function ownerExists() { return Boolean(process.env.LEE_OWNER_USERNAME && process.env.LEE_OWNER_PASSWORD) || existsSync(path()); }
function readRecord(): OwnerRecord | null {
  try { return JSON.parse(readFileSync(path(), "utf8")) as OwnerRecord; } catch { return null; }
}
export async function verifyOwner(username: unknown, password: unknown) {
  if (!valid(username) || typeof password !== "string") return false;
  if (process.env.LEE_OWNER_USERNAME && process.env.LEE_OWNER_PASSWORD) {
    return username === process.env.LEE_OWNER_USERNAME && password === process.env.LEE_OWNER_PASSWORD;
  }
  const record = readRecord();
  if (!record || record.username !== username) return false;
  const derived = await derive(password, Buffer.from(record.salt, "hex"), record.keylen, record.N, record.r, record.p);
  const expected = Buffer.from(record.hash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
export async function enrollOwner(username: unknown, password: unknown) {
  if (!valid(username) || typeof password !== "string" || password.length < 12 || password.length > 512) {
    throw new Error("Owner name is required and the password must be at least 12 characters.");
  }
  if (ownerExists()) throw new Error("Owner enrollment has already been completed.");
  const salt = randomBytes(16);
  const hash = await derive(password, salt, params.keylen, params.N, params.r, params.p);
  const dir = process.env.LEE_DATA_DIR ?? ".lee-data";
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