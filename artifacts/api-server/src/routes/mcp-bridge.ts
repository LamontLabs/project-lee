import { Router } from "express";
import {
  applyProjectChanges,
  bridgeTokenMatches,
  compareProjectContract,
  executeWorkPlan,
  inspectProject,
  inspectProjectDependencies,
  inspectProjectDeployment,
  inspectProjectLogs,
  listProjects,
  previewProjectChanges,
  readProjectFile,
  restartProject,
  runProjectCheck,
  searchProject,
} from "../lib/mcp-project-bridge";
import { collectRepairEvidence, createRepairRun, executeRepairStep, getRepairRun, requestRepairApproval, verifyRepairRun } from "../lib/project-repair";

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
  { name: "project_search", description: "Search one registered project within its scoped workspace.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, query: { type: "string" } }, required: ["projectId", "query"] } },
  { name: "project_file_read", description: "Read one workspace-relative file from a registered project.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, path: { type: "string" } }, required: ["projectId", "path"] } },
  { name: "project_dependencies", description: "Inspect dependency manifests from one registered project.", inputSchema: { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"] } },
  { name: "project_logs", description: "Inspect project-local or adapter-provided logs.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, limit: { type: "number" } }, required: ["projectId"] } },
  { name: "project_contract_compare", description: "Compare an observed project contract with an expected contract.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, expected: { type: "object" } }, required: ["projectId"] } },
  { name: "project_deployment_inspect", description: "Inspect deployment state without deployment authority.", inputSchema: { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"] } },
  { name: "project_change_preview", description: "Preview scoped file changes and receive a short-lived confirmation token.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, changes: { type: "array" } }, required: ["projectId", "changes"] } },
  { name: "project_change_apply", description: "Apply exactly the changes from a fresh preview after owner confirmation and CerbaSeal ALLOW.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, changes: { type: "array" }, confirmationToken: { type: "string" }, authorization: { type: "object" } }, required: ["projectId", "changes", "confirmationToken", "authorization"] } },
  { name: "project_check_run", description: "Run one registered safe check in a project.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, command: { type: "string" } }, required: ["projectId", "command"] } },
  { name: "project_restart", description: "Restart one registered project through its authorized host adapter.", inputSchema: { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"] } },
  { name: "project_repair_create", description: "Create a resumable evidence-first project repair plan; it does not apply changes.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, reason: { type: "string" }, steps: { type: "array" } }, required: ["projectId", "reason", "steps"] } },
  { name: "project_repair_evidence", description: "Capture fresh project observation and momentum evidence for a repair plan.", inputSchema: { type: "object", properties: { repairRunId: { type: "string" } }, required: ["repairRunId"] } },
  { name: "project_repair_request_approval", description: "Create the governance request bound to the current repair plan and evidence hash.", inputSchema: { type: "object", properties: { repairRunId: { type: "string" } }, required: ["repairRunId"] } },
  { name: "project_repair_execute", description: "Execute one already approved repair step.", inputSchema: { type: "object", properties: { repairRunId: { type: "string" }, stepId: { type: "string" } }, required: ["repairRunId", "stepId"] } },
  { name: "project_repair_verify", description: "Verify a repair run with a fresh project inspection.", inputSchema: { type: "object", properties: { repairRunId: { type: "string" } }, required: ["repairRunId"] } },
  { name: "multi_project_work", description: "Run dependent authorized inspection, read, search, preview, apply, restart, and check steps across registered projects.", inputSchema: { type: "object", properties: { steps: { type: "array" } }, required: ["steps"] } },
];

async function callTool(name: string, args: any) {
  switch (name) {
    case "projects_list": return listProjects();
    case "project_inspect": return inspectProject(String(args.projectId));
    case "project_search": return searchProject(String(args.projectId), String(args.query));
    case "project_file_read": return readProjectFile(String(args.projectId), String(args.path));
    case "project_dependencies": return inspectProjectDependencies(String(args.projectId));
    case "project_logs": return inspectProjectLogs(String(args.projectId), Number(args.limit ?? 100));
    case "project_contract_compare": return compareProjectContract(String(args.projectId), args.expected ?? {});
    case "project_deployment_inspect": return inspectProjectDeployment(String(args.projectId));
    case "project_change_preview": return previewProjectChanges(String(args.projectId), args.changes);
    case "project_change_apply": return applyProjectChanges(String(args.projectId), args.changes, String(args.confirmationToken), args.authorization);
    case "project_check_run": return runProjectCheck(String(args.projectId), String(args.command));
    case "project_restart": return restartProject(String(args.projectId));
    case "project_repair_create": return createRepairRun(String(args.projectId), args);
    case "project_repair_evidence": return collectRepairEvidence(String(args.repairRunId));
    case "project_repair_request_approval": return requestRepairApproval(String(args.repairRunId));
    case "project_repair_execute": return executeRepairStep(String(args.repairRunId), String(args.stepId));
    case "project_repair_verify": return verifyRepairRun(String(args.repairRunId));
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