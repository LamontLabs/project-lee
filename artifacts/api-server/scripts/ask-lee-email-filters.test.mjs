import { build } from "esbuild";
import { rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const outfile = "scripts/.ask-lee-email-filters.cjs";
await build({
  entryPoints: ["scripts/ask-lee-email-filters.test.ts"],
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