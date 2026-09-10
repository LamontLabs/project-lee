import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  allowedProjectOperations,
  classifyProjectChanges,
  localApplyChanges,
  localInspectDependencies,
  localPreviewChanges,
  localReadFile,
  localSearchProject,
  projectOperationAuthorization,
  projectHealthStatus,
  type ProjectConfig,
} from "../src/lib/mcp-project-bridge";

const observe: ProjectConfig = {
  id: "observe-project",
  name: "Observe project",
  endpoint: "https://observe.example",
  capabilityLevel: "OBSERVE",
};

const manage: ProjectConfig = {
  id: "manage-project",
  name: "Manage project",
  endpoint: "https://manage.example",
  tokenEnv: "MANAGE_PROJECT_KEY",
  capabilityLevel: "MANAGE",
};

test("capability levels isolate diagnostics from mutation operations", () => {
  assert.deepEqual(allowedProjectOperations(observe), ["inspect", "search", "read", "dependencies", "logs", "contract", "deployment"]);
  assert.ok(allowedProjectOperations(manage).includes("restart"));
  assert.ok(allowedProjectOperations(manage).includes("apply"));
  assert.equal(projectOperationAuthorization(observe, "apply").allowed, false);
  assert.equal(projectOperationAuthorization(manage, "apply").allowed, true);
});

test("protected project paths are classified separately from routine repairs", () => {
  assert.deepEqual(classifyProjectChanges([{ path: "src/repair.ts", content: "export const repaired = true;\n" }]), {
    risk: "routine",
    protectedPaths: [],
    reason: "The change is outside the protected project surfaces.",
  });
  const protectedChange = classifyProjectChanges([{ path: "src/governance/policy.ts", content: "export const policy = {};\n" }]);
  assert.equal(protectedChange.risk, "protected");
  assert.deepEqual(protectedChange.protectedPaths, ["src/governance/policy.ts"]);
});

test("unknown projects are explicitly unavailable rather than healthy", () => {
  assert.deepEqual(projectHealthStatus("missing-project"), {
    status: "unavailable",
    checkedAt: null,
    freshness: "unverified",
    detail: "The project is not registered.",
  });
});

test("local inspection excludes sensitive content and local writes require a fresh preview", { concurrency: false }, async () => {
  const root = await mkdtemp(join(tmpdir(), "lee-project-operator-"));
  const previousRoot = process.env.MCP_PROJECT_ROOT;
  try {
    process.env.MCP_PROJECT_ROOT = root;
    await mkdir(join(root, "secrets"), { recursive: true });
    await writeFile(join(root, "secrets", "api.key"), "do-not-return");
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "fixture", scripts: { test: "node test.js" }, dependencies: { express: "^1.0.0" } }));
    await writeFile(join(root, "pnpm-lock.yaml"), "secret-lock-content");

    await assert.rejects(() => localReadFile("secrets/api.key"), /Sensitive credential/);
    const search = await localSearchProject("do-not-return");
    assert.equal(search.matches, "");
    const dependencies = await localInspectDependencies();
    assert.equal(JSON.stringify(dependencies).includes("secret-lock-content"), false);

    const changes = [{ path: "src/repair.ts", content: "export const repaired = true;\n" }];
    await assert.rejects(() => localApplyChanges(changes, "stale-token"), /fresh matching change preview/);
    const preview = await localPreviewChanges(changes);
    await localApplyChanges(changes, preview.confirmationToken);
    assert.equal(await readFile(join(root, "src", "repair.ts"), "utf8"), changes[0].content);
  } finally {
    if (previousRoot === undefined) delete process.env.MCP_PROJECT_ROOT;
    else process.env.MCP_PROJECT_ROOT = previousRoot;
    await rm(root, { recursive: true, force: true });
  }
});