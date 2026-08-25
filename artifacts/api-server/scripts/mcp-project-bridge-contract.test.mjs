import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/routes/mcp-bridge.ts", import.meta.url), "utf8");
const agentSource = await readFile(new URL("../src/routes/project-bridge.ts", import.meta.url), "utf8");
const bridgeSource = await readFile(new URL("../src/lib/mcp-project-bridge.ts", import.meta.url), "utf8");
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