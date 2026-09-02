import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve, relative, isAbsolute } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { auditLog, db } from "@workspace/db";

const execFileAsync = promisify(execFile);
const MAX_FILE_BYTES = 512 * 1024;
const MAX_OUTPUT_BYTES = 200_000;
const CHANGE_TTL_MS = 10 * 60 * 1000;

export type ProjectConfig = {
  id: string;
  name: string;
  endpoint: string;
  tokenEnv?: string;
  capabilities?: string[];
  adapter?: "auto" | "project-agent" | "replit-standard";
};

export type Change = { path: string; content: string };

type PendingChange = { projectId: string; changes: Change[]; expiresAt: number };

const pendingChanges = new Map<string, PendingChange>();
const runtimeProjects = new Map<string, ProjectConfig>();
const resolvedAdapters = new Map<string, Exclude<ProjectConfig["adapter"], "auto" | undefined>>();

function constantTimeEquals(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function bridgeTokenMatches(value: string | undefined, configured: string | undefined) {
  return Boolean(value && configured && constantTimeEquals(value, configured));
}

export function configuredProjects(): ProjectConfig[] {
  const raw = process.env.MCP_PROJECTS_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ProjectConfig =>
      item && typeof item.id === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(item.id) &&
      typeof item.name === "string" && typeof item.endpoint === "string" &&
      /^https:\/\//i.test(item.endpoint),
    ).map((item) => ({
      ...item,
      endpoint: item.endpoint.replace(/\/+$/, ""),
      adapter: item.adapter === "project-agent" || item.adapter === "replit-standard" ? item.adapter : "auto",
    }));
  } catch {
    return [];
  }
}

export function projectFor(id: string) {
  return runtimeProjects.get(id) ?? configuredProjects().find((project) => project.id === id);
}

export function registerProject(project: ProjectConfig) {
  if (project.adapter && !["auto", "project-agent", "replit-standard"].includes(project.adapter)) {
    throw new Error("Unsupported project adapter.");
  }
  resolvedAdapters.delete(project.id);
  runtimeProjects.set(project.id, project);
}

export function registeredProjects() {
  return [...runtimeProjects.values()];
}

function projectPersistenceMetadata(project: ProjectConfig) {
  return {
    id: project.id,
    name: project.name,
    endpoint: project.endpoint,
    ...(project.tokenEnv ? { tokenEnv: project.tokenEnv } : {}),
    adapter: project.adapter ?? "auto",
    ...(project.capabilities ? { capabilities: project.capabilities } : {}),
  };
}

/**
 * Returns the restart-safe MCP_PROJECTS_JSON value without resolving any
 * credential references. Runtime registrations replace only their own ID.
 */
export function persistedProjectsJson() {
  const projects = new Map(configuredProjects().map((project) => [project.id, project]));
  for (const project of runtimeProjects.values()) projects.set(project.id, project);
  return JSON.stringify([...projects.values()].map(projectPersistenceMetadata), null, 2);
}

function configuredToken(project: ProjectConfig) {
  return project.tokenEnv ? process.env[project.tokenEnv] : undefined;
}

export function changeConfirmationSignature(token: string, changes: Change[]) {
  return createHmac("sha256", token).update(JSON.stringify(changes)).digest("hex");
}

function validatePath(path: string) {
  if (!path || path.length > 240 || path.includes("\0") || isAbsolute(path)) throw new Error("A relative workspace path is required.");
  const normalized = path.replaceAll("\\", "/");
  if (normalized.split("/").includes("..") || normalized.startsWith(".git/") || normalized === ".git" || normalized.startsWith(".env")) throw new Error("That workspace path is not allowed.");
  return normalized;
}

function allowedCommand(command: string) {
  const normalized = command.trim();
  const allowed = new Set(["pnpm run typecheck", "pnpm run build", "pnpm test", "npm run typecheck", "npm run build", "npm test"]);
  if (!allowed.has(normalized)) throw new Error("Only the registered project checks are allowed.");
  return normalized;
}

async function recordBridgeAudit(action: string, projectId: string | undefined, outcome: string, metadata: Record<string, unknown> = {}) {
  await db.insert(auditLog).values({ action, actor: "mcp-project-bridge", targetType: "mcp_project", targetId: projectId ?? "bridge", outcome, metadata }).catch(() => undefined);
}

type RemoteError = Error & { status?: number };

async function remoteRequestAt(project: ProjectConfig, path: string, init: RequestInit = {}) {
  const token = configuredToken(project);
  if (!token) throw new Error(`No server-side credential is configured for project ${project.id}.`);
  const response = await fetch(`${project.endpoint}${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-project-bridge-key": token, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(20_000),
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`${project.id} returned ${response.status}: ${String(body.error ?? "Project request failed")}`) as RemoteError;
    error.status = response.status;
    throw error;
  }
  return body;
}

const adapterRoutes = {
  "project-agent": {
    inspect: "/api/project-bridge/inspect",
    read: "/api/project-bridge/files/read",
    preview: "/api/project-bridge/changes/preview",
    apply: "/api/project-bridge/changes/apply",
    check: "/api/project-bridge/checks/run",
  },
  "replit-standard": {
    inspect: "/api/inspect",
    read: "/api/files/read",
    preview: "/api/changes/preview",
    apply: "/api/changes/apply",
    check: "/api/checks/run",
  },
} as const;

type AdapterOperation = keyof typeof adapterRoutes["project-agent"];

async function remoteRequest(project: ProjectConfig, operation: AdapterOperation, init: RequestInit = {}) {
  const configuredAdapter = project.adapter ?? "auto";
  const knownAdapter = configuredAdapter === "auto" ? resolvedAdapters.get(project.id) : configuredAdapter;
  if (knownAdapter) return remoteRequestAt(project, adapterRoutes[knownAdapter][operation], init);

  try {
    const result = await remoteRequestAt(project, adapterRoutes["project-agent"].inspect);
    resolvedAdapters.set(project.id, "project-agent");
    if (operation === "inspect") return result;
  } catch (error) {
    // Auto-detection may fall back only when the companion route is absent.
    // Auth, permission, timeout, and server failures must remain visible.
    if ((error as RemoteError)?.status !== 404) throw error;
  }
  resolvedAdapters.set(project.id, "replit-standard");
  return remoteRequestAt(project, adapterRoutes["replit-standard"][operation], init);
}

export async function listProjects() {
  const projects = new Map(configuredProjects().map((project) => [project.id, project]));
  for (const project of runtimeProjects.values()) projects.set(project.id, project);
  return [...projects.values()].map(({ id, name, endpoint, capabilities }) => ({ id, name, endpoint, capabilities: capabilities ?? ["inspect", "read", "preview", "apply", "check"] }));
}

export async function inspectProject(projectId: string) {
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  const result: any = await remoteRequest(project, "inspect");
  await recordBridgeAudit("mcp_project_inspect", projectId, "success");
  return { project: { id: project.id, name: project.name }, ...result };
}

export async function readProjectFile(projectId: string, path: string) {
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  const result = await remoteRequest(project, "read", { method: "POST", body: JSON.stringify({ path: validatePath(path) }) });
  await recordBridgeAudit("mcp_project_file_read", projectId, "success", { path });
  return result;
}

export async function previewProjectChanges(projectId: string, changes: Change[]) {
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  if (!Array.isArray(changes) || changes.length === 0 || changes.length > 50) throw new Error("Provide between 1 and 50 changes.");
  const cleanChanges = changes.map((change) => ({ path: validatePath(String(change.path)), content: String(change.content) }));
  if (cleanChanges.some((change) => Buffer.byteLength(change.content) > MAX_FILE_BYTES)) throw new Error("A changed file exceeds the size limit.");
  const result: any = await remoteRequest(project, "preview", { method: "POST", body: JSON.stringify({ changes: cleanChanges }) });
  const confirmationToken = createHash("sha256").update(`${projectId}:${JSON.stringify(cleanChanges)}:${Date.now()}`).digest("hex");
  pendingChanges.set(confirmationToken, { projectId, changes: cleanChanges, expiresAt: Date.now() + CHANGE_TTL_MS });
  await recordBridgeAudit("mcp_project_change_preview", projectId, "success", { paths: cleanChanges.map((change) => change.path) });
  return { ...result, confirmationToken, expiresAt: new Date(Date.now() + CHANGE_TTL_MS).toISOString(), requiresConfirmation: true };
}

export async function applyProjectChanges(projectId: string, changes: Change[], confirmationToken: string) {
  const pending = pendingChanges.get(confirmationToken);
  if (!pending || pending.expiresAt < Date.now() || pending.projectId !== projectId || JSON.stringify(pending.changes) !== JSON.stringify(changes)) throw new Error("A fresh matching change preview and explicit confirmation are required.");
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  const token = configuredToken(project);
  const result = await remoteRequest(project, "apply", { method: "POST", headers: { "x-project-bridge-confirmation": changeConfirmationSignature(String(token), pending.changes) }, body: JSON.stringify({ changes: pending.changes, confirmationToken }) });
  pendingChanges.delete(confirmationToken);
  await recordBridgeAudit("mcp_project_change_apply", projectId, "success", { paths: pending.changes.map((change) => change.path) });
  return result;
}

export async function runProjectCheck(projectId: string, command: string) {
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  const result: any = await remoteRequest(project, "check", { method: "POST", body: JSON.stringify({ command: allowedCommand(command) }) });
  await recordBridgeAudit("mcp_project_check_run", projectId, result.exitCode === 0 ? "success" : "failed", { command });
  return result;
}

export async function executeWorkPlan(steps: Array<{ id: string; projectId: string; operation: "inspect" | "read" | "preview" | "apply" | "check"; path?: string; changes?: Change[]; command?: string; confirmationToken?: string; dependsOn?: string[] }>) {
  const results: Array<{ id: string; status: string; result?: unknown; error?: string }> = [];
  for (const step of steps) {
    const blocked = (step.dependsOn ?? []).some((dependency) => results.find((result) => result.id === dependency)?.status !== "success");
    if (blocked) { results.push({ id: step.id, status: "skipped", error: "A dependency did not succeed." }); continue; }
    try {
      const result = step.operation === "inspect" ? await inspectProject(step.projectId)
        : step.operation === "read" ? await readProjectFile(step.projectId, String(step.path ?? ""))
          : step.operation === "preview" ? await previewProjectChanges(step.projectId, step.changes ?? [])
            : step.operation === "apply" ? await applyProjectChanges(step.projectId, step.changes ?? [], String(step.confirmationToken ?? ""))
              : await runProjectCheck(step.projectId, String(step.command ?? ""));
      results.push({ id: step.id, status: "success", result });
    } catch (error) {
      results.push({ id: step.id, status: "failed", error: error instanceof Error ? error.message : "Project operation failed." });
    }
  }
  return { results, completed: results.filter((result) => result.status === "success").length, failed: results.filter((result) => result.status === "failed").length };
}

export async function localProjectInspect() {
  return { name: process.env.MCP_PROJECT_NAME ?? "Replit project", capabilities: ["inspect", "read", "preview", "apply", "check"], root: "workspace-relative" };
}

export async function localReadFile(path: string) {
  const cleanPath = validatePath(path);
  const root = resolve(process.env.MCP_PROJECT_ROOT ?? process.cwd());
  const absolute = resolve(root, cleanPath);
  if (relative(root, absolute).startsWith("..")) throw new Error("That workspace path is not allowed.");
  const content = await readFile(absolute, "utf8");
  if (Buffer.byteLength(content) > MAX_FILE_BYTES) throw new Error("The requested file exceeds the size limit.");
  return { path: cleanPath, content, bytes: Buffer.byteLength(content) };
}

export async function localPreviewChanges(changes: Change[]) {
  if (!Array.isArray(changes) || changes.length === 0 || changes.length > 50) throw new Error("Provide between 1 and 50 changes.");
  const previews = [];
  for (const change of changes) {
    if (typeof change?.path !== "string" || typeof change?.content !== "string") throw new Error("Each change requires a path and string content.");
    const current = await localReadFile(change.path).catch(() => ({ content: "", bytes: 0 }));
    if (Buffer.byteLength(change.content) > MAX_FILE_BYTES) throw new Error("A changed file exceeds the size limit.");
    previews.push({ path: validatePath(change.path), currentBytes: current.bytes, proposedBytes: Buffer.byteLength(change.content), changed: current.content !== change.content });
  }
  return { previews };
}

export async function localApplyChanges(changes: Change[]) {
  if (!Array.isArray(changes) || changes.length === 0 || changes.length > 50) throw new Error("Provide between 1 and 50 changes.");
  const root = resolve(process.env.MCP_PROJECT_ROOT ?? process.cwd());
  for (const change of changes) {
    if (typeof change?.path !== "string" || typeof change?.content !== "string" || Buffer.byteLength(change.content) > MAX_FILE_BYTES) throw new Error("Each change requires a valid path and bounded string content.");
    const cleanPath = validatePath(change.path);
    const absolute = resolve(root, cleanPath);
    if (relative(root, absolute).startsWith("..")) throw new Error("That workspace path is not allowed.");
    await mkdir(resolve(absolute, ".."), { recursive: true });
    await writeFile(absolute, change.content, "utf8");
  }
  return { applied: changes.map((change) => change.path) };
}

export async function localRunCheck(command: string) {
  const cleanCommand = allowedCommand(command);
  const [program, ...args] = cleanCommand.split(" ");
  try {
    const result = await execFileAsync(program, args, { cwd: resolve(process.env.MCP_PROJECT_ROOT ?? process.cwd()), timeout: 120_000, maxBuffer: MAX_OUTPUT_BYTES });
    return { command: cleanCommand, exitCode: 0, stdout: result.stdout.slice(0, MAX_OUTPUT_BYTES), stderr: result.stderr.slice(0, MAX_OUTPUT_BYTES) };
  } catch (error: any) {
    return { command: cleanCommand, exitCode: Number(error?.code ?? 1), stdout: String(error?.stdout ?? "").slice(0, MAX_OUTPUT_BYTES), stderr: String(error?.stderr ?? error?.message ?? "").slice(0, MAX_OUTPUT_BYTES) };
  }
}