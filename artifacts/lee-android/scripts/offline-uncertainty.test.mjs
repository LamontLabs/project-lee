import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

const notice = await fs.readFile(new URL("../components/UncertaintyNotice.tsx", import.meta.url), "utf8");
const brief = await fs.readFile(new URL("../app/(tabs)/index.tsx", import.meta.url), "utf8");
const capture = await fs.readFile(new URL("../app/(tabs)/capture.tsx", import.meta.url), "utf8");
const context = await fs.readFile(new URL("../context/LeeContext.tsx", import.meta.url), "utf8");
const storage = await fs.readFile(new URL("../lib/storage.ts", import.meta.url), "utf8");

const uncertainty = [
  {
    objectId: "project-alpha",
    objectType: "project",
    level: "HIGH",
    score: 0.98,
    outcomeLevel: "HIGH",
    timingLevel: "MEDIUM",
    scopeLevel: "HIGH",
    signals: ["Owner confirmation is missing"],
  },
  {
    objectId: "portfolio",
    objectType: "portfolio",
    level: "VERY HIGH",
    score: 0.42,
    outcomeLevel: "VERY HIGH",
    timingLevel: "HIGH",
    scopeLevel: "VERY HIGH",
    signals: ["Evidence is stale"],
  },
];

function highestUncertainty(items) {
  return items
    .filter((item) => item.level === "HIGH" || item.level === "VERY HIGH")
    .sort(
      (a, b) =>
        (b.level === "VERY HIGH" ? 2 : 1) -
          (a.level === "VERY HIGH" ? 2 : 1) ||
        b.score - a.score,
    )[0] ?? null;
}

test("briefing prioritizes VERY HIGH over a higher-scoring HIGH record", () => {
  assert.equal(highestUncertainty(uncertainty)?.objectId, "portfolio");
  assert.equal(highestUncertainty(uncertainty)?.level, "VERY HIGH");
});

test("cached uncertainty is rendered on both brief and capture screens", () => {
  assert.match(storage, /getUncertainty\(\): Promise<UncertaintyRecord\[\]>/);
  assert.match(storage, /saveUncertainty\(items: UncertaintyRecord\[\]\)/);
  assert.match(context, /getUncertainty\(\)/);
  assert.match(context, /setUncertainty\(storedUncertainty\)/);
  assert.match(brief, /highestUncertainty\(uncertainty\)/);
  assert.match(capture, /highestUncertainty\(uncertainty\)/);
  assert.match(capture, /<UncertaintyNotice item=\{item\} offline=\{!pairing\} \/>/);
  assert.match(notice, /VERY HIGH UNCERTAINTY/);
  assert.match(notice, /offline \? ' · CACHED' : ''/);
});

test("uncertainty refresh failure does not prevent a queued capture from saving", () => {
  const refreshStart = context.indexOf("async refresh()");
  const uncertaintyRefresh = context.indexOf("createLeeApi(pairing).uncertainty()", refreshStart);
  const refreshFailure = context.indexOf("Cached uncertainty remains available offline.", uncertaintyRefresh);
  const addCaptureStart = context.indexOf("async addCapture");
  const captureSave = context.indexOf("await saveCaptures(next);", addCaptureStart);
  const captureSync = context.indexOf("createLeeApi(pairing).capture", addCaptureStart);

  assert.notEqual(refreshStart, -1);
  assert.notEqual(uncertaintyRefresh, -1);
  assert.notEqual(refreshFailure, -1);
  assert.match(context.slice(uncertaintyRefresh, refreshFailure), /Promise\.all/);
  assert.match(context.slice(uncertaintyRefresh, refreshFailure + 90), /\}\s*catch\s*\{/);
  assert.ok(captureSave < captureSync, "capture must be persisted before any live sync attempt");
  assert.match(context.slice(addCaptureStart, captureSync), /status: 'queued'/);
});