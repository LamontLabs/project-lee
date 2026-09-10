import assert from "node:assert/strict";
import test from "node:test";
import { classifyProjectChanges, isCILProject, type ProjectConfig } from "../src/lib/mcp-project-bridge";
import { cilRecoveryPolicy } from "../src/lib/cil-recovery";

const cilProject = (capabilityLevel: ProjectConfig["capabilityLevel"]): ProjectConfig => ({
  id: "cil-project",
  name: "CIL Project",
  endpoint: "https://cil.example",
  capabilityLevel,
});

test("CIL recovery permits routine self-repair only at MANAGE or above", () => {
  assert.equal(isCILProject(cilProject("MANAGE")), true);
  assert.equal(cilRecoveryPolicy(cilProject("USE")).selfRepairEligible, false);
  assert.equal(cilRecoveryPolicy(cilProject("MANAGE")).selfRepairEligible, true);
  assert.equal(cilRecoveryPolicy(cilProject("GOVERNED_MANAGE")).selfRepairEligible, true);
});

test("CIL recovery keeps protected changes on the governed path", () => {
  const routine = classifyProjectChanges([{ path: "src/repair.ts", content: "export const repaired = true;\n" }]);
  const protectedChange = classifyProjectChanges([{ path: "src/model-routing.ts", content: "export const route = 'cil';\n" }]);
  assert.equal(routine.risk, "routine");
  assert.equal(protectedChange.risk, "protected");
  assert.deepEqual(protectedChange.protectedPaths, ["src/model-routing.ts"]);
  assert.equal(cilRecoveryPolicy(cilProject("MANAGE")).protectedChangesRequire, "GOVERNED_MANAGE");
});