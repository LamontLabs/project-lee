import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve, relative, isAbsolute } from "node:path";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { auditLog, db } from "@workspace/db";
import { executeConsequentialAction } from "./consequential-execution";

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
  capabilityLevel?: ProjectCapabilityLevel;
  adapter?: "auto" | "project-agent" | "replit-standard";
};

export type Change = { path: string; content: string };
export const PROJECT_CAPABILITY_LEVELS = ["OBSERVE", "USE", "MANAGE", "GOVERNED_MANAGE"] as const;
export type ProjectCapabilityLevel = typeof PROJECT_CAPABILITY_LEVELS[number];
export const PROJECT_OPERATIONS = [
  "inspect", "search", "read", "dependencies", "logs", "contract", "deployment",
  "check", "preview", "restart", "apply",
] as const;
export type ProjectOperation = typeof PROJECT_OPERATIONS[number];
const operationRequirements: Record<ProjectOperation, ProjectCapabilityLevel> = {
  inspect: "OBSERVE",
  search: "OBSERVE",
  read: "OBSERVE",
  dependencies: "OBSERVE",
  logs: "OBSERVE",
  contract: "OBSERVE",
  deployment: "OBSERVE",
  check: "USE",
  preview: "USE",
  restart: "MANAGE",
  apply: "GOVERNED_MANAGE",
};
const capabilityRank: Record<ProjectCapabilityLevel, number> = { OBSERVE: 0, USE: 1, MANAGE: 2, GOVERNED_MANAGE: 3 };

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
      capabilityLevel: PROJECT_CAPABILITY_LEVELS.includes(item.capabilityLevel as ProjectCapabilityLevel) ? item.capabilityLevel as ProjectCapabilityLevel : "OBSERVE",
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
  if (project.capabilityLevel && !PROJECT_CAPABILITY_LEVELS.includes(project.capabilityLevel)) {
    throw new Error("Unsupported project capability level.");
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
    capabilityLevel: project.capabilityLevel ?? "OBSERVE",
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

export function capabilityLevelFor(project: ProjectConfig): ProjectCapabilityLevel {
  return PROJECT_CAPABILITY_LEVELS.includes(project.capabilityLevel as ProjectCapabilityLevel) ? project.capabilityLevel as ProjectCapabilityLevel : "OBSERVE";
}

export function allowedProjectOperations(project: ProjectConfig) {
  const level = capabilityLevelFor(project);
  return PROJECT_OPERATIONS.filter((operation) => capabilityRank[level] >= capabilityRank[operationRequirements[operation]]);
}

export function projectOperationAuthorization(project: ProjectConfig, operation: ProjectOperation) {
  const granted = capabilityLevelFor(project);
  const required = operationRequirements[operation];
  return {
    allowed: capabilityRank[granted] >= capabilityRank[required],
    operation,
    requiredCapability: required,
    grantedCapability: granted,
    reason: capabilityRank[granted] >= capabilityRank[required] ? null : `${operation} requires ${required}; project is registered at ${granted}.`,
  };
}

async function requireProjectOperation(project: ProjectConfig, operation: ProjectOperation) {
  const authorization = projectOperationAuthorization(project, operation);
  if (!authorization.allowed) {
    await recordBridgeAudit("mcp_project_operation_denied", project.id, "denied", authorization);
    throw new Error(authorization.reason ?? "Project operation is not authorized.");
  }
  return authorization;
}

function validatePath(path: string) {
  if (!path || path.length > 240 || path.includes("\0") || isAbsolute(path)) throw new Error("A relative workspace path is required.");
  const normalized = path.replaceAll("\\", "/");
  if (normalized.split("/").includes("..") || normalized.startsWith(".git/") || normalized === ".git" || normalized.startsWith(".env")) throw new Error("That workspace path is not allowed.");
  return normalized;
}

function allowedCommand(command: string) {
  const normalized = command.trim();
  const allowed = new Set(["pnpm run typecheck", "pnpm run build", "pnpm test", "pnpm run ci", "pnpm run lint", "npm run typecheck", "npm run build", "npm test", "npm run ci", "npm run lint"]);
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
    search: "/api/project-bridge/search",
    read: "/api/project-bridge/files/read",
    dependencies: "/api/project-bridge/dependencies",
    logs: "/api/project-bridge/logs",
    contract: "/api/project-bridge/contract/compare",
    deployment: "/api/project-bridge/deployment",
    preview: "/api/project-bridge/changes/preview",
    apply: "/api/project-bridge/changes/apply",
    check: "/api/project-bridge/checks/run",
    restart: "/api/project-bridge/restart",
  },
  "replit-standard": {
    inspect: "/api/inspect",
    search: "/api/search",
    read: "/api/files/read",
    dependencies: "/api/dependencies",
    logs: "/api/logs",
    contract: "/api/contract/compare",
    deployment: "/api/deployment",
    preview: "/api/changes/preview",
    apply: "/api/changes/apply",
    check: "/api/checks/run",
    restart: "/api/restart",
  },
} as const;

type AdapterOperation = ProjectOperation;

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
  return [...projects.values()].map((project) => ({
    id: project.id,
    name: project.name,
    endpoint: project.endpoint,
    capabilityLevel: capabilityLevelFor(project),
    allowedOperations: allowedProjectOperations(project),
    capabilities: project.capabilities ?? [],
  }));
}

export async function inspectProject(projectId: string) {
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  await requireProjectOperation(project, "inspect");
  const result: any = await remoteRequest(project, "inspect");
  await recordBridgeAudit("mcp_project_inspect", projectId, "success");
  return { project: { id: project.id, name: project.name }, ...result };
}

export async function readProjectFile(projectId: string, path: string) {
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  await requireProjectOperation(project, "read");
  const result = await remoteRequest(project, "read", { method: "POST", body: JSON.stringify({ path: validatePath(path) }) });
  await recordBridgeAudit("mcp_project_file_read", projectId, "success", { path });
  return result;
}

export async function searchProject(projectId: string, query: string) {
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  await requireProjectOperation(project, "search");
  const result = await remoteRequest(project, "search", { method: "POST", body: JSON.stringify({ query: String(query).slice(0, 240) }) });
  await recordBridgeAudit("mcp_project_search", projectId, "success", { query: String(query).slice(0, 240) });
  return result;
}

export async function inspectProjectDependencies(projectId: string) {
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  await requireProjectOperation(project, "dependencies");
  const result = await remoteRequest(project, "dependencies");
  await recordBridgeAudit("mcp_project_dependencies", projectId, "success");
  return result;
}

export async function inspectProjectLogs(projectId: string, limit = 100) {
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  await requireProjectOperation(project, "logs");
  const result = await remoteRequest(project, "logs", { method: "POST", body: JSON.stringify({ limit: Math.max(1, Math.min(500, Number(limit) || 100)) }) });
  await recordBridgeAudit("mcp_project_logs", projectId, "success", { limit });
  return result;
}

export async function compareProjectContract(projectId: string, expected: Record<string, unknown> = {}) {
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  await requireProjectOperation(project, "contract");
  const result = await remoteRequest(project, "contract", { method: "POST", body: JSON.stringify({ expected }) });
  await recordBridgeAudit("mcp_project_contract_compare", projectId, "success");
  return result;
}

export async function inspectProjectDeployment(projectId: string) {
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  await requireProjectOperation(project, "deployment");
  const result = await remoteRequest(project, "deployment");
  await recordBridgeAudit("mcp_project_deployment_inspect", projectId, "success");
  return result;
}

export async function restartProject(projectId: string) {
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  await requireProjectOperation(project, "restart");
  const result = await remoteRequest(project, "restart", { method: "POST", body: JSON.stringify({ reason: "Owner-approved project operation." }) });
  await recordBridgeAudit("mcp_project_restart", projectId, "success");
  return result;
}

export async function previewProjectChanges(projectId: string, changes: Change[]) {
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  await requireProjectOperation(project, "preview");
  if (!Array.isArray(changes) || changes.length === 0 || changes.length > 50) throw new Error("Provide between 1 and 50 changes.");
  const cleanChanges = changes.map((change) => ({ path: validatePath(String(change.path)), content: String(change.content) }));
  if (cleanChanges.some((change) => Buffer.byteLength(change.content) > MAX_FILE_BYTES)) throw new Error("A changed file exceeds the size limit.");
  const result: any = await remoteRequest(project, "preview", { method: "POST", body: JSON.stringify({ changes: cleanChanges }) });
  const confirmationToken = createHash("sha256").update(`${projectId}:${JSON.stringify(cleanChanges)}:${Date.now()}`).digest("hex");
  pendingChanges.set(confirmationToken, { projectId, changes: cleanChanges, expiresAt: Date.now() + CHANGE_TTL_MS });
  await recordBridgeAudit("mcp_project_change_preview", projectId, "success", { paths: cleanChanges.map((change) => change.path) });
  return { ...result, confirmationToken, expiresAt: new Date(Date.now() + CHANGE_TTL_MS).toISOString(), requiresConfirmation: true };
}

export async function applyProjectChanges(projectId: string, changes: Change[], confirmationToken: string, authorization?: { ownerConfirmed: boolean; humanConfirmed: boolean; evidenceRefs?: string[]; reason?: string }) {
  const pending = pendingChanges.get(confirmationToken);
  if (!pending || pending.expiresAt < Date.now() || pending.projectId !== projectId || JSON.stringify(pending.changes) !== JSON.stringify(changes)) throw new Error("A fresh matching change preview and explicit confirmation are required.");
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  await requireProjectOperation(project, "apply");
  const token = configuredToken(project);
  if (!authorization?.ownerConfirmed || !authorization.humanConfirmed) throw new Error("Owner and human confirmation are required before project changes can be applied.");
  const evidenceRefs = authorization.evidenceRefs ?? [`project-preview:${confirmationToken}`];
  const governed = await executeConsequentialAction({
    actionType: "project_apply",
    targetSystem: `mcp-project:${project.id}`,
    reason: authorization.reason ?? `Apply an owner-approved project repair to ${project.name}.`,
    evidenceRefs,
    ownerConfirmed: authorization.ownerConfirmed,
    humanConfirmed: authorization.humanConfirmed,
    actor: "owner",
    payload: { projectId, confirmationToken, changesHash: createHash("sha256").update(JSON.stringify(pending.changes)).digest("hex") },
    execute: () => remoteRequest(project, "apply", { method: "POST", headers: { "x-project-bridge-confirmation": changeConfirmationSignature(String(token), pending.changes) }, body: JSON.stringify({ changes: pending.changes, confirmationToken }) }),
  });
  if (!governed.executed) throw new Error(`Project changes were not released: ${governed.reason}`);
  pendingChanges.delete(confirmationToken);
  await recordBridgeAudit("mcp_project_change_apply", projectId, "success", { paths: pending.changes.map((change) => change.path), governanceRequestId: governed.governanceRequestId, decisionId: governed.decisionId });
  return { ...(governed.result as Record<string, unknown>), governanceRequestId: governed.governanceRequestId, decisionId: governed.decisionId };
}

export async function runProjectCheck(projectId: string, command: string) {
  const project = projectFor(projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  await requireProjectOperation(project, "check");
  const result: any = await remoteRequest(project, "check", { method: "POST", body: JSON.stringify({ command: allowedCommand(command) }) });
  await recordBridgeAudit("mcp_project_check_run", projectId, result.exitCode === 0 ? "success" : "failed", { command });
  return result;
}

export async function executeWorkPlan(steps: Array<{ id: string; projectId: string; operation: ProjectOperation; path?: string; query?: string; changes?: Change[]; command?: string; confirmationToken?: string; expected?: Record<string, unknown>; limit?: number; dependsOn?: string[]; authorization?: { ownerConfirmed: boolean; humanConfirmed: boolean; evidenceRefs?: string[]; reason?: string } }>) {
  const results: Array<{ id: string; status: string; result?: unknown; error?: string }> = [];
  for (const step of steps) {
    const blocked = (step.dependsOn ?? []).some((dependency) => results.find((result) => result.id === dependency)?.status !== "success");
    if (blocked) { results.push({ id: step.id, status: "skipped", error: "A dependency did not succeed." }); continue; }
    try {
      const result = step.operation === "inspect" ? await inspectProject(step.projectId)
        : step.operation === "search" ? await searchProject(step.projectId, String(step.query ?? ""))
          : step.operation === "read" ? await readProjectFile(step.projectId, String(step.path ?? ""))
            : step.operation === "dependencies" ? await inspectProjectDependencies(step.projectId)
              : step.operation === "logs" ? await inspectProjectLogs(step.projectId, Number(step.limit ?? 100))
                : step.operation === "contract" ? await compareProjectContract(step.projectId, step.expected ?? {})
                  : step.operation === "deployment" ? await inspectProjectDeployment(step.projectId)
          : step.operation === "preview" ? await previewProjectChanges(step.projectId, step.changes ?? [])
              : step.operation === "apply" ? await applyProjectChanges(step.projectId, step.changes ?? [], String(step.confirmationToken ?? ""), step.authorization)
                : step.operation === "restart" ? await restartProject(step.projectId)
                  : await runProjectCheck(step.projectId, String(step.command ?? ""));
      results.push({ id: step.id, status: "success", result });
    } catch (error) {
      results.push({ id: step.id, status: "failed", error: error instanceof Error ? error.message : "Project operation failed." });
    }
  }
  return { results, completed: results.filter((result) => result.status === "success").length, failed: results.filter((result) => result.status === "failed").length };
}

export async function localProjectInspect() {
  return { name: process.env.MCP_PROJECT_NAME ?? "Replit project", capabilities: PROJECT_CAPABILITY_LEVELS, operations: PROJECT_OPERATIONS, root: "workspace-relative" };
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

export async function localSearchProject(query: string) {
  const cleanQuery = String(query ?? "").trim();
  if (!cleanQuery || cleanQuery.length > 240 || cleanQuery.includes("\0")) throw new Error("A bounded search query is required.");
  const root = resolve(process.env.MCP_PROJECT_ROOT ?? process.cwd());
  try {
    const result = await execFileAsync("rg", ["--hidden", "--glob", "!.git", "--glob", "!.env*", "--line-number", "--max-count", "20", cleanQuery, root], { cwd: root, timeout: 20_000, maxBuffer: MAX_OUTPUT_BYTES });
    return { query: cleanQuery, matches: result.stdout.slice(0, MAX_OUTPUT_BYTES) };
  } catch (error: any) {
    return { query: cleanQuery, matches: String(error?.stdout ?? "").slice(0, MAX_OUTPUT_BYTES), exitCode: Number(error?.code ?? 1) };
  }
}

export async function localInspectDependencies() {
  const files = ["package.json", "pnpm-lock.yaml", "package-lock.json", "yarn.lock"];
  const present = [];
  for (const file of files) {
    try { const content = await readFile(resolve(process.env.MCP_PROJECT_ROOT ?? process.cwd(), file), "utf8"); present.push({ file, bytes: Buffer.byteLength(content), preview: content.slice(0, 2000) }); } catch { /* optional dependency manifests */ }
  }
  return { manifests: present };
}

export async function localInspectLogs(limit = 100) {
  const root = resolve(process.env.MCP_PROJECT_ROOT ?? process.cwd());
  const candidates = [".logs", "logs", "tmp/logs"];
  const files: string[] = [];
  for (const candidate of candidates) {
    try { files.push(...(await readdir(resolve(root, candidate))).slice(0, limit).map((file) => `${candidate}/${file}`)); } catch { /* optional log directories */ }
  }
  return { files: files.slice(0, Math.max(1, Math.min(500, limit))), note: "Only project-local log paths are listed; host and provider logs require their authorized adapter." };
}

export async function localCompareProjectContract(expected: Record<string, unknown> = {}) {
  const observed = await localProjectInspect();
  const mismatches = Object.entries(expected).filter(([key, value]) => JSON.stringify((observed as any)[key]) !== JSON.stringify(value)).map(([key, value]) => ({ key, expected: value, observed: (observed as any)[key] }));
  return { expected, observed, matches: mismatches.length === 0, mismatches };
}

export async function localInspectDeployment() {
  return { status: "unavailable", reason: "Deployment inspection requires a project host adapter; no local deployment authority is assumed." };
}

export async function localRestartProject() {
  return { accepted: false, reason: "Restart requires an authorized project host adapter and is never inferred from local process access." };
}