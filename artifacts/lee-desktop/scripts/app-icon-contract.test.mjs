import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import test from "node:test";

const desktopRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workspaceRoot = resolve(desktopRoot, "../..");

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

test("all shipped LEE app icon copies use the same canonical PNG", async () => {
  const canonical = join(desktopRoot, "resources", "lee.png");
  const expected = await sha256(canonical);
  const iconPaths = [
    join(workspaceRoot, "artifacts/lee-android/assets/images/icon.png"),
    join(workspaceRoot, "artifacts/lee-android/assets/images/icon_2.png"),
    join(workspaceRoot, "artifacts/lee-console/public/favicon.png"),
    join(workspaceRoot, "artifacts/lee-manual/public/favicon.png"),
    join(desktopRoot, "resources/console/favicon.png"),
  ];
  for (const path of iconPaths) {
    assert.equal(await sha256(path), expected, `Icon is not synchronized: ${path}`);
  }
});

test("desktop and web metadata point at the PNG app icon", async () => {
  const [builder, consoleHtml, manualHtml, packagedConsoleHtml, androidConfig] = await Promise.all([
    readFile(join(desktopRoot, "electron-builder.yml"), "utf8"),
    readFile(join(workspaceRoot, "artifacts/lee-console/index.html"), "utf8"),
    readFile(join(workspaceRoot, "artifacts/lee-manual/index.html"), "utf8"),
    readFile(join(desktopRoot, "resources/console/index.html"), "utf8"),
    readFile(join(workspaceRoot, "artifacts/lee-android/app.json"), "utf8"),
  ]);
  assert.match(builder, /icon: resources\/lee\.png/);
  assert.match(consoleHtml, /rel="icon" type="image\/png" href="\/favicon\.png\?icon=lee"/);
  assert.match(manualHtml, /rel="icon" type="image\/png" href="\/favicon\.png\?icon=lee"/);
  assert.match(packagedConsoleHtml, /rel="icon" type="image\/png" href="\/favicon\.png\?icon=lee"/);
  assert.match(androidConfig, /"icon": "\.\/assets\/images\/icon\.png"/);
});