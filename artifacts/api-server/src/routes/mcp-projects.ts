import { Router } from "express";
import {
  allowedProjectOperations,
  capabilityLevelFor,
  compareProjectContract,
  configuredProjects,
  inspectProject,
  inspectProjectDependencies,
  inspectProjectDeployment,
  inspectProjectLogs,
  persistedProjectsJson,
  previewProjectChanges,
  readProjectFile,
  registeredProjects,
  registerProject,
  restartProject,
  runProjectCheck,
  searchProject,
  applyProjectChanges,
  PROJECT_CAPABILITY_LEVELS,
  type ProjectConfig,
} from "../lib/mcp-project-bridge";
import { approveRepair, collectRepairEvidence, createRepairRun, executeRepairStep, getRepairRun, listRepairRuns, requestRepairApproval, resumeRepairRuns, verifyRepairRun } from "../lib/project-repair";

const router = Router();
function allProjects() {
  const projects = new Map(configuredProjects().map((project) => [project.id, project]));
  for (const project of registeredProjects()) projects.set(project.id, project);
  return [...projects.values()];
}

function publicProject(project: ProjectConfig) {
  return {
    id: project.id,
    name: project.name,
    endpoint: project.endpoint,
    adapter: project.adapter ?? "auto",
    capabilityLevel: capabilityLevelFor(project),
    allowedOperations: allowedProjectOperations(project),
    capabilities: project.capabilities ?? [],
    credentialConfigured: Boolean(project.tokenEnv && process.env[project.tokenEnv]),
  };
}

function statusFor(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /requires|confirmation|ALLOW|authorized|approval/i.test(message) ? 403 : 400;
}

async function repairForProject(projectId: string, runId: string, res: any) {
  const run = await getRepairRun(runId);
  if (!run || run.projectId !== projectId) {
    res.status(404).json({ error: "Repair run not found." });
    return null;
  }
  return run;
}

router.get("/", (_req, res) => {
  res.json({ projects: allProjects().map(publicProject) });
});

router.get("/setup", (req, res) => {
  const origin = `${req.protocol}://${req.get("host")}`;
  res.json({
    mcpEndpoint: `${origin}/mcp`,
    configuration: { mcpServers: { lee: { url: `${origin}/mcp` } } },
    authentication: "The MCP client must send Authorization: Bearer <bridge credential>. Keep that credential in the MCP client's secret store; it is never shown here.",
    adapters: {
      auto: "Try the companion project-agent contract first, then the standard Replit contract when the route is absent.",
      "project-agent": "Legacy companion routes under /api/project-bridge/*.",
      "replit-standard": "Common Replit HTTP routes under /api/{inspect,files/read,changes/preview,changes/apply,checks/run}.",
    },
  });
});

router.post("/", (req, res) => {
  const body = req.body ?? {};
  const id = String(body.id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const endpoint = String(body.endpoint ?? "").trim().replace(/\/+$/, "");
  const adapter = body.adapter === undefined || body.adapter === "" ? "auto" : String(body.adapter);
  const tokenEnv = String(body.tokenEnv ?? "").trim();
  const capabilityLevel = body.capabilityLevel === undefined || body.capabilityLevel === "" ? "OBSERVE" : String(body.capabilityLevel).toUpperCase();
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || !name || name.length > 120 || !/^https:\/\//i.test(endpoint) || !["auto", "project-agent", "replit-standard"].includes(adapter) || !PROJECT_CAPABILITY_LEVELS.includes(capabilityLevel as typeof PROJECT_CAPABILITY_LEVELS[number])) {
    res.status(400).json({ error: "Provide a project ID, name, and HTTPS project endpoint." });
    return;
  }
  if (tokenEnv && !/^[A-Z][A-Z0-9_]{0,127}$/.test(tokenEnv)) {
    res.status(400).json({ error: "Credential reference must be an environment variable name, not a credential." });
    return;
  }
  const project: ProjectConfig = {
    id,
    name,
    endpoint,
    tokenEnv: tokenEnv || undefined,
    adapter: adapter as ProjectConfig["adapter"],
    capabilityLevel: capabilityLevel as ProjectConfig["capabilityLevel"],
    capabilities: Array.isArray(body.capabilities) ? body.capabilities.map(String).slice(0, 10) : undefined,
  };
  registerProject(project);
  res.status(201).json({
    project: publicProject(project),
    persistence: {
      environmentVariable: "MCP_PROJECTS_JSON",
      value: persistedProjectsJson(),
      note: "Store this sanitized value as MCP_PROJECTS_JSON to restore registered projects after a restart. Credential references are names only; set their corresponding secrets separately.",
    },
  });
});

router.post("/:id/search", async (req, res) => {
  try { res.json(await searchProject(String(req.params.id), String(req.body?.query ?? ""))); } catch (error) { res.status(statusFor(error)).json({ error: error instanceof Error ? error.message : "Project search failed." }); }
});
router.get("/:id/dependencies", async (req, res) => {
  try { res.json(await inspectProjectDependencies(String(req.params.id))); } catch (error) { res.status(statusFor(error)).json({ error: error instanceof Error ? error.message : "Dependency inspection failed." }); }
});
router.post("/:id/logs", async (req, res) => {
  try { res.json(await inspectProjectLogs(String(req.params.id), Number(req.body?.limit ?? 100))); } catch (error) { res.status(statusFor(error)).json({ error: error instanceof Error ? error.message : "Project log inspection failed." }); }
});
router.post("/:id/contract", async (req, res) => {
  try { res.json(await compareProjectContract(String(req.params.id), req.body?.expected ?? {})); } catch (error) { res.status(statusFor(error)).json({ error: error instanceof Error ? error.message : "Contract comparison failed." }); }
});
router.get("/:id/deployment", async (req, res) => {
  try { res.json(await inspectProjectDeployment(String(req.params.id))); } catch (error) { res.status(statusFor(error)).json({ error: error instanceof Error ? error.message : "Deployment inspection failed." }); }
});
router.post("/:id/restart", async (req, res) => {
  try { res.json(await restartProject(String(req.params.id))); } catch (error) { res.status(statusFor(error)).json({ error: error instanceof Error ? error.message : "Project restart failed." }); }
});
router.post("/:id/changes/preview", async (req, res) => {
  try { res.json(await previewProjectChanges(String(req.params.id), req.body?.changes)); } catch (error) { res.status(statusFor(error)).json({ error: error instanceof Error ? error.message : "Change preview failed." }); }
});
router.post("/:id/changes/apply", async (req, res) => {
  try {
    res.json(await applyProjectChanges(String(req.params.id), req.body?.changes, String(req.body?.confirmationToken ?? ""), req.body?.authorization));
  } catch (error) { res.status(statusFor(error)).json({ error: error instanceof Error ? error.message : "Change application failed." }); }
});

router.get("/:id/repairs", async (req, res) => res.json(await listRepairRuns(String(req.params.id))));
router.post("/:id/repairs", async (req, res) => {
  try { res.status(201).json(await createRepairRun(String(req.params.id), req.body)); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Repair run could not be created." }); }
});
router.get("/:id/repairs/:runId", async (req, res) => {
  const run = await getRepairRun(req.params.runId);
  if (!run || run.projectId !== req.params.id) { res.status(404).json({ error: "Repair run not found." }); return; }
  res.json(run);
});
router.post("/:id/repairs/:runId/evidence", async (req, res) => {
  if (!await repairForProject(req.params.id, req.params.runId, res)) return;
  try { res.json(await collectRepairEvidence(req.params.runId)); } catch (error) { res.status(statusFor(error)).json({ error: error instanceof Error ? error.message : "Repair evidence collection failed." }); }
});
router.post("/:id/repairs/:runId/request-approval", async (req, res) => {
  if (!await repairForProject(req.params.id, req.params.runId, res)) return;
  try { res.status(202).json(await requestRepairApproval(req.params.runId)); } catch (error) { res.status(statusFor(error)).json({ error: error instanceof Error ? error.message : "Repair approval request failed." }); }
});
router.post("/:id/repairs/:runId/approve", async (req, res) => {
  if (!await repairForProject(req.params.id, req.params.runId, res)) return;
  try { res.json(await approveRepair(req.params.runId, req.body?.ownerConfirmed === true)); } catch (error) { res.status(statusFor(error)).json({ error: error instanceof Error ? error.message : "Repair approval failed." }); }
});
router.post("/:id/repairs/:runId/steps/:stepId/execute", async (req, res) => {
  if (!await repairForProject(req.params.id, req.params.runId, res)) return;
  try { res.json(await executeRepairStep(req.params.runId, req.params.stepId)); } catch (error) { res.status(statusFor(error)).json({ error: error instanceof Error ? error.message : "Repair step failed." }); }
});
router.post("/:id/repairs/:runId/verify", async (req, res) => {
  if (!await repairForProject(req.params.id, req.params.runId, res)) return;
  try { res.json(await verifyRepairRun(req.params.runId)); } catch (error) { res.status(statusFor(error)).json({ error: error instanceof Error ? error.message : "Repair verification failed." }); }
});
router.post("/repairs/resume", async (_req, res) => res.json({ recovered: await resumeRepairRuns() }));

router.post("/:id/test", async (req, res) => {
  const id = String(req.params.id);
  const project = allProjects().find((item) => item.id === id);
  if (!project) { res.status(404).json({ projectId: id, status: "not_configured", error: "This project is not registered." }); return; }
  try {
    const result = await inspectProject(id);
    res.json({ projectId: id, status: "connected", project: publicProject(project), agent: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The project agent could not be reached.";
    res.status(502).json({
      projectId: id,
      status: "failed",
      project: publicProject(project),
      error: message,
      requiredSetup: "Run the project-agent routes in this project and set PROJECT_BRIDGE_API_KEY, MCP_PROJECT_NAME, and optionally MCP_PROJECT_ROOT. The bridge credential must be configured as the named server-side secret.",
    });
  }
});

router.post("/:id/validate", async (req, res) => {
  const id = String(req.params.id);
  const project = allProjects().find((item) => item.id === id);
  if (!project) { res.status(404).json({ projectId: id, status: "not_configured", error: "This project is not registered." }); return; }

  const checks: Array<{ operation: string; status: "passed" | "failed"; detail?: unknown; error?: string }> = [];
  const capture = async (operation: string, action: () => Promise<unknown>) => {
    try {
      checks.push({ operation, status: "passed", detail: await action() });
    } catch (error) {
      checks.push({ operation, status: "failed", error: error instanceof Error ? error.message : `${operation} failed.` });
    }
  };

  await capture("inspect", () => inspectProject(id));
  await capture("read", () => readProjectFile(id, String(req.body?.readPath ?? "package.json")));
  await capture("preview", () => previewProjectChanges(id, [{
    path: ".lee/setup-validation.txt",
    content: "LEE setup validation preview. This file must not be applied automatically.\n",
  }]));
  await capture("check", () => runProjectCheck(id, String(req.body?.command ?? "pnpm run typecheck")));

  const passed = checks.filter((check) => check.status === "passed").length;
  const status = passed === checks.length ? "validated" : passed > 0 ? "partial" : "failed";
  res.status(status === "validated" ? 200 : 207).json({
    projectId: id,
    status,
    project: publicProject(project),
    checks: checks.map(({ operation, status: checkStatus, detail, error }) => ({
      operation,
      status: checkStatus,
      ...(detail === undefined ? {} : { detail }),
      ...(error ? { error } : {}),
    })),
    note: "Validation performs no apply operation. The preview token is intentionally not usable as approval for a change.",
  });
});

export default router;