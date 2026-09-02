import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { spawn } from "node:child_process";
import test from "node:test";

const execFileAsync = promisify(execFile);
const apiDirectory = new URL("..", import.meta.url);
const prefix = `economics-http-boundary-${randomUUID()}`;
let apiProcess;
let baseUrl;

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForApi(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("API server did not become ready for the economics boundary test.");
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { accept: "application/json", ...(options.body ? { "content-type": "application/json" } : {}), ...(options.headers ?? {}) },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

function post(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

function sourceRef(label) {
  return `${prefix}-${label}`;
}

function usage(overrides = {}) {
  return {
    operation: "object-storage-read",
    category: "storage",
    quantity: 12,
    unit: "bytes",
    provider: "github",
    sourceRef: `provider:github:${sourceRef("usage")}`,
    metadata: { testRun: prefix, provenance: "usage-fixture" },
    recordedAt: "2026-08-01T12:00:00.000Z",
    ...overrides,
  };
}

function price(overrides = {}) {
  return {
    operation: "object-storage-read",
    category: "storage",
    unit: "bytes",
    priceUsd: 0.0001,
    provider: "github",
    sourceRef: `provider:github:${sourceRef("price")}`,
    metadata: { testRun: prefix, provenance: "price-fixture" },
    effectiveAt: "2026-07-01T12:00:00.000Z",
    recordedAt: "2026-08-01T12:00:00.000Z",
    ...overrides,
  };
}

async function ledger() {
  const result = await request("/api/economics/ledger");
  assert.equal(result.response.status, 200);
  return result.body;
}

async function deleteTestRows() {
  if (!process.env.DATABASE_URL) return;
  await execFileAsync("psql", [
    process.env.DATABASE_URL,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `DELETE FROM economic_usage_record WHERE source_ref LIKE '${prefix}-%'; DELETE FROM economic_price_evidence WHERE source_ref LIKE '${prefix}-%';`,
  ]);
}

test.before(async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required for the economics boundary test.");
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), NODE_ENV: "test", LEE_BOOT_MODE: "COLD_BOOT" };
  delete env.LEE_OWNER_USERNAME;
  delete env.LEE_OWNER_PASSWORD;
  apiProcess = spawn(process.execPath, ["dist/index.mjs"], {
    cwd: apiDirectory,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  apiProcess.stderr.on("data", (chunk) => { stderr += chunk; });
  await waitForApi(baseUrl).catch((error) => {
    apiProcess.kill("SIGTERM");
    throw new Error(`${error.message}\n${stderr}`);
  });
});

test.after(async () => {
  await deleteTestRows();
  if (apiProcess && !apiProcess.killed) {
    apiProcess.kill("SIGTERM");
    await new Promise((resolve) => apiProcess.once("exit", resolve));
  }
});

test("economics write routes reject invalid records without creating ledger rows", async () => {
  const invalidCases = [
    { path: "/api/economics/usage", body: usage({ sourceRef: sourceRef("usage-invalid-category"), category: "compute" }) },
    { path: "/api/economics/usage", body: usage({ sourceRef: sourceRef("usage-negative"), quantity: -1 }) },
    { path: "/api/economics/usage", body: usage({ sourceRef: sourceRef("usage-malformed-date"), recordedAt: "not-a-timestamp" }) },
    { path: "/api/economics/usage", body: usage({ sourceRef: sourceRef("usage-null-date"), recordedAt: null }) },
    { path: "/api/economics/prices", body: price({ sourceRef: sourceRef("price-invalid-category"), category: "compute" }) },
    { path: "/api/economics/prices", body: price({ sourceRef: sourceRef("price-negative"), priceUsd: -0.01 }) },
    { path: "/api/economics/prices", body: price({ sourceRef: sourceRef("price-malformed-effective"), effectiveAt: "not-a-timestamp" }) },
    { path: "/api/economics/prices", body: price({ sourceRef: sourceRef("price-malformed-recorded"), recordedAt: "not-a-timestamp" }) },
    { path: "/api/economics/prices", body: price({ sourceRef: sourceRef("price-null-effective"), effectiveAt: null }) },
  ];

  const nonFiniteUsage = JSON.stringify(usage({ sourceRef: sourceRef("usage-non-finite"), quantity: null })).replace('"quantity":null', '"quantity":NaN');
  const nonFinitePrice = JSON.stringify(price({ sourceRef: sourceRef("price-non-finite"), priceUsd: null })).replace('"priceUsd":null', '"priceUsd":NaN');
  for (const invalidCase of invalidCases) {
    const result = await post(invalidCase.path, invalidCase.body);
    assert.equal(result.response.status, 400, `${invalidCase.path} should reject ${invalidCase.body.sourceRef}`);
  }
  for (const [path, rawBody, label] of [
    ["/api/economics/usage", nonFiniteUsage, "usage-non-finite"],
    ["/api/economics/prices", nonFinitePrice, "price-non-finite"],
  ]) {
    const result = await request(path, { method: "POST", body: rawBody });
    assert.equal(result.response.status, 400, `${path} should reject ${label}`);
  }

  const result = await ledger();
  const rows = [...(result.usage ?? []), ...(result.prices ?? [])];
  for (const invalidCase of invalidCases) {
    assert.equal(rows.some((row) => row.sourceRef === invalidCase.body.sourceRef), false, `rejected ${invalidCase.body.sourceRef} entered a ledger`);
  }
  assert.equal(rows.some((row) => row.sourceRef === sourceRef("usage-non-finite")), false, "rejected non-finite usage entered a ledger");
  assert.equal(rows.some((row) => row.sourceRef === sourceRef("price-non-finite")), false, "rejected non-finite price entered a ledger");
});

test("economics write routes preserve accepted provenance fields", async () => {
  const usagePayload = usage({ sourceRef: `provider:github:${sourceRef("accepted-usage")}`, recordedAt: new Date().toISOString(), metadata: { testRun: prefix, owner: "founder", evidence: "measured" } });
  const pricePayload = price({ sourceRef: `provider:github:${sourceRef("accepted-price")}`, effectiveAt: new Date(Date.now() - 1000).toISOString(), recordedAt: new Date().toISOString(), metadata: { testRun: prefix, owner: "founder", evidence: "provider-price" } });
  const usageResult = await post("/api/economics/usage", usagePayload);
  const priceResult = await post("/api/economics/prices", pricePayload);
  assert.equal(usageResult.response.status, 201);
  assert.equal(priceResult.response.status, 201);
  assert.equal(usageResult.body.sourceRef, usagePayload.sourceRef);
  assert.match(usageResult.body.evidenceRef, /^provider_registration:[0-9a-f-]{36}$/);
  assert.deepEqual(usageResult.body.metadata, usagePayload.metadata);
  assert.equal(priceResult.body.sourceRef, pricePayload.sourceRef);
  assert.match(priceResult.body.evidenceRef, /^provider_registration:[0-9a-f-]{36}$/);
  assert.deepEqual(priceResult.body.metadata, pricePayload.metadata);
  assert.equal(priceResult.body.provider, pricePayload.provider);
  assert.equal(new Date(usageResult.body.recordedAt).toISOString(), usagePayload.recordedAt);
  assert.equal(new Date(priceResult.body.effectiveAt).toISOString(), pricePayload.effectiveAt);

  const result = await ledger();
  assert.equal(result.usage.filter((row) => row.sourceRef === usagePayload.sourceRef).length, 1);
  assert.equal(result.prices.filter((row) => row.sourceRef === pricePayload.sourceRef).length, 1);
  assert.equal(result.usage.find((row) => row.sourceRef === usagePayload.sourceRef).evidenceRef, usageResult.body.evidenceRef);
  assert.equal(result.prices.find((row) => row.sourceRef === pricePayload.sourceRef).evidenceRef, priceResult.body.evidenceRef);

  const cycleResult = await post("/api/economics/cycle", {});
  assert.equal(cycleResult.response.status, 201);
  const storageProvenance = cycleResult.body.summary.metrics["storage.cost_usd"].provenance;
  assert.ok(storageProvenance.includes(usageResult.body.evidenceRef));
  assert.ok(storageProvenance.includes(priceResult.body.evidenceRef));
});

test("economics write routes reject unknown provenance before insertion", async () => {
  const unknownUsage = usage({ sourceRef: sourceRef("unknown-usage") });
  const unknownPrice = price({ sourceRef: sourceRef("unknown-price") });
  const usageResult = await post("/api/economics/usage", unknownUsage);
  const priceResult = await post("/api/economics/prices", unknownPrice);
  assert.equal(usageResult.response.status, 400);
  assert.equal(priceResult.response.status, 400);
  const result = await ledger();
  assert.equal(result.usage.some((row) => row.sourceRef === unknownUsage.sourceRef), false);
  assert.equal(result.prices.some((row) => row.sourceRef === unknownPrice.sourceRef), false);
});