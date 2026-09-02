import { build } from "esbuild";
import { rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const outfile = "scripts/.consequential-execution-harness.cjs";
await build({
  entryPoints: ["scripts/consequential-execution-harness.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  outfile,
  external: [
    "assert", "buffer", "crypto", "events", "http", "https", "net", "os",
    "path", "stream", "string_decoder", "tls", "url", "util", "zlib",
    "node:*",
  ],
});
try {
  await import(`${pathToFileURL(outfile).href}?run=${Date.now()}`);
} finally {
  await rm(outfile, { force: true });
}