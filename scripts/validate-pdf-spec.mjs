import { spawnSync } from "node:child_process";

const checks = [
  ["api typecheck", ["--filter", "@workspace/api-server", "run", "typecheck"]],
  ["api build", ["--filter", "@workspace/api-server", "run", "build"]],
  ["console typecheck", ["--filter", "@workspace/lee-console", "run", "typecheck"]],
  ["console build", ["--filter", "@workspace/lee-console", "run", "build"], { PORT: "5173", BASE_PATH: "/lee-console" }],
  ["manual typecheck", ["--filter", "@workspace/lee-manual", "run", "typecheck"]],
  ["manual build", ["--filter", "@workspace/lee-manual", "run", "build"], { PORT: "5174", BASE_PATH: "/lee-manual" }],
  ["android typecheck", ["--filter", "@workspace/lee-android", "run", "typecheck"]],
  ["desktop typecheck", ["--filter", "@workspace/lee-desktop", "run", "typecheck"]],
  ["desktop build", ["--filter", "@workspace/lee-desktop", "run", "build"]],
  ["api behavioral", ["--filter", "@workspace/api-server", "run", "test:behavioral"]],
  ["api request pipeline", ["--filter", "@workspace/api-server", "run", "test:pipeline"]],
  ["api internal security", ["--filter", "@workspace/api-server", "run", "test:internal-security"]],
  ["api event replay", ["--filter", "@workspace/api-server", "run", "test:event-replay"]],
  ["api backup restore", ["--filter", "@workspace/api-server", "run", "test:backup-restore"]],
  ["api legacy backup restore", ["--filter", "@workspace/api-server", "run", "test:backup-restore-legacy"]],
  ["api backup failure injection", ["--filter", "@workspace/api-server", "run", "test:backup-restore-failure-injection"]],
  ["api reality graph contract", ["--filter", "@workspace/api-server", "run", "test:reality-graph-contract"]],
  ["api reality graph integration", ["--filter", "@workspace/api-server", "run", "test:reality-graph-integration"]],
  ["api time machine hostile", ["--filter", "@workspace/api-server", "run", "test:time-machine-hostile"]],
  ["api event delivery", ["--filter", "@workspace/api-server", "run", "test:event-delivery"]],
  ["api consequential execution", ["--filter", "@workspace/api-server", "run", "test:consequential-execution"]],
  ["api CIL protocol", ["--filter", "@workspace/api-server", "run", "test:cil-protocol"]],
  ["api first boundary", ["--filter", "@workspace/api-server", "run", "test:api-first-boundary"]],
  ["api provider transport", ["--filter", "@workspace/api-server", "run", "test:provider-transport"]],
  ["api MCP project bridge", ["--filter", "@workspace/api-server", "run", "test:mcp-project-bridge"]],
  ["api project repair", ["--filter", "@workspace/api-server", "run", "test:project-repair"]],
  ["api Gmail provider", ["--filter", "@workspace/api-server", "run", "test:gmail-email-provider"]],
  ["api Ask LEE email", ["--filter", "@workspace/api-server", "run", "test:ask-lee-email"]],
  ["api Ask LEE evidence", ["--filter", "@workspace/api-server", "run", "test:ask-lee-evidence"]],
  ["api approval envelope", ["--filter", "@workspace/api-server", "run", "test:approval-envelope"]],
  ["api Ask LEE filters", ["--filter", "@workspace/api-server", "run", "test:ask-lee-email-filters"]],
  ["api Ask LEE privacy", ["--filter", "@workspace/api-server", "run", "test:ask-lee-email-privacy"]],
  ["api desktop discovery", ["--filter", "@workspace/api-server", "run", "test:desktop-discovery"]],
  ["api connection health", ["--filter", "@workspace/api-server", "run", "test:connection-health"]],
  ["api owner auth", ["--filter", "@workspace/api-server", "run", "test:owner-auth"]],
  ["api CIL cost benchmark", ["--filter", "@workspace/api-server", "run", "test:cil-cost-benchmark"]],
  ["api provider boundary", ["--filter", "@workspace/api-server", "run", "test:provider-boundary"]],
  ["api project bootstrap", ["--filter", "@workspace/api-server", "run", "test:project-bootstrap"]],
  ["api change intelligence", ["--filter", "@workspace/api-server", "run", "test:change-intelligence"]],
  ["api commitment intelligence", ["--filter", "@workspace/api-server", "run", "test:commitment-intelligence"]],
  ["api institutional knowledge", ["--filter", "@workspace/api-server", "run", "test:institutional-knowledge"]],
  ["api self-improvement", ["--filter", "@workspace/api-server", "run", "test:self-improvement-boundary"]],
  ["api operational intelligence", ["--filter", "@workspace/api-server", "run", "test:operational-intelligence-evidence"]],
  ["api executive loop", ["--filter", "@workspace/api-server", "run", "test:executive-loop-proof"]],
  ["api system economics contract", ["--filter", "@workspace/api-server", "run", "test:system-economics-contract"]],
  ["api system economics boundary", ["--filter", "@workspace/api-server", "run", "test:system-economics-boundary"]],
  ["api self-test diagnostics", ["--filter", "@workspace/api-server", "run", "test:self-test-diagnostics"]],
  ["api query architecture", ["--filter", "@workspace/api-server", "run", "test:query-architecture"]],
  ["api ledger boundary", ["--filter", "@workspace/api-server", "run", "test:ledger-boundary"]],
  ["api resource allocation", ["--filter", "@workspace/api-server", "run", "test:resource-allocation-lifecycle"]],
  ["api manifest", ["--filter", "@workspace/api-server", "run", "test:manifest"]],
  ["android runtime wiring", ["--filter", "@workspace/lee-android", "run", "test:runtime-wiring"]],
  ["android offline uncertainty", ["--filter", "@workspace/lee-android", "run", "test:offline-uncertainty"]],
  ["android device wiring", ["--filter", "@workspace/lee-android", "run", "test:device-wiring"]],
  ["desktop runtime contract", ["--filter", "@workspace/lee-desktop", "run", "test:runtime-contract"]],
  ["desktop migration assets", ["--filter", "@workspace/lee-desktop", "run", "test:migration-assets"]],
  ["desktop migration upgrade", ["--filter", "@workspace/lee-desktop", "run", "test:migration-upgrade"]],
  ["desktop release metadata", ["--filter", "@workspace/lee-desktop", "run", "test:release-metadata"]],
  ["desktop app icon", ["--filter", "@workspace/lee-desktop", "run", "test:app-icon"]],
  ["desktop PostgreSQL runtime", ["--filter", "@workspace/lee-desktop", "run", "test:postgres-runtime"]],
];

let failures = 0;
for (const [label, args, extraEnv = {}] of checks) {
  console.log(`\n===== ${label} =====`);
  const result = spawnSync("pnpm", args, {
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    failures += 1;
    console.error(`FAILED: ${label} (exit ${result.status ?? "signal"})`);
  } else {
    console.log(`PASSED: ${label}`);
  }
}

console.log(`\nPDF specification validation finished: ${checks.length - failures}/${checks.length} checks passed.`);
if (failures > 0) {
  console.error(`${failures} checks failed. See the output above and PDF_CONFORMANCE_VALIDATION_REPORT.md for classification.`);
  process.exitCode = 1;
}