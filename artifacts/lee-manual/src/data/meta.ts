export const META = {
  version: "12.1",
  versionDate: "September 1, 2026",
  taskCount: 69,
  layerCount: 11,
  principleCount: 46,
  constitutionalProvisions: 13,
  capabilityLevels: 37,
  knowledgeLedgers: 6,
  epistemicSignals: 4,
  lastUpdated: "2026-09-01",

  versionHistory: [
    { version: "9.0", tasks: 48, principles: 22, provisions: 11, note: "Foundational architecture. 22 principles, event sourcing, Constitution, knowledge graph." },
    { version: "10.0", tasks: 55, principles: 29, provisions: 12, note: "Added Executive Loop, Operational Confidence, Project Momentum, Opportunity Engine, Operational Capacity Awareness, Strategic Anchors, Portfolio Intelligence Engine." },
    { version: "11.0", tasks: 65, principles: 39, provisions: 13, note: "Added Identity Engine (Layer 0), Executive Objectives, Organizational Memory, Decision Memory, Simulation Engine, Time Machine, Uncertainty Tracking, Resource Allocation Engine, Execution Readiness, Portfolio Dependency Graph. Request pipeline made explicit." },
    { version: "12.0", tasks: 69, principles: 43, provisions: 13, note: "Added Operational Review Engine, Experience & Institutional Knowledge, Operational Self-Improvement, System Economics. Knowledge progression complete. Self-improvement boundary principle added." },
    { version: "12.1", tasks: 69, principles: 46, provisions: 13, note: "Clarified mandatory CIL routing, independent external authorities, runtime versus management/control planes, MCP project operations, K6 hosting, and layered readiness." },
  ],

  systems: [
    {
      name: "LEE",
      role: "Operating Intelligence",
      endpoint: null,
      description: "Owns context, projects, people, timelines, facts, interpretations, objectives, portfolio, orchestration, and execution of independent service decisions.",
      color: "primary",
    },
    {
      name: "CIL",
      role: "Reasoning Service",
      endpoint: "cognitive-infrastructure-layer.replit.app/api/query/lee",
       description: "Independent cognitive authority. CIL decides T1/T2 reuse, T3 escalation, and the approved model route; LEE only sends authenticated requests and executes the returned route.",
      color: "blue",
    },
    {
      name: "Replit AI Bridge",
      role: "Execution Gateway",
      endpoint: null,
      description: "Executes the model and provider route selected by CIL. It is not a cognitive-routing authority.",
      color: "cyan",
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
    { step: 4, name: "Query Engine", description: "What knowledge and evidence are relevant?" },
    { step: 5, name: "Context Economy", description: "What evidence belongs in the bounded context packet?" },
    { step: 6, name: "CIL", description: "Which reusable result or model route is authorized?" },
    { step: 7, name: "Model Router", description: "Execute only CIL's selected route (when T3)" },
    { step: 8, name: "CerbaSeal", description: "Is this action authorized? (consequential only)" },
  ],
};
