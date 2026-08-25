import { Router } from "express";
import { inspectProject, configuredProjects, persistedProjectsJson, registeredProjects, registerProject, type ProjectConfig } from "../lib/mcp-project-bridge";

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
    capabilities: project.capabilities ?? ["inspect", "read", "preview", "apply", "check"],
    credentialConfigured: Boolean(project.tokenEnv && process.env[project.tokenEnv]),
  };
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
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || !name || name.length > 120 || !/^https:\/\//i.test(endpoint) || !["auto", "project-agent", "replit-standard"].includes(adapter)) {
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

export default router;