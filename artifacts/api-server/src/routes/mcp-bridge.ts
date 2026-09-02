import { Router } from "express";
import { applyProjectChanges, bridgeTokenMatches, executeWorkPlan, inspectProject, listProjects, previewProjectChanges, readProjectFile, runProjectCheck } from "../lib/mcp-project-bridge";

const router = Router();
const protocolVersion = "2025-03-26";

function auth(req: any, res: any, next: any) {
  const configured = process.env.MCP_BRIDGE_API_KEY;
  const supplied = req.header("authorization")?.replace(/^Bearer\s+/i, "") ?? req.header("x-api-key");
  if (!bridgeTokenMatches(supplied, configured)) { res.status(401).json({ error: "MCP bridge authorization is required." }); return; }
  next();
}

const toolDefinitions = [
  { name: "projects_list", description: "List explicitly registered Replit projects and their capabilities.", inputSchema: { type: "object", properties: {} } },
  { name: "project_inspect", description: "Inspect one registered project.", inputSchema: { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"] } },
  { name: "project_file_read", description: "Read one workspace-relative file from a registered project.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, path: { type: "string" } }, required: ["projectId", "path"] } },
  { name: "project_change_preview", description: "Preview scoped file changes and receive a short-lived confirmation token.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, changes: { type: "array" } }, required: ["projectId", "changes"] } },
  { name: "project_change_apply", description: "Apply exactly the changes from a fresh preview after explicit confirmation.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, changes: { type: "array" }, confirmationToken: { type: "string" } }, required: ["projectId", "changes", "confirmationToken"] } },
  { name: "project_check_run", description: "Run one registered safe check in a project.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, command: { type: "string" } }, required: ["projectId", "command"] } },
  { name: "multi_project_work", description: "Run dependent inspect, read, preview, explicitly confirmed apply, and check steps across registered projects.", inputSchema: { type: "object", properties: { steps: { type: "array" } }, required: ["steps"] } },
];

async function callTool(name: string, args: any) {
  switch (name) {
    case "projects_list": return listProjects();
    case "project_inspect": return inspectProject(String(args.projectId));
    case "project_file_read": return readProjectFile(String(args.projectId), String(args.path));
    case "project_change_preview": return previewProjectChanges(String(args.projectId), args.changes);
    case "project_change_apply": return applyProjectChanges(String(args.projectId), args.changes, String(args.confirmationToken));
    case "project_check_run": return runProjectCheck(String(args.projectId), String(args.command));
    case "multi_project_work": return executeWorkPlan(args.steps);
    default: throw new Error(`Unknown MCP tool: ${name}`);
  }
}

router.use(auth);
router.get("/", (_req, res) => res.json({ name: "LEE Multi-Project MCP Bridge", protocolVersion, tools: toolDefinitions.map((tool) => tool.name) }));
router.post("/", async (req, res) => {
  const request = req.body;
  if (!request || typeof request.method !== "string") { res.status(400).json({ jsonrpc: "2.0", error: { code: -32600, message: "Invalid JSON-RPC request." }, id: request?.id ?? null }); return; }
  const id = request.id ?? null;
  try {
    if (request.method === "initialize") {
      res.json({ jsonrpc: "2.0", id, result: { protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "lee-multi-project-bridge", version: "1.0.0" } } }); return;
    }
    if (request.method === "notifications/initialized") { res.status(202).end(); return; }
    if (request.method === "tools/list") { res.json({ jsonrpc: "2.0", id, result: { tools: toolDefinitions } }); return; }
    if (request.method === "tools/call") {
      const result = await callTool(String(request.params?.name), request.params?.arguments ?? {});
      res.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result } }); return;
    }
    res.status(400).json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found." } });
  } catch (error) {
    res.json({ jsonrpc: "2.0", id, error: { code: -32000, message: error instanceof Error ? error.message : "MCP tool failed." } });
  }
});

export default router;