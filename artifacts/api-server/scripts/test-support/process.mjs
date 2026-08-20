import { spawn } from "node:child_process";

export async function simulateRestart(command, args = [], env = {}) {
  const run = () => new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
  const first = await run();
  const second = await run();
  return { first, second, restarted: first.code === 0 && second.code === 0 };
}

export async function withFailureInjection(injectedError, run) {
  try {
    return await run();
  } catch (error) {
    if (String(error) !== String(injectedError)) throw error;
    return { injected: true, error: String(error) };
  }
}
