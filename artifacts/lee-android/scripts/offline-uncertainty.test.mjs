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
  assert.match(storage, /getUncertaintyCache/);
  assert.match(storage, /saveUncertaintyCache/);
  assert.match(context, /getUncertainty\(\)/);
  assert.match(context, /setUncertainty\(storedUncertainty/);
  assert.match(brief, /const uncertainty = uncertaintySnapshot\?\.value \?\? \[\]/);
  assert.match(brief, /highestUncertainty\(uncertainty\)/);
  assert.match(capture, /highestUncertainty\(uncertainty\?\.value \?\? \[\]\)/);
  assert.match(capture, /<UncertaintyNotice item=\{uncertaintyItem\} offline=\{!pairing\} \/>/);
  assert.match(notice, /VERY HIGH UNCERTAINTY/);
  assert.match(notice, /offline \? ' · CACHED' : ''/);
});

test("uncertainty refresh failure does not prevent a queued capture from saving", () => {
  const hostedRefresh = context.indexOf("const refreshHosted");
  const uncertaintyRead = context.indexOf("uncertaintyRequest ?? createLeeApi(pairing).uncertainty()", hostedRefresh);
  const enqueueStart = context.indexOf("const enqueuePerception");
  const captureSave = context.indexOf("await saveCaptures(next);", enqueueStart);
  const captureSync = context.indexOf("await syncCapture(capture)", captureSave);

  assert.notEqual(hostedRefresh, -1);
  assert.notEqual(uncertaintyRead, -1);
  assert.notEqual(enqueueStart, -1);
  assert.ok(captureSave > enqueueStart, "capture must be persisted before sync");
  assert.ok(captureSync > captureSave, "sync must happen only after persistence");
  assert.match(context.slice(enqueueStart, captureSave), /status: 'queued'/);
});