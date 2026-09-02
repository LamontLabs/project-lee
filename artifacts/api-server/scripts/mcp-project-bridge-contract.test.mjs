import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/routes/mcp-bridge.ts", import.meta.url), "utf8");
const agentSource = await readFile(new URL("../src/routes/project-bridge.ts", import.meta.url), "utf8");
const bridgeSource = await readFile(new URL("../src/lib/mcp-project-bridge.ts", import.meta.url), "utf8");
const projectsSource = await readFile(new URL("../src/routes/mcp-projects.ts", import.meta.url), "utf8");
const docs = await readFile(new URL("../MCP_PROJECT_BRIDGE.md", import.meta.url), "utf8");

test("MCP bridge exposes a guarded JSON-RPC tool surface", () => {
  for (const name of ["initialize", "tools/list", "tools/call", "projects_list", "project_change_preview", "project_change_apply", "multi_project_work"]) assert.match(source, new RegExp(name.replace("/", "\\/")));
  assert.match(source, /MCP_BRIDGE_API_KEY/);
  assert.match(source, /bridgeTokenMatches/);
});

test("project agent enforces scoped operations and signed writes", () => {
  for (const route of ["/inspect", "/files/read", "/changes/preview", "/changes/apply", "/checks/run"]) assert.match(agentSource, new RegExp(route.replace("/", "\\/")));
  assert.match(agentSource, /x-project-bridge-confirmation/);
  assert.match(docs, /Replit custom MCP/);
  assert.match(docs, /MCP_PROJECTS_JSON/);
});

test("existing Repls can use the standard adapter without Lee internals", () => {
  assert.match(bridgeSource, /replit-standard/);
  assert.match(bridgeSource, /adapterRoutes/);
  assert.match(bridgeSource, /status !== 404/);
  for (const route of ["/api/inspect", "/api/files/read", "/api/changes/preview", "/api/changes/apply", "/api/checks/run"]) {
    assert.match(docs, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(docs, /does not share project databases|without copying Lee’s internal database/);
});

test("project registration projects safe metadata without exposing credentials", () => {
  assert.match(projectsSource, /router\.post\("\/", \(req, res\) =>/);
  assert.match(projectsSource, /registerProject\(project\)/);
  assert.match(projectsSource, /res\.status\(201\)\.json\(\{[\s\S]*project: publicProject\(project\)/);
  for (const field of ["id", "name", "endpoint", "adapter", "capabilities", "credentialConfigured"]) {
    assert.match(projectsSource, new RegExp(`${field}:`));
  }
  assert.match(projectsSource, /credentialConfigured: Boolean\(project\.tokenEnv && process\.env\[project\.tokenEnv\]\)/);
  assert.doesNotMatch(projectsSource, /tokenEnv:\s*project\.tokenEnv/);
  assert.match(projectsSource, /Credential reference must be an environment variable name, not a credential/);
});

test("restart-safe persistence keeps projects isolated and credential-free", () => {
  assert.match(bridgeSource, /export function persistedProjectsJson\(\)/);
  assert.match(bridgeSource, /const projects = new Map\(configuredProjects\(\)\.map\(\(project\) => \[project\.id, project\]\)\)/);
  assert.match(bridgeSource, /for \(const project of runtimeProjects\.values\(\)\) projects\.set\(project\.id, project\)/);
  assert.match(bridgeSource, /projectPersistenceMetadata/);
  assert.match(bridgeSource, /project\.tokenEnv \? \{ tokenEnv: project\.tokenEnv \} : \{\}/);
  assert.match(projectsSource, /environmentVariable: "MCP_PROJECTS_JSON"/);
  assert.match(projectsSource, /value: persistedProjectsJson\(\)/);
  assert.match(docs, /exact sanitized `MCP_PROJECTS_JSON` value/);
  assert.match(docs, /replaces only that project ID/);
  assert.match(docs, /never credential values/);
  assert.doesNotMatch(projectsSource, /value: process\.env/);
});

test("missing credentials return isolated, credential-free failure guidance", () => {
  assert.match(bridgeSource, /if \(!token\) throw new Error\(`No server-side credential is configured for project \$\{project\.id\}\.`\)/);
  assert.match(projectsSource, /router\.post\("\/:id\/test", async \(req, res\) =>/);
  assert.match(projectsSource, /const id = String\(req\.params\.id\)/);
  assert.match(projectsSource, /projectId: id/);
  assert.match(projectsSource, /status: "failed"/);
  assert.match(projectsSource, /requiredSetup:/);
  assert.doesNotMatch(projectsSource, /error:\s*.*tokenEnv/);
  assert.doesNotMatch(projectsSource, /error:\s*.*process\.env/);
});

test("unreachable agents fail one project without changing another project's health", () => {
  assert.match(bridgeSource, /const project = projectFor\(projectId\)/);
  assert.match(bridgeSource, /if \(!project\) throw new Error\(`Unknown project: \$\{projectId\}`\)/);
  assert.match(bridgeSource, /remoteRequest\(project, "inspect"\)/);
  assert.match(projectsSource, /const project = allProjects\(\)\.find\(\(item\) => item\.id === id\)/);
  assert.match(projectsSource, /if \(!project\) \{ res\.status\(404\)\.json\(\{ projectId: id, status: "not_configured"/);
  assert.match(projectsSource, /catch \(error\)/);
  assert.match(projectsSource, /res\.status\(502\)\.json\(\{/);
  assert.match(projectsSource, /project: publicProject\(project\)/);
  assert.match(projectsSource, /error: message/);
  assert.match(projectsSource, /const projects = new Map\(configuredProjects\(\)\.map\(\(project\) => \[project\.id, project\]\)\)/);
  assert.match(projectsSource, /for \(const project of registeredProjects\(\)\) projects\.set\(project\.id, project\)/);
});