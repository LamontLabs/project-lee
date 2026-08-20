import { build } from "esbuild";
import { rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const outfile = "scripts/.self-improvement-boundary.cjs";
await build({
  entryPoints: ["scripts/self-improvement-boundary.test.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  outfile,
  external: ["assert", "node:*"],
});
try {
  await import(`${pathToFileURL(outfile).href}?run=${Date.now()}`);
} finally {
  await rm(outfile, { force: true });
}