export const META = {
  version: "12.0",
  versionDate: "July 13, 2026",
  taskCount: 69,
  layerCount: 11,
  principleCount: 43,
  constitutionalProvisions: 13,
  capabilityLevels: 37,
  knowledgeLedgers: 6,
  epistemicSignals: 4,
  lastUpdated: "2026-07-13",

  versionHistory: [
    { version: "9.0", tasks: 48, principles: 22, provisions: 11, note: "Foundational architecture. 22 principles, event sourcing, Constitution, knowledge graph." },
    { version: "10.0", tasks: 55, principles: 29, provisions: 12, note: "Added Executive Loop, Operational Confidence, Project Momentum, Opportunity Engine, Operational Capacity Awareness, Strategic Anchors, Portfolio Intelligence Engine." },
    { version: "11.0", tasks: 65, principles: 39, provisions: 13, note: "Added Identity Engine (Layer 0), Executive Objectives, Organizational Memory, Decision Memory, Simulation Engine, Time Machine, Uncertainty Tracking, Resource Allocation Engine, Execution Readiness, Portfolio Dependency Graph. Request pipeline made explicit." },
    { version: "12.0", tasks: 69, principles: 43, provisions: 13, note: "Added Operational Review Engine, Experience & Institutional Knowledge, Operational Self-Improvement, System Economics. Knowledge progression complete. Self-improvement boundary principle added." },
  ],

  systems: [
    {
      name: "LEE",
      role: "Operating Intelligence",
      endpoint: null,
      description: "Owns context, projects, people, timelines, facts, interpretations, objectives, portfolio, provider routing, and orchestration.",
      color: "primary",
    },
    {
      name: "CIL",
      role: "Reasoning Service",
      endpoint: "cognitive-infrastructure-layer.replit.app/api/query/lee",
      description: "Reusable reasoning. Three tiers: T1 (trigram reuse), T2 (vector similarity), T3 (frontier escalation). Degrades gracefully.",
      color: "blue",
    },
    {
      name: "CerbaSeal",
      role: "Governance Service",
      endpoint: "cerbaseal.replit.app",
      description: "Consequential-action authorization. Returns ALLOW / HOLD / REJECT with reason codes and evidence bundle. Fails closed.",
      color: "violet",
    },
  ],

  requestPipeline: [
    { step: 1, name: "Identity", description: "Who am I? How do I operate? When should I speak?" },
    { step: 2, name: "Constitution", description: "What am I allowed to do?" },
    { step: 3, name: "Intent", description: "What is being asked?" },
    { step: 4, name: "Context", description: "What is relevant? (Context Economy)" },
    { step: 5, name: "CIL", description: "Do we have reusable reasoning?" },
    { step: 6, name: "CerbaSeal", description: "Is this action authorized? (consequential only)" },
  ],
};
