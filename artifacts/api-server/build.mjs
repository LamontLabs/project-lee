import { createRequire } from "node:module";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(artifactDir, "../..");

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    if (entry.isFile() && /\.(?:ts|tsx|mts|mjs|js|json|sql)$/.test(entry.name)) return [absolute];
    return [];
  }));
  return nested.flat();
}

async function calculateBuildId() {
  const inputs = [
    ...await sourceFiles(path.resolve(artifactDir, "src")),
    ...await sourceFiles(path.resolve(workspaceRoot, "lib/db/src")),
    path.resolve(artifactDir, "package.json"),
    path.resolve(artifactDir, "tsconfig.json"),
    path.resolve(artifactDir, "build.mjs"),
    path.resolve(workspaceRoot, "lib/db/package.json"),
    path.resolve(workspaceRoot, "pnpm-lock.yaml"),
    path.resolve(workspaceRoot, "tsconfig.base.json"),
  ].sort();
  const hash = createHash("sha256");
  for (const input of inputs) {
    hash.update(path.relative(workspaceRoot, input));
    hash.update("\0");
    hash.update(await readFile(input));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  const buildId = await calculateBuildId();
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outdir: distDir,
    outExtension: { ".js": ".cjs" },
    logLevel: "info",
    define: {
      __LEE_BUILD_ID__: JSON.stringify(buildId),
    },
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: {
      js: `globalThis.require = require;
globalThis.__filename = __filename;
globalThis.__dirname = __dirname;
    `,
    },
  });

  const generatedFiles = await readdir(distDir);
  const absoluteWorkerPath = /const outputDir = "(?:\\.|[^"\\])*";/g;
  for (const fileName of generatedFiles.filter((name) => name.endsWith(".mjs") || name.endsWith(".cjs"))) {
    const filePath = path.resolve(distDir, fileName);
    const source = await readFile(filePath, "utf8");
    const portableSource = source.replace(absoluteWorkerPath, "const outputDir = globalThis.__dirname;");
    if (portableSource !== source) await writeFile(filePath, portableSource, "utf8");
  }
  await writeFile(
    path.resolve(distDir, "index.mjs"),
    'import "./index.cjs";\n',
    "utf8",
  );
  console.info(`LEE_API_BUILD_ID=${buildId}`);
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
