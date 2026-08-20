import { build } from "esbuild";
import { rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const outfile = "scripts/.cil-protocol-harness.cjs";
await build({
  entryPoints: ["scripts/cil-protocol-harness.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  outfile,
  external: ["assert", "buffer", "crypto", "events", "http", "https", "net", "os", "path", "stream", "string_decoder", "tls", "url", "util", "zlib", "node:*"],
});
try {
  await import(`${pathToFileURL(outfile).href}?run=${Date.now()}`);
} finally {
  await rm(outfile, { force: true });
}