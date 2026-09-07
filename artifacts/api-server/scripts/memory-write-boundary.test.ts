import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCanonicalMemoryWrite,
  assertDerivedMemoryWrite,
} from "../src/lib/memory-write-boundary";

const base = {
  sourceRef: "source-reference",
  sourceRefs: ["source-reference"],
  currentOwner: "owner",
  actor: "Test Engine",
  mode: "COLD_BOOT" as const,
};

test("canonical memory requires provenance and preserves epistemic separation", () => {
  assert.throws(
    () => assertCanonicalMemoryWrite({
      ...base,
      recordType: "fact",
      operation: "create",
      origin: "engine",
      epistemicType: "observed",
      generatedByEngine: "Test Engine",
      generatedBy: { test: true },
    }),
    /model_output_cannot_be_fact/,
  );

  assert.throws(
    () => assertCanonicalMemoryWrite({
      ...base,
      recordType: "interpretation",
      operation: "create",
      origin: "engine",
      generatedByEngine: "Test Engine",
      generatedBy: { test: true },
      sourceRef: undefined,
      sourceRefs: [],
    }),
    /source_ref_required/,
  );

  assert.throws(
    () => assertCanonicalMemoryWrite({
      ...base,
      recordType: "owner_truth",
      operation: "create",
      origin: "engine",
      generatedByEngine: "Test Engine",
      generatedBy: { test: true },
    }),
    /owner_truth_requires_explicit_owner_confirmation/,
  );

  assert.deepEqual(
    assertCanonicalMemoryWrite({
      ...base,
      recordType: "fact",
      operation: "create",
      origin: "source",
      epistemicType: "extracted",
      sourceDerived: true,
      actor: "Understanding Pipeline",
    }).provenanceRefs,
    ["source-reference"],
  );
});

test("canonical memory rejects unsafe lifecycle and protected-mode writes", () => {
  assert.throws(
    () => assertCanonicalMemoryWrite({
      ...base,
      recordType: "fact",
      operation: "create",
      origin: "source",
      epistemicType: "observed",
      operation: "delete" as never,
    }),
    /invalid_operation/,
  );

  for (const mode of ["SAFE_MODE", "RECOVERY_MODE", "MIGRATION_MODE", "READ_ONLY"] as const) {
    assert.throws(
      () => assertCanonicalMemoryWrite({
        ...base,
        mode,
        recordType: "interpretation",
        operation: "create",
        origin: "engine",
        generatedByEngine: "Test Engine",
        generatedBy: { test: true },
      }),
      new RegExp(`MEMORY_WRITE_BLOCKED:${mode}`),
    );
  }
});

test("derived memory must declare rebuildability and is protected in recovery", () => {
  assert.throws(
    () => assertDerivedMemoryWrite({ projection: "semantic_index", rebuildable: false, mode: "COLD_BOOT" }),
    /rebuildable_required/,
  );
  assert.throws(
    () => assertDerivedMemoryWrite({ projection: "working_memory", rebuildable: true, mode: "READ_ONLY" }),
    /DERIVED_MEMORY_WRITE_BLOCKED:READ_ONLY/,
  );
  assert.deepEqual(
    assertDerivedMemoryWrite({ projection: "working_memory", rebuildable: true, sourceRefs: ["record"], mode: "COLD_BOOT" }),
    { projection: "working_memory", rebuildable: true, sourceRefs: ["record"], mode: "COLD_BOOT" },
  );
});