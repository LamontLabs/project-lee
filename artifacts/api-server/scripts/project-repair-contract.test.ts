import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedProjectOperations,
  localRunCheck,
  projectOperationAuthorization,
  type ProjectConfig,
} from "../src/lib/mcp-project-bridge";

const project = (capabilityLevel: ProjectConfig["capabilityLevel"]): ProjectConfig => ({
  id: "test-project",
  name: "Test Project",
  endpoint: "https://project.example",
  capabilityLevel,
});

test("read-only authority can inspect but cannot modify or restart", () => {
  assert.equal(projectOperationAuthorization(project("OBSERVE"), "inspect").allowed, true);
  assert.equal(projectOperationAuthorization(project("OBSERVE"), "read").allowed, true);
  assert.equal(projectOperationAuthorization(project("OBSERVE"), "apply").allowed, false);
  assert.equal(projectOperationAuthorization(project("OBSERVE"), "restart").allowed, false);
});

test("authorized manage levels expose only their permitted operations", () => {
  assert.equal(projectOperationAuthorization(project("MANAGE"), "restart").allowed, true);
  assert.equal(projectOperationAuthorization(project("MANAGE"), "apply").allowed, false);
  assert.equal(projectOperationAuthorization(project("GOVERNED_MANAGE"), "apply").allowed, true);
  assert.ok(allowedProjectOperations(project("GOVERNED_MANAGE")).includes("check"));
});

test("failed registered checks return bounded failure evidence", async () => {
  const result = await localRunCheck("pnpm test");
  assert.notEqual(result.exitCode, 0);
  assert.equal(result.command, "pnpm test");
  assert.ok(typeof result.stderr === "string");
});