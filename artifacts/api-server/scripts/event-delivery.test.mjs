import { build } from "esbuild";
import { rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const outfile = "scripts/.event-delivery-harness.cjs";
await build({
  entryPoints: ["scripts/event-delivery-harness.ts"],
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
await import(`${pathToFileURL(outfile).href}?run=${Date.now()}`);
await rm(outfile, { force: true });