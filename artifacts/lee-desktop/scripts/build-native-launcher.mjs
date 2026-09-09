import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(desktop, "resources", "postgres-launcher.c");
const output = join(desktop, "resources", "postgres-launcher.exe");

if (process.platform !== "win32") {
  console.log("Skipping native Windows PostgreSQL launcher build on non-Windows.");
  process.exit(0);
}

mkdirSync(dirname(output), { recursive: true });
rmSync(output, { force: true });

function compile(command, args) {
  const result = spawnSync(command, args, { cwd: desktop, stdio: "inherit", windowsHide: true });
  if (result.error || result.status !== 0) {
    throw result.error ?? new Error(`${command} exited with status ${result.status}.`);
  }
}

const compiler = spawnSync("where.exe", ["cl.exe"], { encoding: "utf8", windowsHide: true });
if (compiler.status === 0 && compiler.stdout.trim()) {
  compile("cl.exe", ["/nologo", "/O2", "/MT", "/W4", "/DUNICODE", "/D_UNICODE", source, `/Fe:${output}`, "/link", "/SUBSYSTEM:CONSOLE"]);
} else {
  const vswhere = join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Microsoft Visual Studio", "Installer", "vswhere.exe");
  if (!existsSync(vswhere)) throw new Error("Visual Studio C++ tools are required to build the native Windows PostgreSQL launcher.");
  const installation = spawnSync(vswhere, ["-latest", "-products", "*", "-requires", "Microsoft.VisualStudio.Component.VC.Tools.x86.x64", "-property", "installationPath"], { encoding: "utf8", windowsHide: true });
  const installationPath = installation.stdout.trim();
  if (installation.status !== 0 || !installationPath) throw new Error("Visual Studio C++ tools are required to build the native Windows PostgreSQL launcher.");
  const vcvars = join(installationPath, "VC", "Auxiliary", "Build", "vcvars64.bat");
  const batchName = ".build-native-launcher.cmd";
  const batchPath = join(desktop, batchName);
  writeFileSync(batchPath, [
    "@echo off",
    `call "${vcvars}"`,
    "if errorlevel 1 exit /b 1",
    `cl.exe /nologo /O2 /MT /W4 /DUNICODE /D_UNICODE "${source}" /Fe:"${output}" /link /SUBSYSTEM:CONSOLE`,
    "exit /b %errorlevel%",
    "",
  ].join("\r\n"));
  try {
    compile("cmd.exe", ["/d", "/c", batchName]);
  } finally {
    rmSync(batchPath, { force: true });
  }
}

if (!existsSync(output)) throw new Error("Native Windows PostgreSQL launcher was not produced.");
console.log(`Built native Windows PostgreSQL launcher: ${output}`);