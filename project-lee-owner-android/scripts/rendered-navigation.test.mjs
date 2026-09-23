import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import * as helpers from "./rendered-test-helpers.mjs";

const router = helpers.installNativeMocks();

const ownerContext = {
  pairing: null,
  captures: [],
  uncertainty: null,
  brief: null,
  waiting: null,
  alerts: null,
  approvals: {
    value: [{
      id: "approval-12345678",
      requestedAction: "Review provider change",
      lifecycle: "PENDING",
      risk: "high",
      source: { subsystem: "CIL" },
      reason: "A governed owner decision is required.",
      target: "Provider connection",
      affectedSystem: "Cognitive runtime",
      cerbaSeal: { state: "UNAVAILABLE", verdict: null },
      evidence: [{ id: "evidence-1", label: "Source-backed health report" }],
      ownerConfirmationRequired: true,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      proposedChange: "Update the provider connection.",
      postApprovalEffect: "The server would recheck the request before any writer.",
    }],
  },
  connections: null,
  runtime: null,
  contract: null,
  health: null,
  readiness: null,
  confidence: null,
  projectOperations: null,
  selfAwareness: null,
  hosted: {
    freshness: "unverified",
    connectivity: "offline",
    detail: "No hosted Core has been verified yet.",
    lastVerifiedAt: null,
    lastSyncAt: null,
  },
  observationSession: null,
  isLoading: false,
  pair: async () => false,
  unpair() {},
  addCapture: async () => undefined,
  capturePerception: async () => undefined,
  captureSystemShare: async () => false,
  syncCapture: async () => undefined,
  retryCapture: async () => undefined,
  api: null,
  refresh: async () => undefined,
  waitingAction: async () => undefined,
  alertAction: async () => undefined,
  decideApproval: async () => ownerContext.approvals.value[0],
  askWhy: async () => "The server explanation is informational only.",
  setObservationSession() {},
  endObservationSession: async () => undefined,
};

helpers.installOwnerVisualMocks(null, ownerContext);

const renderer = await import("react-test-renderer");
const { default: PairingScreen } = await import("../app/index.tsx");
const { default: TodayTab } = await import("../app/(tabs)/index.tsx");
const { default: AskTab } = await import("../app/(tabs)/ask.tsx");
const { default: CaptureTab } = await import("../app/(tabs)/capture.tsx");
const { default: ApprovalsTab } = await import("../app/(tabs)/approvals.tsx");
const { default: MoreTab } = await import("../app/(tabs)/more.tsx");
const { default: SystemsTab } = await import("../app/(tabs)/systems.tsx");
const { default: TabLayout } = await import("../app/(tabs)/_layout.tsx");

test("Owner Welcome and Connect render as a reachable flow", async () => {
  const tree = await helpers.renderScreen(PairingScreen, renderer);
  assert.ok(helpers.findText(tree, "Keep Lee close."));
  await renderer.act(async () => helpers.press(tree, "Continue"));
  assert.ok(helpers.findText(tree, "Connect to LEE."));
  assert.ok(helpers.findText(tree, "Pair device"));

  await renderer.act(async () => helpers.press(tree, "Pair device"));
  assert.ok(helpers.findText(tree, "Enter a valid HTTPS API URL and pairing token."));
});

test("Owner tab navigation exposes Today, Ask, Capture, Approvals, More, and Systems", async () => {
  const tree = await helpers.renderScreen(TabLayout, renderer);
  const labels = ["Ask", "Capture", "Today", "Approvals", "More"];
  for (const label of labels) {
    assert.ok(helpers.findText(tree, label), `tab ${label} should be rendered`);
    await renderer.act(async () => helpers.findPressable(tree, label).props.onPress());
  }

  for (const Screen of [TodayTab, AskTab, CaptureTab, ApprovalsTab, MoreTab, SystemsTab]) {
    const screen = await helpers.renderScreen(Screen, renderer);
    assert.ok(screen.root, `${Screen.name} should render`);
  }
});

test("Owner Approvals renders review and evidence sheets while keeping unavailable actions disabled", async () => {
  const tree = await helpers.renderScreen(ApprovalsTab, renderer);
  assert.ok(helpers.findText(tree, "Offline view · showing the last safely cached queue. Decisions are disabled."));
  helpers.assertAccessibleDisabled(tree, "Hold");
  helpers.assertAccessibleDisabled(tree, "Reject");
  helpers.assertAccessibleDisabled(tree, "Approve");

  await renderer.act(async () => helpers.press(tree, "Review action"));
  assert.ok(helpers.findText(tree, "APPROVED is not EXECUTED or VERIFIED."));
  await renderer.act(async () => helpers.press(tree, "Close"));
  await renderer.act(async () => helpers.press(tree, "Evidence / why"));
  assert.ok(helpers.findText(tree, "SOURCE-BACKED RECORDS"));
  assert.ok(helpers.findText(tree, "Source-backed health report"));
});

test("Owner More opens Systems and the unavailable frontier sheet", async () => {
  const tree = await helpers.renderScreen(MoreTab, renderer);
  await renderer.act(async () => helpers.press(tree, "Systems"));
  assert.deepEqual(router.calls.at(-1), "/(tabs)/systems");

  await renderer.act(async () => helpers.press(tree, "Frontier approval"));
  assert.ok(helpers.findText(tree, "Unavailable · endpoint missing"));
  assert.ok(helpers.findText(tree, "No family content is included."));
});

test("Owner Systems reaches the existing Watch and Observe route", async () => {
  const tree = await helpers.renderScreen(SystemsTab, renderer);
  await renderer.act(async () => helpers.press(tree, "Watch / Observe"));
  assert.equal(router.calls.at(-1), "/(tabs)/sessions");
});